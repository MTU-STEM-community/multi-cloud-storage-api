import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import {
  CloudStorageProvider,
  FileListItem,
} from '../../common/interfaces/cloud-storage.interface';
import { FileValidationPipe } from '../../common/pipes/file-validation.pipe';
import axios from 'axios';

@Injectable()
export class OneDriveService implements CloudStorageProvider {
  private readonly logger = new Logger(OneDriveService.name);
  private readonly baseUrl = 'https://graph.microsoft.com/v1.0/me/drive';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  private async getAccessToken(): Promise<string> {
    const clientId = this.configService.get<string>('ONEDRIVE_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'ONEDRIVE_CLIENT_SECRET',
    );
    const refreshToken = this.configService.get<string>(
      'ONEDRIVE_REFRESH_TOKEN',
    );
    const tenantId =
      this.configService.get<string>('ONEDRIVE_TENANT_ID') || 'common';

    if (!clientId || !clientSecret || !refreshToken) {
      throw new BadRequestException(
        'OneDrive credentials are missing in environment variables.',
      );
    }

    try {
      const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'https://graph.microsoft.com/Files.ReadWrite.All offline_access',
      });

      const response = await axios.post(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return response.data.access_token;
    } catch (error) {
      this.logger.error(`OneDrive token refresh error: ${error.message}`);
      throw new BadRequestException(
        `Failed to refresh OneDrive access token: ${error.message}`,
      );
    }
  }

  private async getApiHeaders(): Promise<{ Authorization: string }> {
    const accessToken = await this.getAccessToken();
    return {
      Authorization: `Bearer ${accessToken}`,
    };
  }

  private async ensureFolderExists(folderPath: string): Promise<void> {
    if (!folderPath) return;

    const headers = await this.getApiHeaders();
    const folders = folderPath.split('/').filter((f) => f);
    let currentPath = '';

    for (const folder of folders) {
      const parentPath = currentPath ? `${currentPath}/${folder}` : folder;

      try {
        await axios.get(`${this.baseUrl}/root:/${parentPath}`, { headers });
        this.logger.log(`Folder '${parentPath}' already exists`);
      } catch (error) {
        if (error.response?.status === 404) {
          const createUrl = currentPath
            ? `${this.baseUrl}/root:/${currentPath}:/children`
            : `${this.baseUrl}/root/children`;

          await axios.post(
            createUrl,
            {
              name: folder,
              folder: {},
              '@microsoft.graph.conflictBehavior': 'rename',
            },
            { headers },
          );
          this.logger.log(`Created folder '${parentPath}'`);
        } else {
          throw error;
        }
      }

      currentPath = parentPath;
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    fileName: string,
    folderPath?: string,
  ): Promise<{ url: string; storageName: string }> {
    try {
      await this.ensureFolderExists(folderPath);
      const headers = await this.getApiHeaders();

      const uploadPath = folderPath
        ? `${this.baseUrl}/root:/${folderPath}/${fileName}:/content`
        : `${this.baseUrl}/root:/${fileName}:/content`;

      this.logger.log(`Uploading file '${fileName}' to OneDrive...`);

      const uploadResponse = await axios.put(uploadPath, file.buffer, {
        headers: {
          ...headers,
          'Content-Type': 'application/octet-stream',
        },
      });

      const shareUrl = `${this.baseUrl}/items/${uploadResponse.data.id}/createLink`;
      const shareResponse = await axios.post(
        shareUrl,
        {
          type: 'view',
          scope: 'anonymous',
        },
        { headers },
      );

      this.logger.log(`File uploaded successfully: ${fileName}`);

      return {
        url: shareResponse.data.link.webUrl,
        storageName: fileName,
      };
    } catch (error) {
      this.logger.error(`OneDrive upload error: ${error.message}`);
      throw new BadRequestException(
        `Failed to upload file to OneDrive: ${error.message}`,
      );
    }
  }

  async listFiles(folderPath?: string): Promise<FileListItem[]> {
    try {
      const headers = await this.getApiHeaders();

      const listUrl = folderPath
        ? `${this.baseUrl}/root:/${folderPath}:/children`
        : `${this.baseUrl}/root/children`;

      const response = await axios.get(listUrl, { headers });

      return response.data.value.map((item: any) => ({
        name: item.name,
        size: item.folder ? '-' : item.size.toString(),
        contentType: item.folder
          ? 'folder'
          : FileValidationPipe.getMimeType(item.name),
        created: item.createdDateTime,
        updated: item.lastModifiedDateTime,
        path: folderPath ? `${folderPath}/${item.name}` : item.name,
        isFolder: !!item.folder,
      }));
    } catch (error) {
      this.logger.error(`OneDrive list files error: ${error.message}`);
      throw new BadRequestException(
        `Failed to list files from OneDrive: ${error.message}`,
      );
    }
  }

  async downloadFile(fileId: string, folderPath?: string): Promise<Buffer> {
    try {
      const headers = await this.getApiHeaders();

      const filePath = folderPath
        ? `${this.baseUrl}/root:/${folderPath}/${fileId}:/content`
        : `${this.baseUrl}/root:/${fileId}:/content`;

      const response = await axios.get(filePath, {
        headers,
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`OneDrive download error: ${error.message}`);
      throw new BadRequestException(
        `Failed to download file from OneDrive: ${error.message}`,
      );
    }
  }

  async deleteFile(fileId: string, folderPath?: string): Promise<void> {
    try {
      const headers = await this.getApiHeaders();

      const filePath = folderPath
        ? `${this.baseUrl}/root:/${folderPath}/${fileId}`
        : `${this.baseUrl}/root:/${fileId}`;

      await axios.delete(filePath, { headers });
      this.logger.log(`File '${fileId}' deleted successfully from OneDrive`);
    } catch (error) {
      this.logger.error(`OneDrive delete error: ${error.message}`);
      throw new BadRequestException(
        `Failed to delete file from OneDrive: ${error.message}`,
      );
    }
  }

  async createFolder(folderPath: string): Promise<void> {
    try {
      if (!folderPath) {
        throw new BadRequestException('Folder path is required');
      }

      await this.ensureFolderExists(folderPath);
      this.logger.log(`Folder '${folderPath}' created in OneDrive`);
    } catch (error) {
      if (error.message?.includes('already exists')) {
        this.logger.log(`Folder '${folderPath}' already exists in OneDrive`);
        return;
      }
      this.logger.error(`OneDrive create folder error: ${error.message}`);
      throw new BadRequestException(
        `Failed to create folder in OneDrive: ${error.message}`,
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

    const clientId = this.configService.get('ONEDRIVE_CLIENT_ID');
    const clientSecret = this.configService.get('ONEDRIVE_CLIENT_SECRET');
    const refreshToken = this.configService.get('ONEDRIVE_REFRESH_TOKEN');
    const tenantId = this.configService.get('ONEDRIVE_TENANT_ID');

    if (!clientId || !clientSecret || !refreshToken) {
      throw new BadRequestException(
        'OneDrive credentials are not set in environment variables',
      );
    }

    const encryptedCredentials = await this.encryptionService.encrypt(
      JSON.stringify({
        clientId,
        clientSecret,
        refreshToken,
        tenantId,
      }),
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
            provider: 'onedrive',
            apiKey: encryptedCredentials,
          },
        },
      },
    });

    return savedFile.id;
  }

  async deleteFolder(folderPath: string): Promise<void> {
    try {
      const headers = await this.getApiHeaders();
      await axios.delete(`${this.baseUrl}/root:/${folderPath}`, { headers });
      this.logger.log(
        `Folder '${folderPath}' deleted successfully from OneDrive`,
      );
    } catch (error) {
      throw new BadRequestException(
        `Failed to delete folder from OneDrive: ${error.message}`,
      );
    }
  }
}
