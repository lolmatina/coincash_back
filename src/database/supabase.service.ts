import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface User {
  id: number;
  name: string;
  lastname: string;
  email: string;
  password: string;
  profile_type: 'personal' | 'company';
  email_verified_at: string | null;
  email_verification_code: string | null;
  email_verification_expires_at: string | null;
  document_front_url: string | null;
  document_back_url: string | null;
  document_selfie_url: string | null;
  documents_submitted_at: string | null;
  documents_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Manager {
  id: number;
  name: string;
  telegram_chat_id: string;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL and Service Role Key must be provided');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('✅ Supabase client initialized');
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  // User operations
  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const { data, error } = await this.supabase
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
    const { data, error } = await this.supabase
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
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to find user: ${error.message}`);
    }

    return data || null;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return data;
  }

  async deleteUser(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  // Manager operations
  async createManager(managerData: Omit<Manager, 'id' | 'created_at' | 'updated_at'>): Promise<Manager> {
    const { data, error } = await this.supabase
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
    const { data, error } = await this.supabase
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
    const { data, error } = await this.supabase
      .from('managers')
      .select('*');

    if (error) {
      console.error('Supabase getAllManagers error:', error);
      throw new InternalServerErrorException(error.message);
    }
    return data as Manager[];
  }

  async getUnprocessedUsers(): Promise<User[]> {
    const { data, error } = await this.supabase
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

  // File storage operations
  async uploadFile(bucket: string, path: string, file: Buffer, contentType: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType,
        upsert: true
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  // Get public URL for a file
  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }
}
