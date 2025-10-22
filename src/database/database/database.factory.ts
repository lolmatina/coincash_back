import { Injectable } from '@nestjs/common';
import { IDatabaseService } from '../interfaces/database.interface';
import { SupabaseDatabaseService } from './supabase-database.service';
import { DirectDatabaseService } from './direct-database.service';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class DatabaseFactory {
  static createDatabaseService(databaseType: string, supabaseClient?: SupabaseClient | null): IDatabaseService {
    switch (databaseType.toLowerCase()) {
      case 'direct':
        return new DirectDatabaseService();
      case 'supabase':
        if (!supabaseClient) {
          throw new Error('Supabase client is required for Supabase database');
        }
        return new SupabaseDatabaseService(supabaseClient);
      default:
        throw new Error(`Unsupported database type: ${databaseType}`);
    }
  }
}