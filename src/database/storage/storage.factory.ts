import { Injectable } from '@nestjs/common';
import { IStorageService } from '../interfaces/storage.interface';
import { SupabaseStorageService } from './supabase-storage.service';
import { LocalStorageService } from './local-storage.service';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageFactory {
  static createStorageService(storageType: string, supabaseClient?: SupabaseClient | null): IStorageService {
    switch (storageType.toLowerCase()) {
      case 'local':
        return new LocalStorageService();
      case 'supabase':
        if (!supabaseClient) {
          throw new Error('Supabase client is required for Supabase storage');
        }
        return new SupabaseStorageService(supabaseClient);
      default:
        throw new Error(`Unsupported storage type: ${storageType}`);
    }
  }
}