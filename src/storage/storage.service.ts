import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from 'src/utils/encryption.util';
import { Dropbox } from 'dropbox';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async uploadFileToProvider(file: Express.Multer.File, provider: string) {
    let url: string;
    try {
      switch (provider) {
        case 'google':
          url = await this.uploadToGoogleCloud(file);
          break;
        case 'dropbox':
          url = await this.uploadToDropbox(file);
          break;
        default:
          throw new Error('Unsupported provider');
      }

      const encryptedKey = await this.encryptionService.encrypt(
        this.configService.get(`${provider.toUpperCase()}_API_KEY`),
        this.configService.get('ENCRYPTION_SECRET'),
      );

      await this.prisma.file.create({
        data: {
          name: file.originalname,
          size: file.size,
          type: file.mimetype,
          cloudStorages: {
            create: {
              provider,
              apiKey: encryptedKey,
            },
          },
        },
      });

      return { url };
    } catch (error) {
      this.logger.error(`Upload failed: ${error.message}`);
      throw error;
    }
  }

  async listFilesFromProvider(provider: string): Promise<string[]> {
    switch (provider) {
      case 'google':
        return this.listFilesFromGoogleCloud();
      case 'dropbox':
        return this.listFilesFromDropbox();
      default:
        throw new Error('Unsupported provider');
    }
  }

  private async uploadToGoogleCloud(
    file: Express.Multer.File,
  ): Promise<string> {
    const { Storage } = await import('@google-cloud/storage');

    const projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID');
    const bucketName = this.configService.get<string>(
      'GOOGLE_CLOUD_BUCKET_NAME',
    );
    const keyFilePath = this.configService.get<string>(
      'GOOGLE_CLOUD_KEYFILE_PATH',
    );

    if (!projectId || !bucketName || !keyFilePath) {
      throw new Error(
        'Google Cloud configuration is missing in environment variables.',
      );
    }

    const storage = new Storage({ projectId, keyFilename: keyFilePath });
    const bucket = storage.bucket(bucketName);
    const fileName = `${Date.now()}_${file.originalname}`;
    const blob = bucket.file(fileName);

    return new Promise((resolve, reject) => {
      const stream = blob.createWriteStream({
        metadata: { contentType: file.mimetype },
      });

      stream.on('error', (err) =>
        reject(`Google Cloud upload error: ${err.message}`),
      );
      stream.on('finish', () => {
        resolve(`https://storage.googleapis.com/${bucketName}/${fileName}`);
      });

      stream.end(file.buffer);
    });
  }

  private async uploadToDropbox(file: Express.Multer.File): Promise<string> {
    const { Dropbox } = await import('dropbox');
    const accessToken = this.configService.get<string>('DROPBOX_ACCESS_TOKEN');

    if (!accessToken) {
      throw new Error(
        'Dropbox access token is missing in environment variables.',
      );
    }

    const dropbox = new Dropbox({ accessToken });
    const fileName = `${Date.now()}_${file.originalname}`;

    try {
      const fileContents = file.buffer;
      const response = await dropbox.filesUpload({
        path: `/${fileName}`,
        contents: fileContents,
      });

      if (!response.result) {
        throw new Error('Failed to upload file to Dropbox.');
      }

      const linkResponse = await dropbox.sharingCreateSharedLinkWithSettings({
        path: response.result.path_lower!,
      });

      return linkResponse.result.url.replace('?dl=0', '?raw=1');
    } catch (error) {
      throw new Error(`Dropbox upload error: ${error.message}`);
    }
  }

  private async listFilesFromGoogleCloud(): Promise<string[]> {
    const { Storage } = await import('@google-cloud/storage');
    const projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID');
    const bucketName = this.configService.get<string>(
      'GOOGLE_CLOUD_BUCKET_NAME',
    );
    const keyFilePath = this.configService.get<string>(
      'GOOGLE_CLOUD_KEYFILE_PATH',
    );

    if (!projectId || !bucketName || !keyFilePath) {
      throw new Error(
        'Google Cloud configuration is missing in environment variables.',
      );
    }

    const storage = new Storage({ projectId, keyFilename: keyFilePath });
    const bucket = storage.bucket(bucketName);
    const [files] = await bucket.getFiles();
    return files.map((file) => file.name);
  }

  private async listFilesFromDropbox(): Promise<string[]> {
    const accessToken = this.configService.get<string>('DROPBOX_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error(
        'Dropbox access token is missing in environment variables.',
      );
    }

    const dropbox = new Dropbox({ accessToken });
    const response = await dropbox.filesListFolder({ path: '' });
    return response.result.entries.map((entry) => entry.name);
  }

  async downloadFileFromProvider(
    provider: string,
    fileId: string,
  ): Promise<Buffer> {
    switch (provider) {
      case 'google':
        return this.downloadFromGoogleCloud(fileId);
      case 'dropbox':
        return this.downloadFromDropbox(fileId);
      default:
        throw new Error('Unsupported provider');
    }
  }

  private async downloadFromGoogleCloud(fileId: string): Promise<Buffer> {
    const { Storage } = await import('@google-cloud/storage');
    const projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID');
    const bucketName = this.configService.get<string>(
      'GOOGLE_CLOUD_BUCKET_NAME',
    );
    const keyFilePath = this.configService.get<string>(
      'GOOGLE_CLOUD_KEYFILE_PATH',
    );

    if (!projectId || !bucketName || !keyFilePath) {
      throw new Error(
        'Google Cloud configuration is missing in environment variables.',
      );
    }

    const storage = new Storage({ projectId, keyFilename: keyFilePath });
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileId);
    const [contents] = await file.download();
    return contents;
  }

  private async downloadFromDropbox(fileId: string): Promise<Buffer> {
    const accessToken = this.configService.get<string>('DROPBOX_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error(
        'Dropbox access token is missing in environment variables.',
      );
    }

    const dropbox = new Dropbox({ accessToken });
    const response = await dropbox.filesDownload({ path: `/${fileId}` });

    const fileContents =
      (response.result as any).fileBinary ||
      (response.result as any).fileContents;
    return Buffer.from(fileContents);
  }

  async deleteFileFromProvider(
    provider: string,
    fileId: string,
  ): Promise<void> {
    switch (provider) {
      case 'google':
        return this.deleteFromGoogleCloud(fileId);
      case 'dropbox':
        return this.deleteFromDropbox(fileId);
      default:
        throw new Error('Unsupported provider');
    }
  }

  private async deleteFromGoogleCloud(fileId: string): Promise<void> {
    const { Storage } = await import('@google-cloud/storage');
    const storage = new Storage({
      projectId: this.configService.get('GOOGLE_CLOUD_PROJECT_ID'),
      keyFilename: this.configService.get('GOOGLE_CLOUD_KEYFILE_PATH'),
    });
    await storage
      .bucket(this.configService.get('GOOGLE_CLOUD_BUCKET_NAME'))
      .file(fileId)
      .delete();
  }

  private async deleteFromDropbox(fileId: string): Promise<void> {
    const { Dropbox } = await import('dropbox');
    const dropbox = new Dropbox({
      accessToken: this.configService.get('DROPBOX_ACCESS_TOKEN'),
    });
    await dropbox.filesDeleteV2({ path: `/${fileId}` });
  }
}
