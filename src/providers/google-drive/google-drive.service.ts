import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drive_v3 } from '@googleapis/drive';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import { FileListItem } from '../../common/interfaces/cloud-storage.interface';
import { BaseCloudStorageProvider } from '../../common/providers/base-cloud-storage.provider';
import { ProviderConfigService } from '../../common/providers/provider-config.service';

@Injectable()
export class GoogleDriveService extends BaseCloudStorageProvider {
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
      'GoogleDrive',
    );
  }

  protected validateConfiguration(): void {
    this.providerConfigService.getGoogleDriveConfig();
  }

  protected getCredentialsForEncryption(): Record<string, any> {
    const config = this.providerConfigService.getGoogleDriveConfig();
    return {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      refreshToken: config.refreshToken,
    };
  }

  private async getDriveClient(): Promise<drive_v3.Drive> {
    const { clientId, clientSecret, refreshToken } =
      this.getCredentialsForEncryption();

    try {
      const auth = new OAuth2Client(clientId, clientSecret);
      auth.setCredentials({ refresh_token: refreshToken });
      return google.drive({ version: 'v3', auth });
    } catch (error) {
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
        const folder = await drive.files.create({
          requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId],
          },
          fields: 'id',
        });

        parentId = folder.data.id;
      }
    }

    return parentId;
  }

  async ping(): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const drive = await this.getDriveClient();
      await drive.about.get({ fields: 'user' });
    }, 'Ping');
  }

  async uploadFile(
    file: Express.Multer.File,
    fileName: string,
    folderPath?: string,
  ): Promise<{ url: string; storageName: string }> {
    return this.executeWithErrorHandling(async () => {
      this.validateFileOperation(file);
      const drive = await this.getDriveClient();
      const folderId = await this.getFolderId(folderPath, drive);

      const response = await drive.files.create({
        requestBody: { name: fileName, parents: [folderId] },
        media: { mimeType: file.mimetype, body: Readable.from(file.buffer) },
        fields: 'id,webViewLink',
      });

      if (!response.data.id) {
        throw new BadRequestException('Failed to upload file to Google Drive');
      }

      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: { role: 'reader', type: 'anyone' },
      });

      const fileInfo = await drive.files.get({
        fileId: response.data.id,
        fields: 'webViewLink',
      });

      return { url: fileInfo.data.webViewLink, storageName: fileName };
    }, 'Upload file');
  }

  async listFiles(folderPath?: string): Promise<FileListItem[]> {
    return this.executeWithErrorHandling(async () => {
      const drive = await this.getDriveClient();
      const folderId = await this.getFolderId(folderPath, drive);

      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime)',
        spaces: 'drive',
      });

      if (!response.data.files) return [];

      return response.data.files.map((file) => ({
        name: file.name,
        size: file.size ? parseInt(file.size) : 'Unknown',
        contentType: file.mimeType ?? 'Unknown',
        created: file.createdTime,
        updated: file.modifiedTime,
        path: folderPath ? `${folderPath}/${file.name}` : file.name,
        isFolder: file.mimeType === 'application/vnd.google-apps.folder',
      }));
    }, 'List files');
  }

  async downloadFile(fileId: string, folderPath?: string): Promise<Readable> {
    return this.executeWithErrorHandling(async () => {
      const drive = await this.getDriveClient();
      let driveFileId = fileId;

      if (folderPath) {
        const folderId = await this.getFolderId(folderPath, drive);
        const response = await drive.files.list({
          q: `name = '${fileId}' and '${folderId}' in parents and trashed = false`,
          fields: 'files(id)',
          spaces: 'drive',
        });

        if (response.data.files && response.data.files.length > 0) {
          driveFileId = response.data.files[0].id;
        } else {
          throw new NotFoundException(
            `File '${fileId}' not found in ${folderPath}`,
          );
        }
      }

      const response = await drive.files.get(
        { fileId: driveFileId, alt: 'media' },
        { responseType: 'stream' },
      );

      return response.data as unknown as Readable;
    }, 'Download file');
  }

  async deleteFile(fileId: string, folderPath?: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const drive = await this.getDriveClient();
      let driveFileId = fileId;

      if (folderPath) {
        const folderId = await this.getFolderId(folderPath, drive);
        const response = await drive.files.list({
          q: `name = '${fileId}' and '${folderId}' in parents and trashed = false`,
          fields: 'files(id)',
          spaces: 'drive',
        });

        if (response.data.files && response.data.files.length > 0) {
          driveFileId = response.data.files[0].id;
        } else {
          throw new NotFoundException(
            `File '${fileId}' not found in ${folderPath}`,
          );
        }
      }

      await drive.files.delete({ fileId: driveFileId });
    }, 'Delete file');
  }

  async createFolder(folderPath: string): Promise<void> {
    this.validateFolderPath(folderPath);

    return this.executeWithErrorHandling(async () => {
      const drive = await this.getDriveClient();
      await this.getFolderId(folderPath, drive);
      this.logger.log(`Folder '${folderPath}' created in Google Drive`);
    }, 'Create folder');
  }

  async deleteFolder(folderPath: string): Promise<void> {
    this.validateFolderPath(folderPath);

    return this.executeWithErrorHandling(async () => {
      const drive = await this.getDriveClient();
      const folderId = await this.getFolderId(folderPath, drive);
      await drive.files.delete({ fileId: folderId });
    }, 'Delete folder');
  }
}
