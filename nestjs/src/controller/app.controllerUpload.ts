import { Controller, Post, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from '../service/upload.service';
import { ApiConsumes, ApiBody, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../guards/auth.guard';
import { PermissionGuard } from '../guards/PermissionGuard';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

@UseGuards(AuthGuard, PermissionGuard)
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @ApiOperation({ summary: 'Upload File / Video' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',properties: {
        file: { type: 'string', format: 'binary' }
      }
    }
  })

  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueName =Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueName + extname(file.originalname));
        }
      }),limits: {
        fileSize: 1024 * 1024 * 1024 * 20, // 20GB
        fieldSize: 1024 * 1024 * 1024 * 20
      }
    }))
  async upload(@UploadedFile() file: Express.Multer.File) {
    const urls = await this.uploadService.uploadFile(file);

    return {
      message: 'Upload success',
      urls
    };
  }
}