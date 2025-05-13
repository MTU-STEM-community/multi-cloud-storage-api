import { Injectable, Logger, BadRequestException } from '@nestjs/common';
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
    let storageName: string;

    try {
      if (!file || !file.buffer) {
        throw new BadRequestException('Invalid file data');
      }

      const encryptionSecret = this.configService.get('ENCRYPTION_SECRET');

      if (provider === 'dropbox') {
        const accessToken = this.configService.get('DROPBOX_ACCESS_TOKEN');
        if (!accessToken) {
          throw new BadRequestException(
            'DROPBOX_ACCESS_TOKEN is not set in environment variables',
          );
        }
      } else {
        const apiKey = this.configService.get(
          `${provider.toUpperCase()}_API_KEY`,
        );
        if (!apiKey) {
          throw new BadRequestException(
            `${provider.toUpperCase()}_API_KEY is not set in environment variables`,
          );
        }
      }

      if (!encryptionSecret) {
        throw new BadRequestException(
          'ENCRYPTION_SECRET is not set in environment variables',
        );
      }

      // Generate a timestamped filename for storage
      storageName = `${Date.now()}_${file.originalname}`;

      switch (provider) {
        case 'google':
          url = await this.uploadToGoogleCloud(file, storageName);
          break;
        case 'dropbox':
          url = await this.uploadToDropbox(file, storageName);
          break;
        default:
          throw new BadRequestException('Unsupported provider');
      }

      let encryptedKey;
      if (provider === 'dropbox') {
        const accessToken = this.configService.get('DROPBOX_ACCESS_TOKEN');
        encryptedKey = await this.encryptionService.encrypt(
          accessToken,
          encryptionSecret,
        );
      } else {
        const apiKey = this.configService.get(
          `${provider.toUpperCase()}_API_KEY`,
        );
        encryptedKey = await this.encryptionService.encrypt(
          apiKey,
          encryptionSecret,
        );
      }

      // Save file metadata in database
      const savedFile = await this.prisma.file.create({
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

      return { url, storageName, fileId: savedFile.id };
    } catch (error) {
      this.logger.error(`Upload failed: ${error.message}`);
      throw error;
    }
  }

  async listFilesFromProvider(provider: string): Promise<any[]> {
    try {
      switch (provider) {
        case 'google':
          return this.listFilesFromGoogleCloud();
        case 'dropbox':
          return this.listFilesFromDropbox();
        default:
          throw new BadRequestException('Unsupported provider');
      }
    } catch (error) {
      this.logger.error(`Listing files failed: ${error.message}`);
      throw error;
    }
  }

  private async uploadToGoogleCloud(
    file: Express.Multer.File,
    fileName: string,
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
            originalFileName: file.originalname
          }
        },
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

  private async uploadToDropbox(file: Express.Multer.File, fileName: string): Promise<string> {
    const accessToken = this.configService.get<string>('DROPBOX_ACCESS_TOKEN');

    if (!accessToken) {
      throw new BadRequestException(
        'DROPBOX_ACCESS_TOKEN is missing in environment variables.',
      );
    }

    const dropbox = new Dropbox({ accessToken });

    try {
      if (!file.buffer || !(file.buffer instanceof Buffer)) {
        throw new BadRequestException('Invalid file buffer');
      }

      const response = await dropbox.filesUpload({
        path: `/${fileName}`,
        contents: file.buffer,
        mode: { '.tag': 'add' },
        autorename: true,
      });

      if (!response.result) {
        throw new BadRequestException('Failed to upload file to Dropbox.');
      }

      const linkResponse = await dropbox.sharingCreateSharedLinkWithSettings({
        path: response.result.path_lower!,
      });

      return linkResponse.result.url.replace('?dl=0', '?raw=1');
    } catch (error) {
      throw new BadRequestException(`Dropbox upload error: ${error.message}`);
    }
  }

  private async listFilesFromGoogleCloud(): Promise<any[]> {
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
      originalName: file.metadata.metadata?.originalFileName || file.name,
    }));
  }

  private async listFilesFromDropbox(): Promise<any[]> {
    const accessToken = this.configService.get<string>('DROPBOX_ACCESS_TOKEN');
    if (!accessToken) {
      throw new BadRequestException(
        'DROPBOX_ACCESS_TOKEN is missing in environment variables.',
      );
    }

    const dropbox = new Dropbox({ accessToken });
    const response = await dropbox.filesListFolder({ path: '' });

    return response.result.entries.map((entry) => ({
      name: entry.name,
      path: entry.path_lower,
      size: (entry as any).size || 'Unknown',
      contentType: (entry as any).content_type || 'Unknown',
      modified: (entry as any).server_modified || 'Unknown',
    }));
  }

  async downloadFileFromProvider(
    provider: string,
    fileId: string,
  ): Promise<Buffer> {
    try {
      switch (provider) {
        case 'google':
          return this.downloadFromGoogleCloud(fileId);
        case 'dropbox':
          return this.downloadFromDropbox(fileId);
        default:
          throw new BadRequestException('Unsupported provider');
      }
    } catch (error) {
      this.logger.error(`Download failed: ${error.message}`);
      throw error;
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
      throw new BadRequestException(`Failed to download file from Google Cloud: ${error.message}`);
    }
  }

  private async downloadFromDropbox(fileId: string): Promise<Buffer> {
    const accessToken = this.configService.get<string>('DROPBOX_ACCESS_TOKEN');
    if (!accessToken) {
      throw new BadRequestException(
        'DROPBOX_ACCESS_TOKEN is missing in environment variables.',
      );
    }

    try {
      const dropbox = new Dropbox({ accessToken });
      const response = await dropbox.filesDownload({ path: `/${fileId}` });

      // Handle the file data
      const fileContents = (response.result as any).fileBinary ||
                         (response.result as any).fileContents;

      if (!fileContents) {
        throw new BadRequestException('Failed to retrieve file contents from Dropbox');
      }

      return Buffer.from(fileContents);
    } catch (error) {
      throw new BadRequestException(`Failed to download file from Dropbox: ${error.message}`);
    }
  }

  async deleteFileFromProvider(
    provider: string,
    fileId: string,
  ): Promise<void> {
    try {
      switch (provider) {
        case 'google':
          return this.deleteFromGoogleCloud(fileId);
        case 'dropbox':
          return this.deleteFromDropbox(fileId);
        default:
          throw new BadRequestException('Unsupported provider');
      }
    } catch (error) {
      this.logger.error(`Delete failed: ${error.message}`);
      throw error;
    }
  }

  private async deleteFromGoogleCloud(fileId: string): Promise<void> {
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
      throw new BadRequestException(`Failed to delete file from Google Cloud: ${error.message}`);
    }
  }

  private async deleteFromDropbox(fileId: string): Promise<void> {
    const accessToken = this.configService.get<string>('DROPBOX_ACCESS_TOKEN');
    if (!accessToken) {
      throw new BadRequestException(
        'DROPBOX_ACCESS_TOKEN is missing in environment variables.',
      );
    }

    try {
      const dropbox = new Dropbox({ accessToken });
      await dropbox.filesDeleteV2({ path: `/${fileId}` });
    } catch (error) {
      throw new BadRequestException(`Failed to delete file from Dropbox: ${error.message}`);
    }
  }
}
