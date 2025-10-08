import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import * as path from 'path';

// Extend the Express.Multer.File interface to ensure buffer is recognized
declare global {
  namespace Express {
    namespace Multer {
      interface File {
        buffer: Buffer;
      }
    }
  }
}

@Injectable()
export class FileUploadService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async uploadDocuments(
    email: string,
    files: { front: Express.Multer.File; back: Express.Multer.File; selfie: Express.Multer.File }
  ): Promise<{ frontUrl: string; backUrl: string; selfieUrl: string }> {
    const timestamp = Date.now();
    const sanitizedEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Generate unique file paths
    const frontPath = `documents/${sanitizedEmail}/${timestamp}_front${path.extname(files.front.originalname)}`;
    const backPath = `documents/${sanitizedEmail}/${timestamp}_back${path.extname(files.back.originalname)}`;
    const selfiePath = `documents/${sanitizedEmail}/${timestamp}_selfie${path.extname(files.selfie.originalname)}`;

    try {
      // Upload all files to Supabase Storage
      const [frontUrl, backUrl, selfieUrl] = await Promise.all([
        this.supabaseService.uploadFile('documents', frontPath, files.front.buffer, files.front.mimetype),
        this.supabaseService.uploadFile('documents', backPath, files.back.buffer, files.back.mimetype),
        this.supabaseService.uploadFile('documents', selfiePath, files.selfie.buffer, files.selfie.mimetype),
      ]);

      return {
        frontUrl,
        backUrl,
        selfieUrl,
      };
    } catch (error) {
      console.error('Error uploading documents:', error);
      throw new Error('Failed to upload documents');
    }
  }

  async deleteUserDocuments(
    email: string,
    documentUrls: { front?: string; back?: string; selfie?: string }
  ): Promise<void> {
    try {
      const deletePromises = [];
      
      if (documentUrls.front) {
        const frontPath = this.extractPathFromUrl(documentUrls.front);
        deletePromises.push(this.supabaseService.deleteFile('documents', frontPath));
      }
      
      if (documentUrls.back) {
        const backPath = this.extractPathFromUrl(documentUrls.back);
        deletePromises.push(this.supabaseService.deleteFile('documents', backPath));
      }
      
      if (documentUrls.selfie) {
        const selfiePath = this.extractPathFromUrl(documentUrls.selfie);
        deletePromises.push(this.supabaseService.deleteFile('documents', selfiePath));
      }

      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting documents:', error);
      // Don't throw error for cleanup operations
    }
  }

  private extractPathFromUrl(url: string): string {
    // Extract the file path from the Supabase public URL
    // URL format: https://[project].supabase.co/storage/v1/object/public/documents/path/to/file.jpg
    const urlParts = url.split('/storage/v1/object/public/documents/');
    return urlParts[1] || '';
  }
}
