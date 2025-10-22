import { Injectable } from '@nestjs/common';
import { IStorageService } from '../interfaces/storage.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly baseDir: string;
  private readonly baseUrl: string;

  constructor() {
    this.baseDir = process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), 'uploads');
    this.baseUrl = process.env.LOCAL_STORAGE_URL || `http://localhost:${process.env.PORT || 3000}/uploads`;
    
    // Ensure base directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async uploadFile(bucket: string, filePath: string, file: Buffer, contentType: string): Promise<string> {
    // Create bucket directory if it doesn't exist
    const bucketPath = path.join(this.baseDir, bucket);
    if (!fs.existsSync(bucketPath)) {
      fs.mkdirSync(bucketPath, { recursive: true });
    }

    // Create directory structure for the file if needed
    const dirPath = path.join(bucketPath, path.dirname(filePath));
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Write file to disk
    const fullPath = path.join(bucketPath, filePath);
    await fs.promises.writeFile(fullPath, file);

    // Return public URL
    return this.getPublicUrl(bucket, filePath);
  }

  async deleteFile(bucket: string, filePath: string): Promise<void> {
    const fullPath = path.join(this.baseDir, bucket, filePath);
    
    // Check if file exists
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }

  getPublicUrl(bucket: string, filePath: string): string {
    return `${this.baseUrl}/${bucket}/${filePath}`;
  }
}
