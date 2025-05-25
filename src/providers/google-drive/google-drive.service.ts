import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import {
  CloudStorageProvider,
  FileListItem,
} from '../../common/interfaces/cloud-storage.interface';
import { drive_v3 } from '@googleapis/drive';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { Readable } from 'stream';

@Injectable()
export class GoogleDriveService implements CloudStorageProvider {
  private readonly logger = new Logger(GoogleDriveService.name);
  private readonly SCOPES = ['https://www.googleapis.com/auth/drive'];

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  private async getDriveClient(): Promise<drive_v3.Drive> {
    const clientId = this.configService.get<string>('GOOGLE_DRIVE_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'GOOGLE_DRIVE_CLIENT_SECRET',
    );
    const refreshToken = this.configService.get<string>(
      'GOOGLE_DRIVE_REFRESH_TOKEN',
    );

    if (!clientId || !clientSecret || !refreshToken) {
      throw new BadRequestException(
        'Google Drive API credentials are missing in environment variables.',
      );
    }

    try {
      const auth = new OAuth2Client(clientId, clientSecret);
      auth.setCredentials({ refresh_token: refreshToken });

      return google.drive({ version: 'v3', auth });
    } catch (error) {
      this.logger.error(
        `Google Drive client initialization error: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to initialize Google Drive client: ${error.message}`,
      );
    }
  }

