import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService, User } from '../database/supabase.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.supabaseService.findUserByEmail(createUserDto.email);

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.supabaseService.createUser({
      ...createUserDto,
      password: hashedPassword,
      profile_type: createUserDto.profile_type || 'personal',
      email_verified_at: null,
      email_verification_code: null,
      email_verification_expires_at: null,
      document_front_url: null,
      document_back_url: null,
      document_selfie_url: null,
      documents_submitted_at: null,
      documents_verified_at: null,
    });
  }

  async findAll(): Promise<User[]> {
    // For security, we'll implement this if needed
    throw new Error('Method not implemented');
  }

  async findOne(id: number): Promise<User> {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.supabaseService.findUserById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User> {
    return this.supabaseService.findUserByEmail(email);
  }

  async setEmailVerificationCode(userId: number, code: string, expiresAt: Date): Promise<void> {
    await this.supabaseService.updateUser(userId, {
      email_verification_code: code,
      email_verification_expires_at: expiresAt.toISOString(),
    });
  }

  async verifyEmailCode(email: string, code: string): Promise<boolean> {
    const user = await this.supabaseService.findUserByEmail(email);
    if (!user || !user.email_verification_code || !user.email_verification_expires_at) return false;
    
    const now = new Date();
    const expiresAt = new Date(user.email_verification_expires_at);
    
    if (user.email_verification_code !== code) return false;
    if (expiresAt < now) return false;
    
    await this.supabaseService.updateUser(user.id, {
      email_verified_at: new Date().toISOString(),
      email_verification_code: null,
      email_verification_expires_at: null,
    });
    
    return true;
  }

  async update(id: number, updateUserDto: UpdateUserDto | any): Promise<User> {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.supabaseService.findUserById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updates: any = { ...updateUserDto };

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    if (updates.email && updates.email !== user.email) {
      const existingUser = await this.supabaseService.findUserByEmail(updates.email);
      if (existingUser) {
        throw new BadRequestException('User with this email already exists');
      }
    }

    return this.supabaseService.updateUser(id, updates);
  }

  async remove(id: number): Promise<void> {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.supabaseService.findUserById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.supabaseService.deleteUser(id);
  }
}
