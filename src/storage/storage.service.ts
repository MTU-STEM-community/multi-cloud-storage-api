import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StorageService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // Add methods to upload, list, and download files
  async uploadFileToProvider(
    file: Express.Multer.File,
    provider: string,
  ): Promise<string> {
    // Handle provider-specific uploads
    switch (provider) {
      case 'google':
        return this.uploadToGoogleCloud(file);
      case 'dropbox':
        return this.uploadToDropbox(file);
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
      const response = await dropbox.filesUpload({
        path: `/${fileName}`,
        contents: file.buffer,
      });

      if (!response.result) {
        throw new Error('Failed to upload file to Dropbox.');
      }

      const linkResponse = await dropbox.sharingCreateSharedLinkWithSettings({
        path: response.result.path_lower!,
      });

      return linkResponse.result.url.replace('?dl=0', '?raw=1'); // Direct link to file
    } catch (error) {
      throw new Error(`Dropbox upload error: ${error.message}`);
    }
  }
}
