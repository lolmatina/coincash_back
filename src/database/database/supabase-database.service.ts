import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { IDatabaseService } from '../interfaces/database.interface';
import { User, Manager } from '../types/database.types';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseDatabaseService implements IDatabaseService {
  constructor(private readonly supabaseClient: SupabaseClient) {}

  // User operations
  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const { data, error } = await this.supabaseClient
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.supabaseClient
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw new Error(`Failed to find user: ${error.message}`);
    }

    return data || null;
  }

  async findUserById(id: number): Promise<User | null> {
    const { data, error } = await this.supabaseClient
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to find user: ${error.message}`);
    }

    return data || null;
  }
  
  async findUserByResetToken(token: string): Promise<User | null> {
    const { data, error } = await this.supabaseClient
      .from('users')
      .select('*')
      .eq('password_reset_token', token)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to find user by reset token: ${error.message}`);
    }

    return data || null;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    console.log(`[SupabaseDatabaseService] Updating user ${id} with:`, JSON.stringify(updates, null, 2));
    
    // Debug log for password
    if (updates.password) {
      console.log(`[SupabaseDatabaseService] Setting password hash: ${updates.password.substring(0, 10)}...`);
    }
    
    const { data, error } = await this.supabaseClient
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[SupabaseDatabaseService] Failed to update user:`, error);
      throw new Error(`Failed to update user: ${error.message}`);
    }

    console.log(`[SupabaseDatabaseService] User updated successfully, returned data:`, data ? 'Data returned' : 'No data');
    
    // Debug log for returned password
    if (updates.password && data) {
      console.log(`[SupabaseDatabaseService] Returned password hash: ${data.password.substring(0, 10)}...`);
    }

    return data;
  }
  
  async resetUserPassword(id: number, hashedPassword: string): Promise<void> {
    console.log(`[SupabaseDatabaseService] Directly resetting password for user ${id}`);
    console.log(`[SupabaseDatabaseService] Using password hash: ${hashedPassword.substring(0, 10)}...`);
    
    // Use a direct SQL query to ensure the password is set correctly
    const { error } = await this.supabaseClient.rpc('reset_user_password', {
      user_id: id,
      new_password_hash: hashedPassword
    });
    
    if (error) {
      console.error(`[SupabaseDatabaseService] Failed to reset password:`, error);
      throw new Error(`Failed to reset password: ${error.message}`);
    }
    
    console.log(`[SupabaseDatabaseService] Password reset successful for user ${id}`);
  }

  async deleteUser(id: number): Promise<void> {
    const { error } = await this.supabaseClient
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  // Manager operations
  async createManager(managerData: Omit<Manager, 'id' | 'created_at' | 'updated_at'>): Promise<Manager> {
    const { data, error } = await this.supabaseClient
      .from('managers')
      .insert([managerData])
      .select()
      .single();

    if (error) {
      console.error('Supabase createManager error:', error);
      throw new InternalServerErrorException(error.message);
    }
    return data as Manager;
  }

  async findManagerByTelegramId(telegramChatId: string): Promise<Manager | null> {
    const { data, error } = await this.supabaseClient
      .from('managers')
      .select('*')
      .eq('telegram_chat_id', telegramChatId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase findManagerByTelegramId error:', error);
      throw new InternalServerErrorException(error.message);
    }
    return data as Manager | null;
  }

  async getAllManagers(): Promise<Manager[]> {
    const { data, error } = await this.supabaseClient
      .from('managers')
      .select('*');

    if (error) {
      console.error('Supabase getAllManagers error:', error);
      throw new InternalServerErrorException(error.message);
    }
    return data as Manager[];
  }

  async getUnprocessedUsers(): Promise<User[]> {
    const { data, error } = await this.supabaseClient
      .from('users')
      .select('*')
      .not('documents_submitted_at', 'is', null)
      .is('documents_verified_at', null)
      .order('documents_submitted_at', { ascending: true });

    if (error) {
      console.error('Supabase getUnprocessedUsers error:', error);
      throw new InternalServerErrorException(error.message);
    }
    return data as User[];
  }
}
