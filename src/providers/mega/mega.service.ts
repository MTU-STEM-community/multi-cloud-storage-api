import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as megajs from 'megajs';
import { Readable } from 'stream';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import { ProviderConfigService } from '../../common/providers/provider-config.service';
import { FileListItem } from '../../common/interfaces/cloud-storage.interface';
import { FileValidationPipe } from '../../common/pipes/file-validation.pipe';
import { BaseCloudStorageProvider } from '../../common/providers/base-cloud-storage.provider';

const SESSION_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class MegaService extends BaseCloudStorageProvider {
  private storageInstance: megajs.Storage | null = null;
  private sessionCreatedAt: number | null = null;

  constructor(
    configService: ConfigService,
    prisma: PrismaService,
    encryptionService: EncryptionService,
    providerConfigService: ProviderConfigService,
  ) {
    super(configService, prisma, encryptionService, providerConfigService, 'Mega');
  }

  protected validateConfiguration(): void {
    this.providerConfigService.getMegaConfig();
  }

  protected getCredentialsForEncryption(): Record<string, any> {
    const config = this.providerConfigService.getMegaConfig();
    return { email: config.email, password: config.password };
  }

  private isSessionExpired(): boolean {
    if (!this.sessionCreatedAt) return true;
    return Date.now() - this.sessionCreatedAt > SESSION_TTL_MS;
  }

  private async getMegaStorage(): Promise<megajs.Storage> {
    if (this.storageInstance && !this.isSessionExpired()) {
      return this.storageInstance;
    }

    if (this.storageInstance) {
      this.invalidateSession();
    }

    const { email, password } = this.getCredentialsForEncryption();

    return new Promise<megajs.Storage>((resolve, reject) => {
      const storage = new megajs.Storage({ email, password, autoload: true });

      storage.on('ready', () => {
        this.storageInstance = storage;
        this.sessionCreatedAt = Date.now();
        this.logger.log('Mega session established');
        resolve(storage);
      });

      storage.on('error', (err) => {
        this.invalidateSession();
        reject(new Error(`Failed to authenticate with Mega: ${err.message}`));
      });
    });
  }

  private invalidateSession(): void {
    this.storageInstance = null;
    this.sessionCreatedAt = null;
  }

  private async navigateToFolder(
    storage: megajs.Storage,
    folderPath?: string,
  ): Promise<any> {
    let targetFolder: any = storage.root;

    if (folderPath) {
      const normalizedPath = this.normalizeFolderPath(folderPath);
      const folders = normalizedPath.split('/').filter((f) => f);

      for (const folder of folders) {
        let found = false;
        for (const child of targetFolder.children) {
          if (child.name === folder && child.directory) {
            targetFolder = child;
            found = true;
            break;
          }
        }

        if (!found) {
          throw new NotFoundException(`Folder '${folderPath}' not found`);
        }
      }
    }

    return targetFolder;
  }

  private async createFolderPath(storage: megajs.Storage, folderPath: string): Promise<any> {
    let targetFolder: any = storage.root;
    const normalizedPath = this.normalizeFolderPath(folderPath);
    const folders = normalizedPath.split('/').filter((f) => f);

    for (const folder of folders) {
      let found = false;
      for (const child of targetFolder.children) {
        if (child.name === folder && child.directory) {
          targetFolder = child;
          found = true;
          break;
        }
      }

      if (!found) {
        targetFolder = await new Promise((resolve, reject) => {
          targetFolder.mkdir(folder, (err: any, newFolder: any) => {
            if (err) reject(err);
            else resolve(newFolder);
          });
        });
      }
    }

    return targetFolder;
  }

  async ping(): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const storage = await this.getMegaStorage().catch((err) => {
        this.invalidateSession();
        throw err;
      });
      if (!storage.root) {
        throw new Error('Mega storage root is not accessible');
      }
    }, 'Ping');
  }

  async uploadFile(
    file: Express.Multer.File,
    fileName: string,
    folderPath?: string,
  ): Promise<{ url: string; storageName: string }> {
    return this.executeWithErrorHandling(async () => {
      this.validateFileOperation(file);

      const storage = await this.getMegaStorage().catch((err) => {
        this.invalidateSession();
        throw err;
      });

      const targetFolder = folderPath
        ? await this.createFolderPath(storage, folderPath)
        : storage.root;

      const uploadResult: any = await new Promise((resolve, reject) => {
        targetFolder.upload(
          { name: fileName, size: file.size },
          file.buffer,
          (err: any, uploadedFile: any) => {
            if (err) reject(err);
            else resolve(uploadedFile);
          },
        );
      });

      const shareLink: string = await new Promise((resolve, reject) => {
        uploadResult.link((err: any, url: string) => {
          if (err) reject(err);
          else resolve(url);
        });
      });

      return { url: shareLink, storageName: fileName };
    }, 'Upload file');
  }

  async listFiles(folderPath?: string): Promise<FileListItem[]> {
    return this.executeWithErrorHandling(async () => {
      const storage = await this.getMegaStorage().catch((err) => {
        this.invalidateSession();
        throw err;
      });

      const targetFolder = await this.navigateToFolder(storage, folderPath);

      return targetFolder.children.map((item: any) => ({
        name: item.name,
        size: item.directory ? '-' : item.size,
        contentType: item.directory ? 'folder' : FileValidationPipe.getMimeType(item.name),
        created: new Date(item.timestamp * 1000).toISOString(),
        path: folderPath ? `${folderPath}/${item.name}` : item.name,
        isFolder: item.directory,
      }));
    }, 'List files');
  }

  async downloadFile(fileId: string, folderPath?: string): Promise<Readable> {
    return this.executeWithErrorHandling(async () => {
      const storage = await this.getMegaStorage().catch((err) => {
        this.invalidateSession();
        throw err;
      });

      const targetFolder = await this.navigateToFolder(storage, folderPath);
      const targetFile = targetFolder.children.find((item: any) => item.name === fileId);

      if (!targetFile) {
        throw new NotFoundException(`File '${fileId}' not found`);
      }

      const buffer: Buffer = await new Promise((resolve, reject) => {
        targetFile.download((err: any, data: Buffer) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      return Readable.from(buffer);
    }, 'Download file');
  }

  async deleteFile(fileId: string, folderPath?: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const storage = await this.getMegaStorage().catch((err) => {
        this.invalidateSession();
        throw err;
      });

      const targetFolder = await this.navigateToFolder(storage, folderPath);
      const targetFile = targetFolder.children.find((item: any) => item.name === fileId);

      if (!targetFile) {
        throw new BadRequestException(`File '${fileId}' not found`);
      }

      await new Promise<void>((resolve, reject) => {
        targetFile.delete((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }, 'Delete file');
  }

  async createFolder(folderPath: string): Promise<void> {
    this.validateFolderPath(folderPath);

    return this.executeWithErrorHandling(async () => {
      const storage = await this.getMegaStorage().catch((err) => {
        this.invalidateSession();
        throw err;
      });
      await this.createFolderPath(storage, folderPath);
    }, 'Create folder');
  }

  async deleteFolder(folderPath: string): Promise<void> {
    this.validateFolderPath(folderPath);

    return this.executeWithErrorHandling(async () => {
      const storage = await this.getMegaStorage().catch((err) => {
        this.invalidateSession();
        throw err;
      });

      const targetFolder = await this.navigateToFolder(storage, folderPath);

      await new Promise<void>((resolve, reject) => {
        targetFolder.delete((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }, 'Delete folder');
  }
}
