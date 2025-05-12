import { Controller, Post, Get, Param, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { FileValidationPipe } from '../pipes/file-validation.pipe';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload/:provider')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(FileValidationPipe) file: Express.Multer.File,
    @Param('provider') provider: string,
  ) {
    return this.storageService.uploadFileToProvider(file, provider);
  }

  @Get('list/:provider')
  async listFiles(@Param('provider') provider: string) {
    return this.storageService.listFilesFromProvider(provider);
  }

  @Get('download/:provider/:fileId')
  async downloadFile(
    @Param('provider') provider: string,
    @Param('fileId') fileId: string,
  ) {
    return this.storageService.downloadFileFromProvider(provider, fileId);
  }
}
