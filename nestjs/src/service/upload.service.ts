import { Injectable, BadRequestException,Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

  ffmpeg.setFfmpegPath(ffmpegPath as string);

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

  async uploadFile(file: Express.Multer.File): Promise<string[]> {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB

    this.logger.log(`Uploading file: ${file.originalname}`);
    this.logger.log(`File path: ${file.path}`);

    if (file.size <= MAX_SIZE) {
      const url = await this.uploadToCloudinary(file.path);
      return [url];
    }

    this.logger.warn('File > 100MB. Splitting video...');

    const parts = await this.splitVideo(file.path);

    const urls: string[] = [];

    for (const part of parts) {
      const url = await this.uploadToCloudinary(part);
      urls.push(url);

      if (fs.existsSync(part)) {
        fs.unlinkSync(part);
      }
    }

      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      return urls;
    }

  async uploadToCloudinary(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        filePath,
        {
          resource_type: 'auto',
          folder: 'nestjs_upload',
        },
        (error, result) => {
          if (error || !result) {
            return reject(error);
          }

          resolve(result.secure_url);
        },
      );
    });
  }

  async splitVideo(filePath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const outputDir = path.dirname(filePath);
      const fileName = path.basename(filePath, path.extname(filePath));
      const outputPattern = `${outputDir}/${fileName}_part_%03d.mp4`;

      const parts: string[] = [];

      ffmpeg(filePath)
        .outputOptions(['-c copy','-map 0','-segment_time 60', '-f segment','-reset_timestamps 1',])
        .output(outputPattern)
        .on('end', () => {
          const files = fs.readdirSync(outputDir).filter((f) => f.startsWith(`${fileName}_part_`));
          files.forEach((f) => parts.push(path.join(outputDir, f)));
          resolve(parts);
        }).on('error', (err) => reject(err)).run();
    });
  }
}
