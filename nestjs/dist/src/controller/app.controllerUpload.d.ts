import { UploadService } from '../service/upload.service';
export declare class UploadController {
    private readonly uploadService;
    constructor(uploadService: UploadService);
    upload(file: Express.Multer.File): Promise<{
        message: string;
        url: string;
    }>;
}
