import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CloudStorageFactoryService } from '../common/providers/cloud-storage-factory.service';
import {
  FileUploadResult,
  FileListItem,
} from '../common/interfaces/cloud-storage.interface';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private readonly cloudStorageFactory: CloudStorageFactoryService,
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

      const storageProvider =
        await this.cloudStorageFactory.getProvider(provider);
      const storageName = storageProvider.generateStorageName(
        file.originalname,
      );

      if (folderPath && storageProvider.createFolder) {
        await storageProvider.createFolder(folderPath);
      }

      const uploadResult = await storageProvider.uploadFile(
        file,
        storageName,
        folderPath,
      );

      const fileId = await storageProvider.saveFileRecord(
        file,
        uploadResult.url,
        storageName,
        folderPath,
      );

      return {
        url: uploadResult.url,
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
      const storageProvider =
        await this.cloudStorageFactory.getProvider(provider);
      return await storageProvider.listFiles(folderPath);
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
      const storageProvider =
        await this.cloudStorageFactory.getProvider(provider);
      return await storageProvider.downloadFile(fileId, folderPath);
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
      const storageProvider =
        await this.cloudStorageFactory.getProvider(provider);
      return await storageProvider.deleteFile(fileId, folderPath);
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
      const storageProvider =
        await this.cloudStorageFactory.getProvider(provider);
      if (storageProvider.createFolder) {
        await storageProvider.createFolder(folderPath);
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

  async deleteFolderFromProvider(
    provider: string,
    folderPath: string,
  ): Promise<void> {
    if (!folderPath) {
      throw new BadRequestException('Folder path is required');
    }

    try {
      const storageProvider =
        await this.cloudStorageFactory.getProvider(provider);
      await storageProvider.deleteFolder(folderPath);
    } catch (error) {
      this.logger.error(`Delete folder failed: ${error.message}`);
      throw error;
    }
  }
}
