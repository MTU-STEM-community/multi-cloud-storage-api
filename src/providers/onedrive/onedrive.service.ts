import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Readable } from 'stream';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import { BaseCloudStorageProvider } from '../../common/providers/base-cloud-storage.provider';
import { FileListItem } from '../../common/interfaces/cloud-storage.interface';
import { FileValidationPipe } from '../../common/pipes/file-validation.pipe';
import { ProviderConfigService } from '../../common/providers/provider-config.service';

@Injectable()
export class OneDriveService extends BaseCloudStorageProvider {
  private readonly baseUrl = 'https://graph.microsoft.com/v1.0/me/drive';

  constructor(
    configService: ConfigService,
    prisma: PrismaService,
    encryptionService: EncryptionService,
    providerConfigService: ProviderConfigService,
  ) {
    super(configService, prisma, encryptionService, providerConfigService, 'OneDrive');
  }

  protected validateConfiguration(): void {
    this.providerConfigService.getOneDriveConfig();
  }

  protected getCredentialsForEncryption(): Record<string, any> {
    const config = this.providerConfigService.getOneDriveConfig();
    return {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      refreshToken: config.refreshToken,
      tenantId: config.tenantId,
    };
  }

  private async getAccessToken(): Promise<string> {
    const { clientId, clientSecret, refreshToken, tenantId } =
      this.getCredentialsForEncryption();

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
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return response.data.access_token;
    } catch (error) {
      throw new BadRequestException(
        `Failed to refresh OneDrive access token: ${error.message}`,
      );
    }
  }

  private async getApiHeaders(): Promise<{ Authorization: string }> {
    const accessToken = await this.getAccessToken();
    return { Authorization: `Bearer ${accessToken}` };
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
      } catch (error) {
        if (error.response?.status === 404) {
          const createUrl = currentPath
            ? `${this.baseUrl}/root:/${currentPath}:/children`
            : `${this.baseUrl}/root/children`;

          await axios.post(
            createUrl,
            { name: folder, folder: {}, '@microsoft.graph.conflictBehavior': 'rename' },
            { headers },
          );
        } else {
          throw error;
        }
      }

      currentPath = parentPath;
    }
  }

  async ping(): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const headers = await this.getApiHeaders();
      await axios.get(this.baseUrl, { headers });
    }, 'Ping');
  }

  async uploadFile(
    file: Express.Multer.File,
    fileName: string,
    folderPath?: string,
  ): Promise<{ url: string; storageName: string }> {
    return this.executeWithErrorHandling(async () => {
      this.validateFileOperation(file);

      await this.ensureFolderExists(folderPath);
      const headers = await this.getApiHeaders();
      const filePath = this.constructFilePath(fileName, folderPath);

      const uploadResponse = await axios.put(
        `${this.baseUrl}/root:/${filePath}:/content`,
        file.buffer,
        { headers: { ...headers, 'Content-Type': 'application/octet-stream' } },
      );

      const shareResponse = await axios.post(
        `${this.baseUrl}/items/${uploadResponse.data.id}/createLink`,
        { type: 'view', scope: 'anonymous' },
        { headers },
      );

      return { url: shareResponse.data.link.webUrl, storageName: fileName };
    }, 'Upload file');
  }

  async listFiles(folderPath?: string): Promise<FileListItem[]> {
    return this.executeWithErrorHandling(async () => {
      const headers = await this.getApiHeaders();
      const listUrl = folderPath
        ? `${this.baseUrl}/root:/${folderPath}:/children`
        : `${this.baseUrl}/root/children`;

      const response = await axios.get(listUrl, { headers });

      return response.data.value.map((item: any) => ({
        name: item.name,
        size: item.folder ? '-' : item.size.toString(),
        contentType: item.folder ? 'folder' : FileValidationPipe.getMimeType(item.name),
        created: item.createdDateTime,
        updated: item.lastModifiedDateTime,
        path: folderPath ? `${folderPath}/${item.name}` : item.name,
        isFolder: !!item.folder,
      }));
    }, 'List files');
  }

  async downloadFile(fileId: string, folderPath?: string): Promise<Readable> {
    return this.executeWithErrorHandling(async () => {
      const headers = await this.getApiHeaders();
      const filePath = this.constructFilePath(fileId, folderPath);

      const response = await axios.get(`${this.baseUrl}/root:/${filePath}:/content`, {
        headers,
        responseType: 'stream',
      });

      return response.data as Readable;
    }, 'Download file');
  }

  async deleteFile(fileId: string, folderPath?: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const headers = await this.getApiHeaders();
      const filePath = this.constructFilePath(fileId, folderPath);
      await axios.delete(`${this.baseUrl}/root:/${filePath}`, { headers });
    }, 'Delete file');
  }

  async createFolder(folderPath: string): Promise<void> {
    this.validateFolderPath(folderPath);

    return this.executeWithErrorHandling(async () => {
      await this.ensureFolderExists(folderPath);
      this.logger.log(`Folder '${folderPath}' created in OneDrive`);
    }, 'Create folder');
  }

  async deleteFolder(folderPath: string): Promise<void> {
    this.validateFolderPath(folderPath);

    return this.executeWithErrorHandling(async () => {
      const headers = await this.getApiHeaders();
      const normalizedPath = this.normalizeFolderPath(folderPath);
      await axios.delete(`${this.baseUrl}/root:/${normalizedPath}`, { headers });
    }, 'Delete folder');
  }
}
