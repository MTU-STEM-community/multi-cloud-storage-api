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
    const blob = bucket.file(fileName);

    return new Promise((resolve, reject) => {
      const stream = blob.createWriteStream({
        metadata: {
          contentType: file.mimetype,
          metadata: {
            originalFileName: file.originalname,
          },
        },
      });

      stream.on('error', (err) =>
        reject(`Google Cloud upload error: ${err.message}`),
      );
      stream.on('finish', () => {
        resolve({
          url: `https://storage.googleapis.com/${bucketName}/${fileName}`,
          storageName: fileName,
        });
      });

      stream.end(file.buffer);
    });
  }

  async listFiles(): Promise<FileListItem[]> {
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
    const [files] = await bucket.getFiles();

    return files.map((file) => ({
      name: file.name,
      size: file.metadata.size,
      contentType: file.metadata.contentType,
      created: file.metadata.timeCreated,
      updated: file.metadata.updated,
      originalName:
        file.metadata.metadata?.originalFileName?.toString() || file.name,
    }));
  }

  async downloadFile(fileId: string): Promise<Buffer> {
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
    const file = bucket.file(fileId);

    try {
      const [contents] = await file.download();
      return contents;
    } catch (error) {
      throw new BadRequestException(
        `Failed to download file from Google Cloud: ${error.message}`,
      );
    }
  }

  async deleteFile(fileId: string): Promise<void> {
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
      await storage.bucket(bucketName).file(fileId).delete();
    } catch (error) {
      throw new BadRequestException(
        `Failed to delete file from Google Cloud: ${error.message}`,
      );
    }
  }

  async saveFileRecord(
    file: Express.Multer.File,
    url: string,
    storageName: string,
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
}
