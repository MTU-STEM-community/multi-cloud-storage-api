import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { Readable } from 'stream';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import { FileListItem } from '../../common/interfaces/cloud-storage.interface';
import { BaseCloudStorageProvider } from '../../common/providers/base-cloud-storage.provider';
import { ProviderConfigService } from '../../common/providers/provider-config.service';

@Injectable()
export class GoogleCloudService extends BaseCloudStorageProvider {
  constructor(
    configService: ConfigService,
    prisma: PrismaService,
    encryptionService: EncryptionService,
    providerConfigService: ProviderConfigService,
  ) {
    super(
      configService,
      prisma,
      encryptionService,
      providerConfigService,
      'GoogleCloud',
    );
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
    };
  }

  private getStorageClient(): { storage: Storage; bucketName: string } {
    const { projectId, bucketName, keyFilePath } =
      this.providerConfigService.getGoogleCloudConfig();
    return {
      storage: new Storage({ projectId, keyFilename: keyFilePath }),
      bucketName,
    };
  }

  async ping(): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const { storage, bucketName } = this.getStorageClient();
      const [exists] = await storage.bucket(bucketName).exists();
      if (!exists) {
        throw new Error(
          `Bucket '${bucketName}' does not exist or is inaccessible`,
        );
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

      const { storage, bucketName } = this.getStorageClient();
      const bucket = storage.bucket(bucketName);
      const fullPath = this.constructFilePath(fileName, folderPath);
      const blob = bucket.file(fullPath);

      return new Promise((resolve, reject) => {
        const stream = blob.createWriteStream({
          metadata: {
            contentType: file.mimetype,
            metadata: {
              originalFileName: file.originalname,
              folderPath: folderPath ?? '',
            },
          },
        });

        stream.on('error', (err) =>
          reject(new Error(`Google Cloud upload error: ${err.message}`)),
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
      const { storage, bucketName } = this.getStorageClient();
      const bucket = storage.bucket(bucketName);

      const options = folderPath ? { prefix: `${folderPath}/` } : {};
      const [files] = await bucket.getFiles(options);

      const results: FileListItem[] = [];

      if (folderPath) {
        const prefix = `${folderPath}/`;
        const seenFolders = new Set<string>();

        for (const file of files) {
          if (file.name === `${folderPath}/`) continue;

          const relativePath = file.name.substring(prefix.length);

          if (relativePath.includes('/')) {
            const nestedFolder = relativePath.split('/')[0];
            if (!seenFolders.has(nestedFolder)) {
              seenFolders.add(nestedFolder);
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
              name: file.name.split('/').pop() ?? '',
              size: file.metadata.size ? String(file.metadata.size) : '-',
              contentType: file.metadata.contentType ?? 'unknown',
              created: file.metadata.timeCreated ?? '-',
              updated: file.metadata.updated ?? '-',
              originalName:
                file.metadata.metadata?.originalFileName?.toString() ??
                file.name,
              path: file.name,
              isFolder: false,
            });
          }
        }
      } else {
        const seenFolders = new Set<string>();

        for (const file of files) {
          if (file.name.includes('/')) {
            const topFolder = file.name.split('/')[0];
            if (!seenFolders.has(topFolder)) {
              seenFolders.add(topFolder);
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
              contentType: file.metadata.contentType ?? 'unknown',
              created: file.metadata.timeCreated ?? '-',
              updated: file.metadata.updated ?? '-',
              originalName:
                file.metadata.metadata?.originalFileName?.toString() ??
                file.name,
              path: file.name,
              isFolder: false,
            });
          }
        }
      }

      return results;
    }, 'List files');
  }

  async downloadFile(fileId: string, folderPath?: string): Promise<Readable> {
    return this.executeWithErrorHandling(async () => {
      const { storage, bucketName } = this.getStorageClient();
      const fullPath = folderPath ? `${folderPath}/${fileId}` : fileId;
      const file = storage.bucket(bucketName).file(fullPath);

      const [exists] = await file.exists();
      if (!exists) {
        throw new BadRequestException(
          `File '${fileId}' not found in Google Cloud Storage`,
        );
      }

      return file.createReadStream();
    }, 'Download file');
  }

  async deleteFile(fileId: string, folderPath?: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const { storage, bucketName } = this.getStorageClient();
      const fullPath = this.constructFilePath(fileId, folderPath);
      await storage.bucket(bucketName).file(fullPath).delete();
    }, 'Delete file');
  }

  async createFolder(folderPath: string): Promise<void> {
    this.validateFolderPath(folderPath);

    return this.executeWithErrorHandling(async () => {
      const { storage, bucketName } = this.getStorageClient();
      const bucket = storage.bucket(bucketName);
      const folderFile = bucket.file(`${folderPath}/`);

      await folderFile.save('', { contentType: 'application/x-directory' });
      this.logger.log(`Folder '${folderPath}' created in Google Cloud Storage`);
    }, 'Create folder');
  }

  async deleteFolder(folderPath: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const { storage, bucketName } = this.getStorageClient();
      await storage
        .bucket(bucketName)
        .deleteFiles({ prefix: `${folderPath}/` });
    }, 'Delete folder');
  }
}
