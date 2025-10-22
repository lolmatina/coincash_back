import { Injectable, Inject } from '@nestjs/common';
import { IStorageService } from '../database/interfaces/storage.interface';
import { STORAGE_SERVICE } from '../database/services.provider';
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
  constructor(
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService
  ) {}

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
      // Upload all files using the storage service
      const [frontUrl, backUrl, selfieUrl] = await Promise.all([
        this.storageService.uploadFile('documents', frontPath, files.front.buffer, files.front.mimetype),
        this.storageService.uploadFile('documents', backPath, files.back.buffer, files.back.mimetype),
        this.storageService.uploadFile('documents', selfiePath, files.selfie.buffer, files.selfie.mimetype),
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
        deletePromises.push(this.storageService.deleteFile('documents', frontPath));
      }
      
      if (documentUrls.back) {
        const backPath = this.extractPathFromUrl(documentUrls.back);
        deletePromises.push(this.storageService.deleteFile('documents', backPath));
      }
      
      if (documentUrls.selfie) {
        const selfiePath = this.extractPathFromUrl(documentUrls.selfie);
        deletePromises.push(this.storageService.deleteFile('documents', selfiePath));
      }

      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting documents:', error);
      // Don't throw error for cleanup operations
    }
  }

  private extractPathFromUrl(url: string): string {
    // For Supabase URLs: https://[project].supabase.co/storage/v1/object/public/documents/path/to/file.jpg
    if (url.includes('/storage/v1/object/public/documents/')) {
      const urlParts = url.split('/storage/v1/object/public/documents/');
      return urlParts[1] || '';
    }
    
    // For local storage URLs: http://localhost:3000/uploads/documents/path/to/file.jpg
    if (url.includes('/uploads/documents/')) {
      const urlParts = url.split('/uploads/documents/');
      return urlParts[1] || '';
    }
    
    // If we can't parse the URL, return the whole URL as a fallback
    console.warn('Could not parse URL:', url);
    return url;
  }
}