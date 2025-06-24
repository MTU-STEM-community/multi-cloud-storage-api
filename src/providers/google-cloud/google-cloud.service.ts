import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import { FileListItem } from '../../common/interfaces/cloud-storage.interface';
import { BaseCloudStorageProvider } from '../../common/providers/base-cloud-storage.provider';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class GoogleCloudService extends BaseCloudStorageProvider {
  constructor(
    configService: ConfigService,
    prisma: PrismaService,
    encryptionService: EncryptionService,
  ) {
    super(configService, prisma, encryptionService, 'GoogleCloud');
  }

  protected validateConfiguration(): void {
    this.providerConfigService.getGoogleCloudConfig();
  }

  protected getCredentialsForEncryption(): Record<string, any> {
    const config = this.providerConfigService.getGoogleCloudConfig();
    return {
      projectId: config.projectId,
      bucketName: config.bucketName,
      keyFilePath: config.keyFilePath,
      apiKey: config.apiKey,
    };
  }

  async uploadFile(
    file: Express.Multer.File,
    fileName: string,
    folderPath?: string,
  ): Promise<{ url: string; storageName: string }> {
    return this.executeWithErrorHandling(async () => {
      this.validateFileOperation(file);

      const { projectId, bucketName, keyFilePath } =
        this.providerConfigService.getGoogleCloudConfig();

      const storage = new Storage({ projectId, keyFilename: keyFilePath });
      const bucket = storage.bucket(bucketName);

      const fullPath = this.constructFilePath(fileName, folderPath);
      const blob = bucket.file(fullPath);

      return new Promise((resolve, reject) => {
        const stream = blob.createWriteStream({
          metadata: {
            contentType: file.mimetype,
            metadata: {
              originalFileName: file.originalname,
              folderPath: folderPath || '',
            },
          },
        });

        stream.on('error', (err) =>
          reject(`Google Cloud upload error: ${err.message}`),
        );
        stream.on('finish', () => {
          resolve({
            url: `https://storage.googleapis.com/${bucketName}/${fullPath}`,
            storageName: fileName,
          });
        });

        stream.end(file.buffer);
      });
    }, 'Upload file');
  }

  async listFiles(folderPath?: string): Promise<FileListItem[]> {
    return this.executeWithErrorHandling(async () => {
      const { projectId, bucketName, keyFilePath } =
        this.providerConfigService.getGoogleCloudConfig();

      const storage = new Storage({ projectId, keyFilename: keyFilePath });
      const bucket = storage.bucket(bucketName);

      const options = folderPath ? { prefix: `${folderPath}/` } : {};
      const [files] = await bucket.getFiles(options);

      const results: FileListItem[] = [];

      if (folderPath) {
        const prefix = `${folderPath}/`;
        const directoryContents = new Set<string>();

        files.forEach((file) => {
          if (file.name === `${folderPath}/`) return;

          const relativePath = file.name.substring(prefix.length);

          if (relativePath.includes('/')) {
            const nestedFolder = relativePath.split('/')[0];
            if (!directoryContents.has(nestedFolder)) {
              directoryContents.add(nestedFolder);
              results.push({
                name: nestedFolder,
                size: '-',
                contentType: 'folder',
                created: '-',
                path: `${prefix}${nestedFolder}`,
                isFolder: true,
              });
            }
          } else {
            results.push({
              name: file.name.split('/').pop() || '',
              size: file.metadata.size ? String(file.metadata.size) : '-',
              contentType: file.metadata.contentType || 'unknown',
              created: file.metadata.timeCreated || '-',
              updated: file.metadata.updated || '-',
              originalName:
                file.metadata.metadata?.originalFileName?.toString() ||
                file.name,
              path: file.name,
              isFolder: false,
            });
          }
        });

        return results;
      } else {
        const rootContents = new Set<string>();

        files.forEach((file) => {
          if (file.name.includes('/')) {
            const topFolder = file.name.split('/')[0];
            if (!rootContents.has(topFolder)) {
              rootContents.add(topFolder);
              results.push({
                name: topFolder,
                size: '-',
                contentType: 'folder',
                created: '-',
                path: topFolder,
                isFolder: true,
              });
            }
          } else {
            results.push({
              name: file.name,
              size: file.metadata.size ? String(file.metadata.size) : '-',
              contentType: file.metadata.contentType || 'unknown',
              created: file.metadata.timeCreated || '-',
              updated: file.metadata.updated || '-',
              originalName:
                file.metadata.metadata?.originalFileName?.toString() ||
                file.name,
              path: file.name,
              isFolder: false,
            });
          }
        });

        return results;
      }
    }, 'List files');
  }

  async downloadFile(fileId: string, folderPath?: string): Promise<Buffer> {
    return this.executeWithErrorHandling(async () => {
      const { projectId, bucketName, keyFilePath } =
        this.providerConfigService.getGoogleCloudConfig();

      const storage = new Storage({ projectId, keyFilename: keyFilePath });
      const bucket = storage.bucket(bucketName);

      const fullPath = folderPath ? `${folderPath}/${fileId}` : fileId;
      const file = bucket.file(fullPath);

      try {
        const [contents] = await file.download();
        return contents;
      } catch (error) {
        throw new BadRequestException(
          `Failed to download file from Google Cloud: ${error.message}`,
        );
      }
    }, 'Download file');
  }

  async deleteFile(fileId: string, folderPath?: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const { projectId, bucketName, keyFilePath } =
        this.providerConfigService.getGoogleCloudConfig();

      const storage = new Storage({ projectId, keyFilename: keyFilePath });

      const fullPath = this.constructFilePath(fileId, folderPath);
      await storage.bucket(bucketName).file(fullPath).delete();
    }, 'Delete file');
  }

  async createFolder(folderPath: string): Promise<void> {
    this.validateFolderPath(folderPath);

    return this.executeWithErrorHandling(async () => {
      const { projectId, bucketName, keyFilePath } =
        this.providerConfigService.getGoogleCloudConfig();

      const storage = new Storage({ projectId, keyFilename: keyFilePath });
      const bucket = storage.bucket(bucketName);
      const folderFile = bucket.file(`${folderPath}/`);

      await folderFile.save('', {
        contentType: 'application/x-directory',
      });

      this.logger.log(`Folder '${folderPath}' created in Google Cloud Storage`);
    }, 'Create folder');
  }

  async deleteFolder(folderPath: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const { projectId, bucketName, keyFilePath } =
        this.providerConfigService.getGoogleCloudConfig();

      const storage = new Storage({ projectId, keyFilename: keyFilePath });
      const bucket = storage.bucket(bucketName);

      await bucket.deleteFiles({
        prefix: `${folderPath}/`,
      });
    }, 'Delete folder');
  }
}
