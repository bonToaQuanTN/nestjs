import { Injectable, BadRequestException,Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import type { Express } from 'express';
import * as fs from 'fs';

@Injectable()
export class UploadService {

  private readonly logger = new Logger(UploadService.name);
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_SECRET,
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const sizeGB = file.size / (1024 * 1024 * 1024);

    if (sizeGB > 1) {
      this.logger.warn(`Large file detected: ${sizeGB.toFixed(2)} GB`);
    }

    this.logger.log(`Uploading file: ${file.originalname}`);
    this.logger.log(`File path: ${file.path}`);
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_large(
        file.path,
        {
          resource_type: 'auto',
          folder: 'nestjs_upload',
          chunk_size: 6000000
        },
        (error, result) => {

          if (error || !result) {
            this.logger.error('Upload failed', error);
            return reject(error);
          }
          this.logger.log(`Upload success: ${result.secure_url}`);

          resolve(result.secure_url);
        }
      )
    });
  }
   
}
