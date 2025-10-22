import { Injectable } from '@nestjs/common';
import { IStorageService } from '../interfaces/storage.interface';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseStorageService implements IStorageService {
  constructor(private readonly supabaseClient: SupabaseClient) {}

  async uploadFile(bucket: string, path: string, file: Buffer, contentType: string): Promise<string> {
    const { data, error } = await this.supabaseClient.storage
      .from(bucket)
      .upload(path, file, {
        contentType,
        upsert: true
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = this.supabaseClient.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await this.supabaseClient.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.supabaseClient.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }
}
