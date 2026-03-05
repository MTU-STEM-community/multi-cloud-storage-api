import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PassThrough, Readable } from 'stream';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import { ProviderConfigService } from '../../common/providers/provider-config.service';
import { FileListItem } from '../../common/interfaces/cloud-storage.interface';
import { FileValidationPipe } from '../../common/pipes/file-validation.pipe';
import { BaseCloudStorageProvider } from '../../common/providers/base-cloud-storage.provider';

interface B2AuthCache {
  authorizationToken: string;
  apiUrl: string;
  downloadUrl: string;
  accountId: string;
  expiresAt: number;
}

@Injectable()
export class BackblazeService extends BaseCloudStorageProvider {
  private readonly B2_API_URL = 'https://api.backblazeb2.com';
  private readonly AUTH_CACHE_TTL = 23 * 60 * 60 * 1000;
  private authCache: B2AuthCache | null = null;

  constructor(
    configService: ConfigService,
    prisma: PrismaService,
    encryptionService: EncryptionService,
    providerConfigService: ProviderConfigService,
  ) {
    super(configService, prisma, encryptionService, providerConfigService, 'Backblaze');
  }

  protected validateConfiguration(): void {
    this.providerConfigService.getBackblazeConfig();
  }

  protected getCredentialsForEncryption(): Record<string, any> {
    const config = this.providerConfigService.getBackblazeConfig();
    return { keyId: config.keyId, applicationKey: config.applicationKey };
  }

