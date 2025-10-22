import { Module, Global } from '@nestjs/common';
import { databaseProviders, STORAGE_SERVICE, DATABASE_SERVICE } from './services.provider';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { SupabaseService } from './supabase.service';

@Global()
@Module({
  imports: [
    // Serve static files for local storage
    ...(process.env.STORAGE_TYPE === 'local' ? [
      ServeStaticModule.forRoot({
        rootPath: join(process.cwd(), process.env.LOCAL_STORAGE_PATH || 'uploads', 'documents'),
        serveRoot: '/uploads/documents',
        serveStaticOptions: {
          index: false,
          fallthrough: true
        }
      }),
    ] : []),
  ],
  providers: [...databaseProviders, SupabaseService],
  exports: [...databaseProviders, SupabaseService],
})
export class DatabaseModule {}