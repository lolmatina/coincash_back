import { Provider } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StorageFactory } from './storage/storage.factory';
import { DatabaseFactory } from './database/database.factory';
import { IStorageService } from './interfaces/storage.interface';
import { IDatabaseService } from './interfaces/database.interface';

// Provider tokens
export const SUPABASE_CLIENT = 'SUPABASE_CLIENT';
export const STORAGE_SERVICE = 'STORAGE_SERVICE';
export const DATABASE_SERVICE = 'DATABASE_SERVICE';

export const databaseProviders: Provider[] = [
  {
    provide: SUPABASE_CLIENT,
    useFactory: () => {
      const storageType = process.env.STORAGE_TYPE || 'supabase';
      const databaseType = process.env.DATABASE_TYPE || 'supabase';
      
      // If we're not using Supabase for either storage or database, we don't need the client
      if (storageType !== 'supabase' && databaseType !== 'supabase') {
        console.log('⏩ Skipping Supabase client initialization (not needed)');
        return null;
      }
      
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        console.warn('❌ Supabase URL or Service Role Key not provided but Supabase is required!');
        throw new Error('Supabase URL and Service Role Key must be provided when using Supabase services');
      }

      const client = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      console.log('✅ Supabase client initialized');
      return client;
    },
  },
  {
    provide: STORAGE_SERVICE,
    useFactory: (supabaseClient: SupabaseClient | null) => {
      const storageType = process.env.STORAGE_TYPE || 'supabase';
      console.log(`✅ Using ${storageType} storage service`);
      
      if (storageType === 'supabase' && !supabaseClient) {
        throw new Error('Supabase client is required for Supabase storage but was not initialized');
      }
      
      return StorageFactory.createStorageService(storageType, supabaseClient);
    },
    inject: [SUPABASE_CLIENT],
  },
  {
    provide: DATABASE_SERVICE,
    useFactory: (supabaseClient: SupabaseClient | null) => {
      const databaseType = process.env.DATABASE_TYPE || 'supabase';
      console.log(`✅ Using ${databaseType} database service`);
      
      if (databaseType === 'supabase' && !supabaseClient) {
        throw new Error('Supabase client is required for Supabase database but was not initialized');
      }
      
      return DatabaseFactory.createDatabaseService(databaseType, supabaseClient);
    },
    inject: [SUPABASE_CLIENT],
  },
];