  private async getAuthToken(): Promise<B2AuthCache> {
    if (this.authCache && Date.now() < this.authCache.expiresAt) {
      return this.authCache;
    }

    const { keyId, applicationKey } = this.getCredentialsForEncryption();
    const credentials = Buffer.from(`${keyId}:${applicationKey}`).toString('base64');

    try {
      const response = await fetch(`${this.B2_API_URL}/b2api/v2/b2_authorize_account`, {
        method: 'GET',
        headers: { Authorization: `Basic ${credentials}` },
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errorDetails = responseText;
        try {
          const errorJson = JSON.parse(responseText);
          errorDetails = `Code: ${errorJson.code}, Message: ${errorJson.message}`;
        } catch {
          // use raw text
        }
        throw new Error(`Authentication failed (${response.status}): ${errorDetails}`);
      }

      const data = JSON.parse(responseText);

      this.authCache = {
        authorizationToken: data.authorizationToken,
        apiUrl: data.apiUrl,
        downloadUrl: data.downloadUrl,
        accountId: data.accountId,
        expiresAt: Date.now() + this.AUTH_CACHE_TTL,
      };

      return this.authCache;
    } catch (error) {
      this.authCache = null;
      throw new BadRequestException(`Failed to authenticate with B2: ${error.message}`);
    }
  }

  private async getBucketId(): Promise<string> {
    const { bucketName } = this.providerConfigService.getBackblazeConfig();
    const { authorizationToken, apiUrl, accountId } = await this.getAuthToken();

    const response = await fetch(`${apiUrl}/b2api/v2/b2_list_buckets`, {
      method: 'POST',
      headers: { Authorization: authorizationToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, bucketTypes: ['allPrivate', 'allPublic'] }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new BadRequestException(
        `List buckets failed (${response.status}): ${responseText}`,
      );
    }

    const data = JSON.parse(responseText);
    const bucket = data.buckets.find((b: any) => b.bucketName === bucketName);

    if (!bucket) {
      const bucketNames = data.buckets.map((b: any) => b.bucketName);
      throw new NotFoundException(
        `Bucket '${bucketName}' not found. Available: ${bucketNames.join(', ')}`,
      );
    }

    return bucket.bucketId;
  }

  private async getUploadUrl(bucketId: string): Promise<{
    uploadUrl: string;
    authorizationToken: string;
  }> {
    const { authorizationToken, apiUrl } = await this.getAuthToken();

    const response = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: 'POST',
      headers: { Authorization: authorizationToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucketId }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new BadRequestException(
        `Get upload URL failed (${response.status}): ${responseText}`,
      );
    }

    const data = JSON.parse(responseText);
    return { uploadUrl: data.uploadUrl, authorizationToken: data.authorizationToken };
  }

  async ping(): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      await this.getAuthToken();
    }, 'Ping');
  }

  async uploadFile(
    file: Express.Multer.File,
    fileName: string,
    folderPath?: string,
  ): Promise<{ url: string; storageName: string }> {
    return this.executeWithErrorHandling(async () => {
      this.validateFileOperation(file);

      const bucketId = await this.getBucketId();
      const { uploadUrl, authorizationToken } = await this.getUploadUrl(bucketId);
      const fullFileName = this.constructFilePath(fileName, folderPath);
      const sha1Hash = crypto.createHash('sha1').update(file.buffer).digest('hex');

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: authorizationToken,
          'X-Bz-File-Name': encodeURIComponent(fullFileName),
          'Content-Type': file.mimetype ?? 'application/octet-stream',
          'Content-Length': file.size.toString(),
          'X-Bz-Content-Sha1': sha1Hash,
        },
        body: new Uint8Array(file.buffer),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      await response.json();

      const { bucketName } = this.providerConfigService.getBackblazeConfig();
      const { downloadUrl } = await this.getAuthToken();

      return {
        url: `${downloadUrl}/file/${bucketName}/${fullFileName}`,
        storageName: fileName,
      };
    }, 'Upload file');
  }

  async listFiles(folderPath?: string): Promise<FileListItem[]> {
    return this.executeWithErrorHandling(async () => {
      const bucketId = await this.getBucketId();
      const { authorizationToken, apiUrl } = await this.getAuthToken();

      const response = await fetch(`${apiUrl}/b2api/v2/b2_list_file_names`, {
        method: 'POST',
        headers: { Authorization: authorizationToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucketId,
          startFileName: folderPath ? `${folderPath}/` : undefined,
          prefix: folderPath ? `${folderPath}/` : undefined,
          maxFileCount: 1000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      return data.files.map((file: any) => ({
        name: file.fileName.split('/').pop(),
        size: file.size,
        contentType: file.contentType ?? FileValidationPipe.getMimeType(file.fileName),
        created: new Date(file.uploadTimestamp).toISOString(),
        updated: new Date(file.uploadTimestamp).toISOString(),
        path: file.fileName,
        isFolder: false,
      }));
    }, 'List files');
  }

  async downloadFile(fileId: string, folderPath?: string): Promise<Readable> {
    return this.executeWithErrorHandling(async () => {
      const { authorizationToken, apiUrl } = await this.getAuthToken();
      const bucketId = await this.getBucketId();
      const fullFileName = this.constructFilePath(fileId, folderPath);

      const listResponse = await fetch(`${apiUrl}/b2api/v2/b2_list_file_names`, {
        method: 'POST',
        headers: { Authorization: authorizationToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucketId, startFileName: fullFileName, maxFileCount: 1 }),
      });

      if (!listResponse.ok) {
        throw new Error(`HTTP ${listResponse.status}: ${await listResponse.text()}`);
      }

      const listData = await listResponse.json();
      const fileInfo = listData.files.find((f: any) => f.fileName === fullFileName);

      if (!fileInfo) {
        throw new NotFoundException(`File '${fileId}' not found`);
      }

      const downloadResponse = await fetch(`${apiUrl}/b2api/v2/b2_download_file_by_id`, {
        method: 'POST',
        headers: { Authorization: authorizationToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: fileInfo.fileId }),
      });

      if (!downloadResponse.ok) {
        throw new Error(`HTTP ${downloadResponse.status}: ${await downloadResponse.text()}`);
      }

      const passThrough = new PassThrough();
      const reader = downloadResponse.body.getReader();

      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              passThrough.end();
              break;
            }
            passThrough.push(Buffer.from(value));
          }
        } catch (err) {
          passThrough.destroy(err);
        }
      })();

      return passThrough;
    }, 'Download file');
  }

  async deleteFile(fileId: string, folderPath?: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const { authorizationToken, apiUrl } = await this.getAuthToken();
      const bucketId = await this.getBucketId();
      const fullFileName = this.constructFilePath(fileId, folderPath);

      const listResponse = await fetch(`${apiUrl}/b2api/v2/b2_list_file_names`, {
        method: 'POST',
        headers: { Authorization: authorizationToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucketId, startFileName: fullFileName, maxFileCount: 1 }),
      });

      if (!listResponse.ok) {
        throw new Error(`HTTP ${listResponse.status}: ${await listResponse.text()}`);
      }

      const listData = await listResponse.json();
      const fileInfo = listData.files.find((f: any) => f.fileName === fullFileName);

      if (!fileInfo) {
        throw new NotFoundException(`File '${fileId}' not found`);
      }

      const deleteResponse = await fetch(`${apiUrl}/b2api/v2/b2_delete_file_version`, {
        method: 'POST',
        headers: { Authorization: authorizationToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: fileInfo.fileId, fileName: fileInfo.fileName }),
      });

      if (!deleteResponse.ok) {
        throw new Error(`HTTP ${deleteResponse.status}: ${await deleteResponse.text()}`);
      }

      this.logger.log(`File deleted from B2: ${fullFileName}`);
    }, 'Delete file');
  }

  async createFolder(folderPath: string): Promise<void> {
    this.validateFolderPath(folderPath);

    return this.executeWithErrorHandling(async () => {
      const bucketId = await this.getBucketId();
      const { uploadUrl, authorizationToken } = await this.getUploadUrl(bucketId);
      const folderMarker = `${folderPath}/.b2_folder_placeholder`;
      const emptyBuffer = Buffer.from('');
      const sha1Hash = crypto.createHash('sha1').update(emptyBuffer).digest('hex');

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: authorizationToken,
          'X-Bz-File-Name': encodeURIComponent(folderMarker),
          'Content-Type': 'application/octet-stream',
          'Content-Length': '0',
          'X-Bz-Content-Sha1': sha1Hash,
        },
        body: new Uint8Array(0),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      this.logger.log(`Folder created in B2: ${folderPath}`);
    }, 'Create folder');
  }

  async deleteFolder(folderPath: string): Promise<void> {
    this.validateFolderPath(folderPath);

    return this.executeWithErrorHandling(async () => {
      const bucketId = await this.getBucketId();
      const { authorizationToken, apiUrl } = await this.getAuthToken();

      const response = await fetch(`${apiUrl}/b2api/v2/b2_list_file_names`, {
        method: 'POST',
        headers: { Authorization: authorizationToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucketId, prefix: `${folderPath}/`, maxFileCount: 10000 }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();

      for (const file of data.files) {
        const deleteResponse = await fetch(`${apiUrl}/b2api/v2/b2_delete_file_version`, {
          method: 'POST',
          headers: { Authorization: authorizationToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: file.fileId, fileName: file.fileName }),
        });

        if (!deleteResponse.ok) {
          throw new Error(`HTTP ${deleteResponse.status}: ${await deleteResponse.text()}`);
        }
      }
    }, 'Delete folder');
  }
}
