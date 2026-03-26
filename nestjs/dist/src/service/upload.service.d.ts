export declare class UploadService {
    private readonly logger;
    constructor();
    uploadFile(file: Express.Multer.File): Promise<string>;
}
