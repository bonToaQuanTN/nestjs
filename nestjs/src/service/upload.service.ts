import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import type { Express } from 'express';

@Injectable()
export class UploadService {
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

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: 'nestjs_upload' }, (error, result) => {
          if (error || !result) {
            return reject(error || new Error('Upload failed'));
          }

          resolve(result.secure_url);
        })
        .end(file.buffer);
    });
  }
}