import {Controller, Post, UseInterceptors, UploadedFile,UseGuards   }from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from '../service/upload.service';
import { ApiConsumes, ApiBody, ApiTags, ApiOperation, ApiResponse, ApiBearerAuth  } from '@nestjs/swagger';
import { AuthGuard } from '../guards/auth.guard';
import {PermissionGuard,} from '../guards/PermissionGuard'
import { Roles,Permissions, } from '../guards/roles.decorator';

@UseGuards(AuthGuard,PermissionGuard)
@ApiBearerAuth()
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
    @ApiOperation({ summary: 'UploadFile' })
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
