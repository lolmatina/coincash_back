import { Controller, Post, Body, Res, HttpCode, HttpStatus, UploadedFiles, UseInterceptors, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';
import { SignupDto } from './dto/signup.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetDto } from './dto/password-reset.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UserService } from '../user/user.service';
import { FileUploadService } from './file-upload.service';

@Controller('api/v1/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post('signup')
  @HttpCode(HttpStatus.OK)
  async signup(@Body() signupDto: SignupDto, @Res() res: Response) {
    try {
      const user = await this.userService.create(signupDto);
      await this.authService.initiateEmailVerification(user);

      return res.json({
        message: 'User created successfully. Please verify your email.',
        user: {
          id: user.id,
          name: user.name,
          lastname: user.lastname,
          email: user.email,
          profile_type: user.profile_type,
          email_verified_at: user.email_verified_at,
          documents_verified_at: user.documents_verified_at,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          message: error.message,
        });
      }
      return res.status(500).json({
        message: 'Internal server error',
      });
    }
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async login(@Body() authDto: AuthDto, @Res() res: Response) {
    try {
      const result = await this.authService.login(authDto);
      
      // Set cookie only for fully verified users
      if (result.user.email_verified_at && result.user.documents_verified_at) {
        res.cookie('token', result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000,
        });
      }

      return res.json({
        message: 'Authentication successful',
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          message: error.message,
        });
      }
      return res.status(500).json({
        message: 'Internal server error',
      });
    }
  }

  @Post('email/send')
  @HttpCode(HttpStatus.OK)
  async sendEmailVerification(@Body('email') email: string, @Res() res: Response) {
    this.logger.log(`Attempting to resend verification email to: ${email}`);
    
    try {
      // Validate email input
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        this.logger.warn(`Invalid email format provided: ${email}`);
        return res.status(400).json({ 
          message: 'Invalid email format',
          error: 'INVALID_EMAIL_FORMAT'
        });
      }

      this.logger.log(`Processing resend verification request for: ${email}`);
      await this.authService.resendEmailVerification(email);
      
      this.logger.log(`✅ Verification email successfully sent to: ${email}`);
      return res.json({ 
        message: 'Verification email sent successfully',
        success: true
      });
      
    } catch (error) {
      this.logger.error(`❌ Failed to resend verification email to ${email}:`, {
        error: error.message,
        stack: error.stack,
        name: error.name,
        status: error.status
      });

      // Handle specific error types
      if (error.status) {
        this.logger.warn(`Client error (${error.status}) for ${email}: ${error.message}`);
        return res.status(error.status).json({ 
          message: error.message,
          error: error.name || 'CLIENT_ERROR'
        });
      }

      // Handle database errors
      if (error.code && error.code.includes('ECONNREFUSED')) {
        this.logger.error(`Database connection error for ${email}:`, error.message);
        return res.status(503).json({ 
          message: 'Service temporarily unavailable',
          error: 'DATABASE_UNAVAILABLE'
        });
      }

      // Handle email service errors
      if (error.message && error.message.includes('SMTP')) {
        this.logger.error(`SMTP error for ${email}:`, error.message);
        return res.status(502).json({ 
          message: 'Email service temporarily unavailable',
          error: 'EMAIL_SERVICE_ERROR'
        });
      }

      // Generic server error
      this.logger.error(`Unexpected server error for ${email}:`, error);
      return res.status(500).json({ 
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body('email') email: string, @Body('code') code: string, @Res() res: Response) {
    try {
      await this.authService.verifyEmailCode(email, code);
      return res.json({ message: 'Email verified successfully' });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  @Post('documents')
  @UseInterceptors(FilesInterceptor('files', 3, {
    limits: { 
      fileSize: 5 * 1024 * 1024, // 5MB limit per file
      files: 3 
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Only image files are allowed'), false);
      }
    },
  }))
  async uploadDocuments(
    @Body('email') email: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Res() res: Response,
  ) {
    try {
      if (!files || files.length !== 3) {
        throw new BadRequestException('Exactly 3 files are required');
      }

      // Upload files to Supabase Storage
      const { frontUrl, backUrl, selfieUrl } = await this.fileUploadService.uploadDocuments(email, {
        front: files[0],
        back: files[1],
        selfie: files[2],
      });

      // Submit documents with Supabase URLs
      await this.authService.submitDocuments({
        email,
        frontPath: frontUrl,
        backPath: backUrl,
        selfiePath: selfieUrl,
      });

      return res.json({ message: 'Documents submitted successfully' });
    } catch (error) {
      console.error('Document upload error:', error);
      if (error.status) {
        return res.status(error.status).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Failed to upload documents' });
    }
  }

  @Post('password/reset/request')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() passwordResetRequestDto: PasswordResetRequestDto, @Res() res: Response) {
    this.logger.log(`Password reset request received for email: ${passwordResetRequestDto.email}`);
    
    try {
      const result = await this.authService.requestPasswordReset(passwordResetRequestDto.email);
      
      this.logger.log(`Password reset email sent successfully to: ${passwordResetRequestDto.email}`);
      return res.json({
        success: true,
        message: 'Password reset email sent successfully',
        remainingAttempts: result.remainingAttempts,
        resetTime: result.resetTime,
      });
    } catch (error) {
      this.logger.error(`Error processing password reset request for ${passwordResetRequestDto.email}:`, error);
      
      if (error.status) {
        return res.status(error.status).json({
          message: error.message,
          error: error.name || 'CLIENT_ERROR',
        });
      }
      
      // Handle database errors
      if (error.code && error.code.includes('ECONNREFUSED')) {
        return res.status(503).json({ 
          message: 'Service temporarily unavailable',
          error: 'DATABASE_UNAVAILABLE'
        });
      }
      
      // Handle email service errors
      if (error.message && error.message.includes('SMTP')) {
        return res.status(502).json({ 
          message: 'Email service temporarily unavailable',
          error: 'EMAIL_SERVICE_ERROR'
        });
      }
      
      return res.status(500).json({
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR',
      });
    }
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() passwordResetDto: PasswordResetDto, @Res() res: Response) {
    this.logger.log(`Password reset attempt with token: ${passwordResetDto.token.substring(0, 8)}...`);
    
    try {
      await this.authService.resetPassword(passwordResetDto.token, passwordResetDto.newPassword);
      
      this.logger.log('Password reset successful');
      return res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      this.logger.error('Error processing password reset:', error);
      
      if (error.status) {
        return res.status(error.status).json({
          message: error.message,
          error: error.name || 'CLIENT_ERROR',
        });
      }
      
      return res.status(500).json({
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR',
      });
    }
  }

  @Post('email/check')
  @HttpCode(HttpStatus.OK)
  async checkEmail(@Body('email') email: string, @Res() res: Response) {
    try {
      const exists = await this.userService.emailExists(email);
      return res.json({
        exists,
        message: exists ? 'Email is already registered' : 'Email is available',
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}
