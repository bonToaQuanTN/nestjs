import {Controller, Post, UseInterceptors, UploadedFile,UseGuards   }from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from '../service/upload.service';
import { ApiConsumes, ApiBody, ApiTags, ApiOperation, ApiResponse, ApiBearerAuth  } from '@nestjs/swagger';
import { AuthGuard } from '../common/guards/auth.guard';
import {PermissionGuard,} from '../common/guards/PermissionGuard'
import { Roles,Permissions, } from '../common/guards/roles.decorator';
import { diskStorage } from 'multer';
import { extname } from 'path';

@UseGuards(AuthGuard,PermissionGuard)
@ApiBearerAuth()
@Controller('upload')
export class UploadController {

    constructor(private readonly uploadService: UploadService) {}
    @Post()
    @ApiOperation({ summary: 'UploadFile' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',properties:{
                file: {type: 'string',format: 'binary'}
            }
        }
    })
    @UseInterceptors(FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',filename: (req, file, cb) => {
          const uniqueName =Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueName + extname(file.originalname));
        }
      }),
      limits: {
        fileSize: 1024 * 1024 * 1024 * 20 // 20GB
      }
    })
  )
  
  async upload(@UploadedFile() file: Express.Multer.File) {
    const url = await this.uploadService.uploadFile(file);
    return {
      message: 'Upload success',
      url
    };
  }
}