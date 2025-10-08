import { Injectable, UnauthorizedException, NotFoundException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { AuthDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';
import { EmailService } from '../email/email.service';
import { TelegramService } from '../telegram/telegram.service';
import { User } from '../database/supabase.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private telegramService: TelegramService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _, ...result } = user;
    return result;
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
    const ttlMinutes = 10;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    await this.userService.setEmailVerificationCode(user.id, code, expiresAt);
    await this.emailService.sendVerificationEmail(user.email, code, ttlMinutes);
  }

  async resendEmailVerification(email: string): Promise<void> {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');
    if (user.email_verified_at !== null) throw new BadRequestException('Email already verified');
    await this.initiateEmailVerification(user);
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
}
