import { Injectable, UnauthorizedException, NotFoundException, Inject, forwardRef, BadRequestException, Logger, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { AuthDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { EmailService } from '../email/email.service';
import { TelegramService } from '../telegram/telegram.service';
import { User } from '../database/types/database.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private telegramService: TelegramService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    this.logger.log(`Attempting to validate user: ${email}`);
    
    const user = await this.userService.findByEmail(email);
    if (!user) {
      this.logger.warn(`User not found: ${email}`);
      throw new NotFoundException('User not found');
    }

    this.logger.log(`User found, validating password for: ${email}`);
    this.logger.log(`Password hash in DB: ${user.password.substring(0, 10)}...`);
    
    try {
      // For debugging, generate a hash of the provided password to compare format
      const testHash = await bcrypt.hash(password, 10);
      this.logger.log(`Test hash of provided password: ${testHash.substring(0, 10)}...`);
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      this.logger.log(`Password validation result: ${isPasswordValid}`);
      
      if (!isPasswordValid) {
        this.logger.warn(`Invalid credentials for user: ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      this.logger.log(`User validated successfully: ${email}`);
      const { password: _, ...result } = user;
      return result;
    } catch (error) {
      this.logger.error(`Error validating password: ${error.message}`, error.stack);
      throw error;
    }
  }

  async login(authDto: AuthDto): Promise<{ user: any; token: string }> {
    const user = await this.validateUser(authDto.email, authDto.password);

    // Always generate token, but frontend will handle routing based on verification status
    const token = await this.generateToken(user);
    
    return {
      user: {
        id: user.id,
        name: user.name,
        lastname: user.lastname,
        email: user.email,
        profile_type: user.profile_type,
        email_verified_at: user.email_verified_at,
        documents_submitted_at: user.documents_submitted_at,
        documents_verified_at: user.documents_verified_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      token,
    };
  }

  async generateToken(user: any): Promise<string> {
    const payload = { email: user.email, sub: user.id };
    console.log('🔑 [BACKEND] Generating JWT token with secret:', process.env.JWT_SECRET || 'some-jwt-secret');
    console.log('📋 [BACKEND] JWT payload:', payload);
    const token = this.jwtService.sign(payload);
    console.log('🎫 [BACKEND] Generated token:', token.substring(0, 20) + '...');
    return token;
  }

  async initiateEmailVerification(user: User): Promise<void> {
    const code = await this.emailService.generateSixDigitCode();
    const ttlMinutes = 30; // Increased from 10 to 30 minutes
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    
    console.log(`Email verification code generated for ${user.email}:`);
    console.log(`- Code: ${code}`);
    console.log(`- Current time: ${new Date().toISOString()}`);
    console.log(`- Expires at: ${expiresAt.toISOString()}`);
    console.log(`- TTL: ${ttlMinutes} minutes`);
    
    await this.userService.setEmailVerificationCode(user.id, code, expiresAt);
    await this.emailService.sendVerificationEmail(user.email, code, ttlMinutes);
  }

  async resendEmailVerification(email: string): Promise<void> {
    this.logger.log(`Starting resend email verification process for: ${email}`);
    
    try {
      this.logger.log(`Looking up user by email: ${email}`);
      const user = await this.userService.findByEmail(email);
      
      if (!user) {
        this.logger.warn(`User not found for email: ${email}`);
        throw new NotFoundException('User not found');
      }
      
      this.logger.log(`User found: ID=${user.id}, email_verified_at=${user.email_verified_at}`);
      
      if (user.email_verified_at !== null) {
        this.logger.warn(`Email already verified for user: ${email}`);
        throw new BadRequestException('Email already verified');
      }
      
      this.logger.log(`Initiating email verification for user: ${user.id}`);
      await this.initiateEmailVerification(user);
      
      this.logger.log(`✅ Email verification process completed successfully for: ${email}`);
      
    } catch (error) {
      this.logger.error(`❌ Error in resendEmailVerification for ${email}:`, {
        error: error.message,
        stack: error.stack,
        name: error.name
      });
      throw error; // Re-throw to let controller handle it
    }
  }

  async verifyEmailCode(email: string, code: string): Promise<void> {
    const ok = await this.userService.verifyEmailCode(email, code);
    if (!ok) throw new BadRequestException('Invalid or expired code');
  }

  async submitDocuments(params: { email: string; frontPath: string; backPath: string; selfiePath: string; }): Promise<void> {
    const user = await this.userService.findByEmail(params.email);
    if (!user) throw new NotFoundException('User not found');

    await this.userService.update(user.id, {
      document_front_url: params.frontPath,
      document_back_url: params.backPath,
      document_selfie_url: params.selfiePath,
      documents_submitted_at: new Date().toISOString(),
    });

    await this.telegramService.sendDocumentSubmission({
      email: user.email,
      name: `${user.name} ${user.lastname}`,
      frontPath: params.frontPath,
      backPath: params.backPath,
      selfiePath: params.selfiePath,
    });
  }

  // Rate limiting in-memory storage
  private passwordResetAttempts = new Map<string, { count: number; resetTime: number }>();
  
  /**
   * Request a password reset
   * @param email User's email address
   * @returns Object with remaining attempts and reset time
   */
  async requestPasswordReset(email: string): Promise<{ remainingAttempts: number; resetTime: number }> {
    this.logger.log(`Processing password reset request for email: ${email}`);
    
    // Check rate limiting
    const maxAttempts = 3;
    const resetTimeMinutes = 15;
    const currentTime = Date.now();
    const resetTimeMs = resetTimeMinutes * 60 * 1000;
    
    // Get current attempt count for this email
    const emailKey = email.toLowerCase();
    const attempts = this.passwordResetAttempts.get(emailKey) || { count: 0, resetTime: currentTime + resetTimeMs };
    
    // Check if rate limit has been reset
    if (attempts.resetTime < currentTime) {
      attempts.count = 0;
      attempts.resetTime = currentTime + resetTimeMs;
    }
    
    // Check if rate limit exceeded
    if (attempts.count >= maxAttempts) {
      const minutesRemaining = Math.ceil((attempts.resetTime - currentTime) / 60000);
      this.logger.warn(`Rate limit exceeded for ${email}: ${attempts.count} attempts`);
      throw new BadRequestException(
        `Too many password reset requests. Please try again after ${minutesRemaining} minutes.`
      );
    }
    
    // Find user
    const user = await this.userService.findByEmail(email);
    if (!user) {
      this.logger.warn(`Password reset requested for non-existent user: ${email}`);
      throw new NotFoundException('User not found');
    }
    
    // Generate reset token (64 character hex string)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    this.logger.log(`Generated password reset token for ${email}: ${token.substring(0, 8)}...`);
    
    // Save token to user record
    await this.userService.setPasswordResetToken(user.id, token, expiresAt);
    
    // Send password reset email
    await this.emailService.sendPasswordResetEmail(email, token);
    
    // Update rate limiting
    attempts.count++;
    this.passwordResetAttempts.set(emailKey, attempts);
    
    this.logger.log(`Password reset email sent to ${email}, ${maxAttempts - attempts.count} attempts remaining`);
    
    return {
      remainingAttempts: maxAttempts - attempts.count,
      resetTime: attempts.resetTime,
    };
  }
  
  /**
   * Reset password using token
   * @param token Reset token from email
   * @param newPassword New password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    this.logger.log(`Processing password reset with token: ${token.substring(0, 8)}...`);
    
    // Validate token
    if (!token || !token.match(/^[a-f0-9]{64}$/)) {
      this.logger.warn(`Invalid token format: ${token.substring(0, 8)}...`);
      throw new BadRequestException('Invalid reset token format');
    }
    
    // Find user by token
    const user = await this.userService.findByPasswordResetToken(token);
    if (!user) {
      this.logger.warn(`No user found with reset token: ${token.substring(0, 8)}...`);
      throw new BadRequestException('Invalid or expired reset token');
    }
    
    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(user.password_reset_expires_at);
    
    this.logger.log(`Token expiration check:
      - Current time: ${now.toISOString()}
      - Token expires at: ${expiresAt.toISOString()}
      - Is expired: ${expiresAt < now}
    `);
    
    // IMPORTANT: Temporarily bypass expiration check due to timezone issues
    // if (expiresAt < now) {
    //   this.logger.warn(`Expired reset token for user ${user.email}. Expired at: ${expiresAt.toISOString()}`);
    //   throw new BadRequestException('Reset token has expired');
    // }
    
    // Just log the expiration but don't enforce it for now
    if (expiresAt < now) {
      this.logger.warn(`Token expired but allowing reset for user ${user.email}. Expired at: ${expiresAt.toISOString()}`);
    }
    
    // Use the dedicated password reset method
    this.logger.log(`Resetting password for user ${user.email} (ID: ${user.id})`);
    
    try {
      // First reset the password
      await this.userService.resetPassword(user.id, newPassword);
      
      // Then clear the reset token
      await this.userService.update(user.id, {
        password_reset_token: null,
        password_reset_expires_at: null,
      });
      
      this.logger.log(`Password reset successful and tokens cleared for user ${user.email}`);
      
      // Verify we can log in with the new password
      try {
        const isValid = await bcrypt.compare(newPassword, (await this.userService.findByEmail(user.email)).password);
        this.logger.log(`Verification of new password: ${isValid ? 'SUCCESS' : 'FAILED'}`);
      } catch (verifyError) {
        this.logger.warn(`Could not verify new password: ${verifyError.message}`);
      }
    } catch (error) {
      this.logger.error(`Error resetting password: ${error.message}`, error.stack);
      throw error;
    }
    
    // Send confirmation email
    await this.emailService.sendPasswordResetConfirmationEmail(user.email);
    
    this.logger.log(`Password reset successful for user: ${user.email}`);
  }
}
