import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { GoogleCloudService } from '../providers/google-cloud/google-cloud.service';
import { DropboxService } from '../providers/dropbox/dropbox.service';
import { MegaService } from '../providers/mega/mega.service';
import { GoogleDriveService } from '../providers/google-drive/google-drive.service';
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
    private readonly megaService: MegaService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  async uploadFileToProvider(
    file: Express.Multer.File,
    provider: string,
    folderPath?: string,
  ): Promise<FileUploadResult> {
    try {
      if (!file || !file.buffer) {
        throw new BadRequestException('Invalid file data');
      }

      const storageName = `${Date.now()}_${file.originalname}`;
      let url: string;
      let fileId: string;

      if (folderPath) {
        await this.createFolderInProvider(provider, folderPath);
      }

      switch (provider) {
        case 'google-cloud':
          const googleResult = await this.googleCloudService.uploadFile(
            file,
            storageName,
            folderPath,
          );
          url = googleResult.url;
          fileId = await this.googleCloudService.saveFileRecord(
            file,
            url,
            storageName,
            folderPath,
          );
          break;
        case 'dropbox':
          const dropboxResult = await this.dropboxService.uploadFile(
            file,
            storageName,
            folderPath,
          );
          url = dropboxResult.url;
          fileId = await this.dropboxService.saveFileRecord(
            file,
            url,
            storageName,
            folderPath,
          );
          break;
        case 'mega':
          const megaResult = await this.megaService.uploadFile(
            file,
            storageName,
            folderPath,
          );
          url = megaResult.url;
          fileId = await this.megaService.saveFileRecord(
            file,
            url,
            storageName,
            folderPath,
          );
          break;
        case 'google-drive':
          const googleDriveResult = await this.googleDriveService.uploadFile(
            file,
            storageName,
            folderPath,
          );
          url = googleDriveResult.url;
          fileId = await this.googleDriveService.saveFileRecord(
            file,
            url,
            storageName,
            folderPath,
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
        folderPath,
      };
    } catch (error) {
      this.logger.error(`Upload failed: ${error.message}`);
      throw error;
    }
  }

  async listFilesFromProvider(
    provider: string,
    folderPath?: string,
  ): Promise<FileListItem[]> {
    try {
      switch (provider) {
        case 'google-cloud':
          return this.googleCloudService.listFiles(folderPath);
        case 'dropbox':
          return this.dropboxService.listFiles(folderPath);
        case 'mega':
          return this.megaService.listFiles(folderPath);
        case 'google-drive':
          return this.googleDriveService.listFiles(folderPath);
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
    folderPath?: string,
  ): Promise<Buffer> {
    try {
      switch (provider) {
        case 'google-cloud':
          return await this.googleCloudService.downloadFile(fileId, folderPath);
        case 'dropbox':
          return await this.dropboxService.downloadFile(fileId, folderPath);
        case 'mega':
          return await this.megaService.downloadFile(fileId, folderPath);
        case 'google-drive':
          return await this.googleDriveService.downloadFile(fileId, folderPath);
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
    folderPath?: string,
  ): Promise<void> {
    try {
      switch (provider) {
        case 'google-cloud':
          return await this.googleCloudService.deleteFile(fileId, folderPath);
        case 'dropbox':
          return await this.dropboxService.deleteFile(fileId, folderPath);
        case 'mega':
          return await this.megaService.deleteFile(fileId, folderPath);
        case 'google-drive':
          return await this.googleDriveService.deleteFile(fileId, folderPath);
        default:
          throw new BadRequestException('Unsupported provider');
      }
    } catch (error) {
      this.logger.error(`Delete failed: ${error.message}`);
      throw error;
    }
  }

  async createFolderInProvider(
    provider: string,
    folderPath: string,
  ): Promise<void> {
    if (!folderPath) {
      throw new BadRequestException('Folder path is required');
    }

    try {
      switch (provider) {
        case 'google-cloud':
          await this.googleCloudService.createFolder(folderPath);
          break;
        case 'dropbox':
          await this.dropboxService.createFolder(folderPath);
          break;
        case 'mega':
          await this.megaService.createFolder(folderPath);
          break;
        case 'google-drive':
          await this.googleDriveService.createFolder(folderPath);
          break;
        default:
          throw new BadRequestException('Unsupported provider');
      }
    } catch (error) {
      if (error.message?.includes('already exists')) {
        this.logger.log(`Folder '${folderPath}' already exists in ${provider}`);
        return;
      }
      this.logger.error(`Create folder failed: ${error.message}`);
      throw error;
    }
  }
}
