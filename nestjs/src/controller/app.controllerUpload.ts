import {Controller, Post, UseInterceptors, UploadedFile}from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from '../service/upload.service';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';

@Controller('upload')
export class UploadController {
    constructor(private readonly uploadService: UploadService) {}

    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',properties: {
                file: {type: 'string',format: 'binary'}
            }
        }
    })

    @Post()
    async upload(@UploadedFile() file: Express.Multer.File) {
        
        const url = await this.uploadService.uploadFile(file);
        console.log(file);
        return {
            message: 'Upload success',
            url
        };
    }
}
