import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import {
  CloudStorageProvider,
  FileListItem,
} from '../interfaces/cloud-storage.interface';
import { ProviderConfigService } from './provider-config.service';

/**
 * Abstract base class for all cloud storage providers
 */
@Injectable()
export abstract class BaseCloudStorageProvider implements CloudStorageProvider {
  protected readonly logger: Logger;
  protected providerConfigService: ProviderConfigService;

  constructor(
    protected readonly configService: ConfigService,
    protected readonly prisma: PrismaService,
    protected readonly encryptionService: EncryptionService,
    protected readonly providerName: string,
  ) {
    this.logger = new Logger(`${providerName}Service`);
    this.providerConfigService = new ProviderConfigService(configService);
  }

  abstract uploadFile(
    file: Express.Multer.File,
    fileName: string,
    folderPath?: string,
  ): Promise<{ url: string; storageName: string }>;

  abstract listFiles(folderPath?: string): Promise<FileListItem[]>;

  abstract downloadFile(fileId: string, folderPath?: string): Promise<Buffer>;

  abstract deleteFile(fileId: string, folderPath?: string): Promise<void>;

  abstract deleteFolder(folderPath: string): Promise<void>;

  abstract createFolder?(folderPath: string): Promise<void>;

  // Abstract method for provider-specific configuration validation
  protected abstract validateConfiguration(): void;

  // Abstract method for getting provider-specific credentials for encryption
  protected abstract getCredentialsForEncryption(): Record<string, any>;

  /**
   * Common error handling wrapper for operations
   */
  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logger.error(`${operationName} failed: ${error.message}`);
      throw new BadRequestException(
        `Failed to ${operationName.toLowerCase()} with ${this.providerName}: ${error.message}`,
      );
    }
  }

  async saveFileRecord(
    file: Express.Multer.File,
    url: string,
    storageName: string,
    folderPath?: string,
  ): Promise<string> {
    const { encryptionSecret } =
      this.providerConfigService.getEncryptionConfig();

    this.validateConfiguration();

    const credentials = this.getCredentialsForEncryption();

    // Encrypt credentials
    const encryptedCredentials = await this.encryptionService.encrypt(
      JSON.stringify(credentials),
      encryptionSecret,
    );

    // Save file record to database
    const savedFile = await this.prisma.file.create({
      data: {
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        url: url,
        storageName: storageName,
        path: folderPath,
        cloudStorages: {
          create: {
            provider: this.providerName.toLowerCase(),
            apiKey: encryptedCredentials,
          },
        },
      },
    });

    this.logger.log(
      `File record saved successfully: ${file.originalname} (${savedFile.id})`,
    );

    return savedFile.id;
  }

  protected normalizeFolderPath(folderPath?: string): string {
    if (!folderPath) return '';
    return folderPath.replace(/^\/+|\/+$/g, '');
  }

  protected constructFilePath(fileName: string, folderPath?: string): string {
    const normalizedFolder = this.normalizeFolderPath(folderPath);
    return normalizedFolder ? `${normalizedFolder}/${fileName}` : fileName;
  }

  protected validateFileOperation(file: Express.Multer.File): void {
    if (!file || !file.buffer) {
      throw new BadRequestException('Invalid file data');
    }
  }

  protected validateFolderPath(folderPath: string): void {
    if (!folderPath || folderPath.trim() === '') {
      throw new BadRequestException('Folder path is required');
    }
  }

  public generateStorageName(originalName: string): string {
    return `${Date.now()}_${originalName}`;
  }
}