  private async getFolderId(
    folderPath: string,
    drive: drive_v3.Drive,
  ): Promise<string> {
    if (!folderPath) return 'root';

    const folderNames = folderPath.split('/').filter((name) => name.length > 0);
    let parentId = 'root';

    for (const folderName of folderNames) {
      const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`;

      const response = await drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      if (response.data.files && response.data.files.length > 0) {
        parentId = response.data.files[0].id;
      } else {
        const folderMetadata = {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        };

        const folder = await drive.files.create({
          requestBody: folderMetadata,
          fields: 'id',
        });

        parentId = folder.data.id;
      }
    }

    return parentId;
  }

  async uploadFile(
    file: Express.Multer.File,
    fileName: string,
    folderPath?: string,
  ): Promise<{ url: string; storageName: string }> {
    try {
      const drive = await this.getDriveClient();
      const folderId = await this.getFolderId(folderPath, drive);

      const fileMetadata = {
        name: fileName,
        parents: [folderId],
      };

      const media = {
        mimeType: file.mimetype,
        body: Readable.from(file.buffer),
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id,webViewLink',
      });

      if (!response.data.id) {
        throw new BadRequestException('Failed to upload file to Google Drive');
      }

      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      const fileInfo = await drive.files.get({
        fileId: response.data.id,
        fields: 'webViewLink',
      });

      return {
        url: fileInfo.data.webViewLink,
        storageName: fileName,
      };
    } catch (error) {
      this.logger.error(`Google Drive upload error: ${error.message}`);
      throw new BadRequestException(
        `Failed to upload file to Google Drive: ${error.message}`,
      );
    }
  }

  async listFiles(folderPath?: string): Promise<FileListItem[]> {
    try {
      const drive = await this.getDriveClient();
      const folderId = await this.getFolderId(folderPath, drive);

      const query = `'${folderId}' in parents and trashed = false`;
      const response = await drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime)',
        spaces: 'drive',
      });

      if (!response.data.files) {
        return [];
      }

      return response.data.files.map((file) => ({
        name: file.name,
        size: file.size ? parseInt(file.size) : 'Unknown',
        contentType: file.mimeType || 'Unknown',
        created: file.createdTime,
        updated: file.modifiedTime,
        path: folderPath ? `${folderPath}/${file.name}` : file.name,
        isFolder: file.mimeType === 'application/vnd.google-apps.folder',
      }));
    } catch (error) {
      this.logger.error(`Google Drive list files error: ${error.message}`);
      throw new BadRequestException(
        `Failed to list files from Google Drive: ${error.message}`,
      );
    }
  }

  async downloadFile(fileId: string, folderPath?: string): Promise<Buffer> {
    try {
      const drive = await this.getDriveClient();

      let driveFileId = fileId;

      if (folderPath) {
        const folderId = await this.getFolderId(folderPath, drive);
        const query = `name = '${fileId}' and '${folderId}' in parents and trashed = false`;

        const response = await drive.files.list({
          q: query,
          fields: 'files(id)',
          spaces: 'drive',
        });

        if (response.data.files && response.data.files.length > 0) {
          driveFileId = response.data.files[0].id;
        } else {
          throw new BadRequestException(
            `File '${fileId}' not found in ${folderPath}`,
          );
        }
      }

      const response = await drive.files.get(
        {
          fileId: driveFileId,
          alt: 'media',
        },
        { responseType: 'arraybuffer' },
      );

      return Buffer.from(response.data as ArrayBuffer);
    } catch (error) {
      this.logger.error(`Google Drive download error: ${error.message}`);
      throw new BadRequestException(
        `Failed to download file from Google Drive: ${error.message}`,
      );
    }
  }

  async deleteFile(fileId: string, folderPath?: string): Promise<void> {
    try {
      const drive = await this.getDriveClient();

      let driveFileId = fileId;

      if (folderPath) {
        const folderId = await this.getFolderId(folderPath, drive);
        const query = `name = '${fileId}' and '${folderId}' in parents and trashed = false`;

        const response = await drive.files.list({
          q: query,
          fields: 'files(id)',
          spaces: 'drive',
        });

        if (response.data.files && response.data.files.length > 0) {
          driveFileId = response.data.files[0].id;
        } else {
          throw new BadRequestException(
            `File '${fileId}' not found in ${folderPath}`,
          );
        }
      }

      await drive.files.delete({
        fileId: driveFileId,
      });
    } catch (error) {
      this.logger.error(`Google Drive delete error: ${error.message}`);
      throw new BadRequestException(
        `Failed to delete file from Google Drive: ${error.message}`,
      );
    }
  }

  async createFolder(folderPath: string): Promise<void> {
    try {
      if (!folderPath) {
        throw new BadRequestException('Folder path is required');
      }

      const drive = await this.getDriveClient();
      await this.getFolderId(folderPath, drive);
      this.logger.log(`Folder '${folderPath}' created in Google Drive`);
    } catch (error) {
      if (error.message?.includes('already exists')) {
        this.logger.log(
          `Folder '${folderPath}' already exists in Google Drive`,
        );
        return;
      }
      this.logger.error(`Google Drive create folder error: ${error.message}`);
      throw new BadRequestException(
        `Failed to create folder in Google Drive: ${error.message}`,
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

    const clientId = this.configService.get('GOOGLE_DRIVE_CLIENT_ID');
    const clientSecret = this.configService.get('GOOGLE_DRIVE_CLIENT_SECRET');
    const refreshToken = this.configService.get('GOOGLE_DRIVE_REFRESH_TOKEN');

    if (!clientId || !clientSecret || !refreshToken) {
      throw new BadRequestException(
        'Google Drive API credentials are not set in environment variables',
      );
    }

    const encryptedCredentials = await this.encryptionService.encrypt(
      JSON.stringify({ clientId, clientSecret, refreshToken }),
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
            provider: 'google-drive',
            apiKey: encryptedCredentials,
          },
        },
      },
    });

    return savedFile.id;
  }

  async deleteFolder(folderPath: string): Promise<void> {
    try {
      const drive = await this.getDriveClient();
      const folderId = await this.getFolderId(folderPath, drive);

      await drive.files.delete({
        fileId: folderId,
      });
    } catch (error) {
      this.logger.error(`Google Drive folder deletion error: ${error.message}`);
      throw new BadRequestException(
        `Failed to delete folder from Google Drive: ${error.message}`,
      );
    }
  }
}
