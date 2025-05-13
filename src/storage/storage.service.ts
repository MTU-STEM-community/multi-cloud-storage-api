import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { GoogleCloudService } from '../providers/google-cloud/google-cloud.service';
import { DropboxService } from '../providers/dropbox/dropbox.service';
import {
  FileUploadResult,
  FileListItem,
} from '../common/interfaces/cloud-storage.interface';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private readonly googleCloudService: GoogleCloudService,
    private readonly dropboxService: DropboxService,
  ) {}

  async uploadFileToProvider(
    file: Express.Multer.File,
    provider: string,
  ): Promise<FileUploadResult> {
    try {
      if (!file || !file.buffer) {
        throw new BadRequestException('Invalid file data');
      }

      const storageName = `${Date.now()}_${file.originalname}`;
      let url: string;
      let fileId: string;

      switch (provider) {
        case 'google':
          const googleResult = await this.googleCloudService.uploadFile(
            file,
            storageName,
          );
          url = googleResult.url;
          fileId = await this.googleCloudService.saveFileRecord(
            file,
            url,
            storageName,
          );
          break;
        case 'dropbox':
          const dropboxResult = await this.dropboxService.uploadFile(
            file,
            storageName,
          );
          url = dropboxResult.url;
          fileId = await this.dropboxService.saveFileRecord(
            file,
            url,
            storageName,
          );
          break;
        default:
          throw new BadRequestException('Unsupported provider');
      }

      return {
        url,
        originalName: file.originalname,
        storageName,
        fileId,
      };
    } catch (error) {
      this.logger.error(`Upload failed: ${error.message}`);
      throw error;
    }
  }

  async listFilesFromProvider(provider: string): Promise<FileListItem[]> {
    try {
      switch (provider) {
        case 'google':
          return this.googleCloudService.listFiles();
        case 'dropbox':
          return this.dropboxService.listFiles();
        default:
          throw new BadRequestException('Unsupported provider');
      }
    } catch (error) {
      this.logger.error(`Listing files failed: ${error.message}`);
      throw error;
    }
  }

  async downloadFileFromProvider(
    provider: string,
    fileId: string,
  ): Promise<Buffer> {
    try {
      switch (provider) {
        case 'google':
          return await this.googleCloudService.downloadFile(fileId);
        case 'dropbox':
          return await this.dropboxService.downloadFile(fileId);
        default:
          throw new BadRequestException('Unsupported provider');
      }
    } catch (error) {
      this.logger.error(`Download failed: ${error.message}`);
      throw error;
    }
  }

  async deleteFileFromProvider(
    provider: string,
    fileId: string,
  ): Promise<void> {
    try {
      switch (provider) {
        case 'google':
          return await this.googleCloudService.deleteFile(fileId);
        case 'dropbox':
          return await this.dropboxService.deleteFile(fileId);
        default:
          throw new BadRequestException('Unsupported provider');
      }
    } catch (error) {
      this.logger.error(`Delete failed: ${error.message}`);
      throw error;
    }
  }
}
