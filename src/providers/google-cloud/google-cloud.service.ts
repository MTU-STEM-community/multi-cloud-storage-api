import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import {
  CloudStorageProvider,
  FileListItem,
} from '../../common/interfaces/cloud-storage.interface';

@Injectable()
export class GoogleCloudService implements CloudStorageProvider {
  private readonly logger = new Logger(GoogleCloudService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    fileName: string,
    folderPath?: string,
  ): Promise<{ url: string; storageName: string }> {
    const { Storage } = await import('@google-cloud/storage');

    const projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID');
    const bucketName = this.configService.get<string>(
      'GOOGLE_CLOUD_BUCKET_NAME',
    );
    const keyFilePath = this.configService.get<string>(
      'GOOGLE_CLOUD_KEYFILE_PATH',
    );

    if (!projectId || !bucketName || !keyFilePath) {
      throw new BadRequestException(
        'Google Cloud configuration is missing in environment variables.',
      );
    }

    const storage = new Storage({ projectId, keyFilename: keyFilePath });
    const bucket = storage.bucket(bucketName);

    const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;
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
  }

  async listFiles(folderPath?: string): Promise<FileListItem[]> {
    const { Storage } = await import('@google-cloud/storage');
    const projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID');
    const bucketName = this.configService.get<string>(
      'GOOGLE_CLOUD_BUCKET_NAME',
    );
    const keyFilePath = this.configService.get<string>(
      'GOOGLE_CLOUD_KEYFILE_PATH',
    );

    if (!projectId || !bucketName || !keyFilePath) {
      throw new BadRequestException(
        'Google Cloud configuration is missing in environment variables.',
      );
    }

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
              file.metadata.metadata?.originalFileName?.toString() || file.name,
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
              file.metadata.metadata?.originalFileName?.toString() || file.name,
            path: file.name,
            isFolder: false,
          });
        }
      });

      return results;
    }
  }

  async downloadFile(fileId: string, folderPath?: string): Promise<Buffer> {
    const { Storage } = await import('@google-cloud/storage');
    const projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID');
    const bucketName = this.configService.get<string>(
      'GOOGLE_CLOUD_BUCKET_NAME',
    );
    const keyFilePath = this.configService.get<string>(
      'GOOGLE_CLOUD_KEYFILE_PATH',
    );

    if (!projectId || !bucketName || !keyFilePath) {
      throw new BadRequestException(
        'Google Cloud configuration is missing in environment variables.',
      );
    }

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
  }

  async deleteFile(fileId: string, folderPath?: string): Promise<void> {
    const { Storage } = await import('@google-cloud/storage');
    const projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID');
    const bucketName = this.configService.get<string>(
      'GOOGLE_CLOUD_BUCKET_NAME',
    );
    const keyFilePath = this.configService.get<string>(
      'GOOGLE_CLOUD_KEYFILE_PATH',
    );

    if (!projectId || !bucketName || !keyFilePath) {
      throw new BadRequestException(
        'Google Cloud configuration is missing in environment variables.',
      );
    }

    try {
      const storage = new Storage({ projectId, keyFilename: keyFilePath });

      const fullPath = folderPath ? `${folderPath}/${fileId}` : fileId;
      await storage.bucket(bucketName).file(fullPath).delete();
    } catch (error) {
      throw new BadRequestException(
        `Failed to delete file from Google Cloud: ${error.message}`,
      );
    }
  }

  async createFolder(folderPath: string): Promise<void> {
    const { Storage } = await import('@google-cloud/storage');
    const projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID');
    const bucketName = this.configService.get<string>(
      'GOOGLE_CLOUD_BUCKET_NAME',
    );
    const keyFilePath = this.configService.get<string>(
      'GOOGLE_CLOUD_KEYFILE_PATH',
    );

    if (!projectId || !bucketName || !keyFilePath) {
      throw new BadRequestException(
        'Google Cloud configuration is missing in environment variables.',
      );
    }

    try {
      const storage = new Storage({ projectId, keyFilename: keyFilePath });
      const bucket = storage.bucket(bucketName);
      const folderFile = bucket.file(`${folderPath}/`);

      await folderFile.save('', {
        contentType: 'application/x-directory',
      });

      this.logger.log(`Folder '${folderPath}' created in Google Cloud Storage`);
    } catch (error) {
      throw new BadRequestException(
        `Failed to create folder in Google Cloud: ${error.message}`,
      );
    }
  }

  async saveFileRecord(
    file: Express.Multer.File,
    url: string,
    storageName: string,
    folderPath?: string,
  ): Promise<string> {
    const encryptionSecret = this.configService.get('ENCRYPTION_SECRET');
    if (!encryptionSecret) {
      throw new BadRequestException(
        'ENCRYPTION_SECRET is not set in environment variables',
      );
    }

    const apiKey = this.configService.get('GOOGLE_CLOUD_API_KEY');
    if (!apiKey) {
      throw new BadRequestException(
        'GOOGLE_CLOUD_API_KEY is not set in environment variables',
      );
    }

    const encryptedKey = await this.encryptionService.encrypt(
      apiKey,
      encryptionSecret,
    );

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
            provider: 'google',
            apiKey: encryptedKey,
          },
        },
      },
    });

    return savedFile.id;
  }

  async deleteFolder(folderPath: string): Promise<void> {
    const { Storage } = await import('@google-cloud/storage');
    const projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID');
    const bucketName = this.configService.get<string>(
      'GOOGLE_CLOUD_BUCKET_NAME',
    );
    const keyFilePath = this.configService.get<string>(
      'GOOGLE_CLOUD_KEYFILE_PATH',
    );

    if (!projectId || !bucketName || !keyFilePath) {
      throw new BadRequestException(
        'Google Cloud configuration is missing in environment variables.',
      );
    }

    try {
      const storage = new Storage({ projectId, keyFilename: keyFilePath });
      const bucket = storage.bucket(bucketName);

      await bucket.deleteFiles({
        prefix: `${folderPath}/`,
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to delete folder from Google Cloud: ${error.message}`,
      );
    }
  }
}
