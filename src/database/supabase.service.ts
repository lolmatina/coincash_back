import { Injectable, Inject, Optional } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { IStorageService } from './interfaces/storage.interface';
import { IDatabaseService } from './interfaces/database.interface';
import { User, Manager } from './types/database.types';
import { DATABASE_SERVICE, STORAGE_SERVICE, SUPABASE_CLIENT } from './services.provider';

// Re-export User and Manager types for backward compatibility
export { User, Manager } from './types/database.types';

@Injectable()
export class SupabaseService {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly databaseService: IDatabaseService,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
    @Optional() @Inject(SUPABASE_CLIENT) private readonly supabaseClient: SupabaseClient | null
  ) {}

  getClient(): SupabaseClient | null {
    return this.supabaseClient;
  }

  // User operations
  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    return this.databaseService.createUser(userData);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.databaseService.findUserByEmail(email);
  }

  async findUserById(id: number): Promise<User | null> {
    return this.databaseService.findUserById(id);
  }
  
  async findUserByResetToken(token: string): Promise<User | null> {
    return this.databaseService.findUserByResetToken(token);
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    return this.databaseService.updateUser(id, updates);
  }

  async resetUserPassword(id: number, hashedPassword: string): Promise<void> {
    return this.databaseService.resetUserPassword(id, hashedPassword);
  }

  async deleteUser(id: number): Promise<void> {
    return this.databaseService.deleteUser(id);
  }

  // Manager operations
  async createManager(managerData: Omit<Manager, 'id' | 'created_at' | 'updated_at'>): Promise<Manager> {
    return this.databaseService.createManager(managerData);
  }

  async findManagerByTelegramId(telegramChatId: string): Promise<Manager | null> {
    return this.databaseService.findManagerByTelegramId(telegramChatId);
  }

  async getAllManagers(): Promise<Manager[]> {
    return this.databaseService.getAllManagers();
  }

  async getUnprocessedUsers(): Promise<User[]> {
    return this.databaseService.getUnprocessedUsers();
  }

  // File storage operations
  async uploadFile(bucket: string, path: string, file: Buffer, contentType: string): Promise<string> {
    return this.storageService.uploadFile(bucket, path, file, contentType);
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    return this.storageService.deleteFile(bucket, path);
  }

  getPublicUrl(bucket: string, path: string): string {
    return this.storageService.getPublicUrl(bucket, path);
  }
}