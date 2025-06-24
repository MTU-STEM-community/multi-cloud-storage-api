import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import { Dropbox } from 'dropbox';
import { BaseCloudStorageProvider } from '../../common/providers/base-cloud-storage.provider';
import { FileListItem } from '../../common/interfaces/cloud-storage.interface';

@Injectable()
export class DropboxService extends BaseCloudStorageProvider {
  constructor(
    configService: ConfigService,
    prisma: PrismaService,
    encryptionService: EncryptionService,
  ) {
    super(configService, prisma, encryptionService, 'Dropbox');
  }

  protected validateConfiguration(): void {
    this.providerConfigService.getDropboxConfig();
  }

  protected getCredentialsForEncryption(): Record<string, any> {
    const config = this.providerConfigService.getDropboxConfig();
    return { accessToken: config.accessToken };
  }

  private getDropboxClient(): Dropbox {
    const config = this.providerConfigService.getDropboxConfig();
    return new Dropbox({ accessToken: config.accessToken });
  }

  async uploadFile(
    file: Express.Multer.File,
    fileName: string,
    folderPath?: string,
  ): Promise<{ url: string; storageName: string }> {
    return this.executeWithErrorHandling(async () => {
      this.validateFileOperation(file);

      const dropbox = this.getDropboxClient();
      const fullPath = `/${this.constructFilePath(fileName, folderPath)}`;

      const response = await dropbox.filesUpload({
        path: fullPath,
        contents: file.buffer,
        mode: { '.tag': 'add' },
        autorename: true,
      });

      if (!response.result) {
        throw new Error('Failed to upload file to Dropbox');
      }

      const linkResponse = await dropbox.sharingCreateSharedLinkWithSettings({
        path: response.result.path_lower!,
      });

      return {
        url: linkResponse.result.url.replace('?dl=0', '?raw=1'),
        storageName: fileName,
      };
    }, 'Upload file');
  }

  async listFiles(folderPath?: string): Promise<FileListItem[]> {
    return this.executeWithErrorHandling(async () => {
      const dropbox = this.getDropboxClient();
      const path = folderPath ? `/${this.normalizeFolderPath(folderPath)}` : '';
      const response = await dropbox.filesListFolder({ path });

      return response.result.entries.map((entry) => ({
        name: entry.name,
        path: entry.path_lower,
        size: (entry as any).size || 'Unknown',
        contentType: (entry as any).content_type || 'Unknown',
        modified: (entry as any).server_modified || 'Unknown',
        isFolder: entry['.tag'] === 'folder',
      }));
    }, 'List files');
  }

  async downloadFile(fileId: string, folderPath?: string): Promise<Buffer> {
    return this.executeWithErrorHandling(async () => {
      const dropbox = this.getDropboxClient();
      const path = `/${this.constructFilePath(fileId, folderPath)}`;
      const response = await dropbox.filesDownload({ path });

      const fileContents =
        (response.result as any).fileBinary ||
        (response.result as any).fileContents;

      if (!fileContents) {
        throw new Error('Failed to retrieve file contents from Dropbox');
      }

      return Buffer.from(fileContents);
    }, 'Download file');
  }

  async deleteFile(fileId: string, folderPath?: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const dropbox = this.getDropboxClient();
      const path = `/${this.constructFilePath(fileId, folderPath)}`;
      await dropbox.filesDeleteV2({ path });
    }, 'Delete file');
  }

  async createFolder(folderPath: string): Promise<void> {
    this.validateFolderPath(folderPath);

    return this.executeWithErrorHandling(async () => {
      const dropbox = this.getDropboxClient();
      const normalizedPath = this.normalizeFolderPath(folderPath);

      try {
        await dropbox.filesCreateFolderV2({ path: `/${normalizedPath}` });
      } catch (error) {
        if (error.status === 409) {
          this.logger.log(`Folder '${folderPath}' already exists in Dropbox`);
          return;
        }
        throw error;
      }
    }, 'Create folder');
  }

  async deleteFolder(folderPath: string): Promise<void> {
    this.validateFolderPath(folderPath);

    return this.executeWithErrorHandling(async () => {
      const dropbox = this.getDropboxClient();
      const normalizedPath = this.normalizeFolderPath(folderPath);
      await dropbox.filesDeleteV2({ path: `/${normalizedPath}` });
    }, 'Delete folder');
  }
}
