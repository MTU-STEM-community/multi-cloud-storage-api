import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import { FileListItem } from '../../common/interfaces/cloud-storage.interface';
import * as megajs from 'megajs';
import { FileValidationPipe } from '../../common/pipes/file-validation.pipe';
import { BaseCloudStorageProvider } from '../../common/providers/base-cloud-storage.provider';

@Injectable()
export class MegaService extends BaseCloudStorageProvider {
  constructor(
    configService: ConfigService,
    prisma: PrismaService,
    encryptionService: EncryptionService,
  ) {
    super(configService, prisma, encryptionService, 'Mega');
  }

  protected validateConfiguration(): void {
    this.providerConfigService.getMegaConfig();
  }

  protected getCredentialsForEncryption(): Record<string, any> {
    const config = this.providerConfigService.getMegaConfig();
    return {
      email: config.email,
      password: config.password,
    };
  }

  private async getMegaStorage(): Promise<megajs.Storage> {
    const { email, password } = this.getCredentialsForEncryption();

    this.logger.log('Attempting to authenticate with Mega...');

    return new Promise<megajs.Storage>((resolve, reject) => {
      const storage = new megajs.Storage({
        email: email,
        password: password,
        autoload: true,
      });

      storage.on('ready', () => {
        this.logger.log('Mega authentication successful');
        resolve(storage);
      });

      storage.on('error', (err) => {
        this.logger.error(`Mega authentication error: ${err.message}`);
        reject(new Error(`Failed to authenticate with Mega: ${err.message}`));
      });
    });
  }

  private async navigateToFolder(storage: megajs.Storage, folderPath?: string): Promise<any> {
    let targetFolder: any = storage.root;

    if (folderPath) {
      const normalizedPath = this.normalizeFolderPath(folderPath);
      const folders = normalizedPath.split('/').filter(f => f);

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
          throw new Error(`Folder '${folderPath}' not found`);
        }
      }
    }

    return targetFolder;
  }

  private async createFolderPath(storage: megajs.Storage, folderPath: string): Promise<any> {
    let targetFolder: any = storage.root;
    const normalizedPath = this.normalizeFolderPath(folderPath);
    const folders = normalizedPath.split('/').filter(f => f);

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
          targetFolder.mkdir(folder, (err: any, folder: any) => {
            if (err) reject(err);
            else resolve(folder);
          });
        });
      }
    }

    return targetFolder;
  }

  async uploadFile(
    file: Express.Multer.File,
    fileName: string,
    folderPath?: string,
  ): Promise<{ url: string; storageName: string }> {
    return this.executeWithErrorHandling(async () => {
      this.validateFileOperation(file);

      const storage = await this.getMegaStorage();
      const targetFolder = folderPath
        ? await this.createFolderPath(storage, folderPath)
        : storage.root;

      const uploadResult: any = await new Promise((resolve, reject) => {
        targetFolder.upload(
          {
            name: fileName,
            size: file.size,
          },
          file.buffer,
          (err: any, uploadedFile: any) => {
            if (err) {
              this.logger.error(`Upload error: ${err.message}`);
              reject(err);
            } else {
              this.logger.log(`File uploaded successfully: ${fileName}`);
              resolve(uploadedFile);
            }
          },
        );
      });

      const shareLink: string = await new Promise((resolve, reject) => {
        uploadResult.link((err: any, url: string) => {
          if (err) {
            this.logger.error(`Error generating share link: ${err.message}`);
            reject(err);
          } else {
            this.logger.log(`Share link generated successfully`);
            resolve(url);
          }
        });
      });

      return {
        url: shareLink,
        storageName: fileName,
      };
    }, 'Upload file');
  }

  async listFiles(folderPath?: string): Promise<FileListItem[]> {
    return this.executeWithErrorHandling(async () => {
      const storage = await this.getMegaStorage();
      const targetFolder = await this.navigateToFolder(storage, folderPath);

      return targetFolder.children.map((item: any) => ({
        name: item.name,
        size: item.directory ? '-' : item.size,
        contentType: item.directory
          ? 'folder'
          : FileValidationPipe.getMimeType(item.name),
        created: new Date(item.timestamp * 1000).toISOString(),
        path: folderPath ? `${folderPath}/${item.name}` : item.name,
        isFolder: item.directory,
      }));
    }, 'List files');
  }

  async downloadFile(fileId: string, folderPath?: string): Promise<Buffer> {
    return this.executeWithErrorHandling(async () => {
      const storage = await this.getMegaStorage();
      const targetFolder = await this.navigateToFolder(storage, folderPath);

      const targetFile = targetFolder.children.find(
        (item: any) => item.name === fileId,
      );
      if (!targetFile) {
        throw new BadRequestException(`File '${fileId}' not found`);
      }

      return new Promise((resolve, reject) => {
        targetFile.download((err: any, data: Buffer) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
    }, 'Download file');
  }

  async deleteFile(fileId: string, folderPath?: string): Promise<void> {
    this.executeWithErrorHandling(async () => {
      const storage = await this.getMegaStorage();
      const targetFolder = await this.navigateToFolder(storage, folderPath);

      const targetFile = targetFolder.children.find(
        (item: any) => item.name === fileId,
      );
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
      const storage = await this.getMegaStorage();
      await this.createFolderPath(storage, folderPath);
    }, 'Create Folder');
  }

  async deleteFolder(folderPath: string): Promise<void> {
    this.validateFolderPath(folderPath);

    return this.executeWithErrorHandling(async () => {
      const storage = await this.getMegaStorage();
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
