import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import { FileListItem } from '../../common/interfaces/cloud-storage.interface';
import { FileValidationPipe } from '../../common/pipes/file-validation.pipe';
import * as crypto from 'crypto';
import { BaseCloudStorageProvider } from '../../common/providers/base-cloud-storage.provider';

@Injectable()
export class BackblazeService extends BaseCloudStorageProvider {
  private readonly B2_API_URL = 'https://api.backblazeb2.com';

  constructor(
    configService: ConfigService,
    prisma: PrismaService,
    encryptionService: EncryptionService,
  ) {
    super(configService, prisma, encryptionService, 'Backblaze');
  }

  protected validateConfiguration(): void {
    this.providerConfigService.getBackblazeConfig();
  }

  protected getCredentialsForEncryption(): Record<string, any> {
    const config = this.providerConfigService.getBackblazeConfig();
    return {
      keyId: config.keyId,
      applicationKey: config.applicationKey,
    };
  }

  s;
  private async getAuthToken(): Promise<{
    authorizationToken: string;
    apiUrl: string;
    downloadUrl: string;
    accountId: string;
  }> {
    const { keyId, applicationKey } = this.getCredentialsForEncryption();

    const credentials = Buffer.from(`${keyId}:${applicationKey}`).toString(
      'base64',
    );

    try {
      const response = await fetch(
        `${this.B2_API_URL}/b2api/v2/b2_authorize_account`,
        {
          method: 'GET',
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        },
      );

      const responseText = await response.text();

      if (!response.ok) {
        let errorDetails = responseText;
        try {
          const errorJson = JSON.parse(responseText);
          errorDetails = `Code: ${errorJson.code}, Message: ${errorJson.message}`;
        } catch {
          // Response is not JSON, use as-is
        }

        throw new Error(
          `Authentication failed (${response.status}): ${errorDetails}`,
        );
      }

      const data = JSON.parse(responseText);
      return {
        authorizationToken: data.authorizationToken,
        apiUrl: data.apiUrl,
        downloadUrl: data.downloadUrl,
        accountId: data.accountId,
      };
    } catch (error) {
      this.logger.error(`B2 authentication error: ${error.message}`);
      if (
        error.message.includes('401') ||
        error.message.includes('unauthorized')
      ) {
        throw new BadRequestException(
          'B2 authentication failed. Please verify your B2_KEY_ID and B2_APPLICATION_KEY are correct.',
        );
      }
      throw new BadRequestException(
        `Failed to authenticate with B2: ${error.message}`,
      );
    }
  }

  private async getBucketId(): Promise<string> {
    const { bucketName } = this.providerConfigService.getBackblazeConfig();

    const { authorizationToken, apiUrl, accountId } = await this.getAuthToken();

    try {
      this.logger.log('Requesting bucket list from B2...');
      const response = await fetch(`${apiUrl}/b2api/v2/b2_list_buckets`, {
        method: 'POST',
        headers: {
          Authorization: authorizationToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: accountId,
          bucketTypes: ['allPrivate', 'allPublic'],
        }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errorDetails = responseText;
        try {
          const errorJson = JSON.parse(responseText);
          errorDetails = `Code: ${errorJson.code}, Message: ${errorJson.message}`;
        } catch {
          // Response is not JSON, use as-is
        }

        throw new Error(
          `List buckets failed (${response.status}): ${errorDetails}`,
        );
      }

      const data = JSON.parse(responseText);

      const bucketNames = data.buckets.map((b: any) => b.bucketName);

      const bucket = data.buckets.find((b: any) => b.bucketName === bucketName);

      if (!bucket) {
        throw new BadRequestException(
          `Bucket '${bucketName}' not found. Available buckets: ${bucketNames.join(', ')}`,
        );
      }
      return bucket.bucketId;
    } catch (error) {
      this.logger.error(`Error getting bucket ID: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to get bucket ID: ${error.message}`,
      );
    }
  }

  private async getUploadUrl(bucketId: string): Promise<{
    uploadUrl: string;
    authorizationToken: string;
  }> {
    const { authorizationToken, apiUrl } = await this.getAuthToken();

    try {
      const response = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
        method: 'POST',
        headers: {
          Authorization: authorizationToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bucketId }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(
          `Get upload URL failed (${response.status}): ${responseText}`,
        );
      }

      const data = JSON.parse(responseText);
      return {
        uploadUrl: data.uploadUrl,
        authorizationToken: data.authorizationToken,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to get upload URL: ${error.message}`,
      );
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    fileName: string,
    folderPath?: string,
  ): Promise<{ url: string; storageName: string }> {
    return this.executeWithErrorHandling(async () => {
      this.validateFileOperation(file);

      const bucketId = await this.getBucketId();
      const { uploadUrl, authorizationToken } =
        await this.getUploadUrl(bucketId);

      const fullFileName = this.constructFilePath(fileName, folderPath);
      const sha1Hash = crypto
        .createHash('sha1')
        .update(file.buffer)
        .digest('hex');

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: authorizationToken,
          'X-Bz-File-Name': encodeURIComponent(fullFileName),
          'Content-Type': file.mimetype || 'application/octet-stream',
          'Content-Length': file.size.toString(),
          'X-Bz-Content-Sha1': sha1Hash,
        },
        body: file.buffer,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      await response.json(); // Process response but don't store unused result
      const { bucketName } = this.providerConfigService.getBackblazeConfig();
      const { downloadUrl } = await this.getAuthToken();

      const fileUrl = `${downloadUrl}/file/${bucketName}/${fullFileName}`;

      return {
        url: fileUrl,
        storageName: fileName,
      };
    }, 'Upload File');
  }

  async listFiles(folderPath?: string): Promise<FileListItem[]> {
    return this.executeWithErrorHandling(async () => {
      const bucketId = await this.getBucketId();
      const { authorizationToken, apiUrl } = await this.getAuthToken();

      const response = await fetch(`${apiUrl}/b2api/v2/b2_list_file_names`, {
        method: 'POST',
        headers: {
          Authorization: authorizationToken,
          'Content-Type': 'application/json',
        },
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
        contentType:
          file.contentType || FileValidationPipe.getMimeType(file.fileName),
        created: new Date(file.uploadTimestamp).toISOString(),
        updated: new Date(file.uploadTimestamp).toISOString(),
        path: file.fileName,
        isFolder: false,
      }));
    }, 'List Files');
  }

  async downloadFile(fileId: string, folderPath?: string): Promise<Buffer> {
    return this.executeWithErrorHandling(async () => {
      const { authorizationToken, apiUrl } = await this.getAuthToken();
      const bucketId = await this.getBucketId();
      const fullFileName = this.constructFilePath(fileId, folderPath);

      const listResponse = await fetch(
        `${apiUrl}/b2api/v2/b2_list_file_names`,
        {
          method: 'POST',
          headers: {
            Authorization: authorizationToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bucketId,
            startFileName: fullFileName,
            maxFileCount: 1,
          }),
        },
      );

      if (!listResponse.ok) {
        const errorText = await listResponse.text();
        throw new Error(`HTTP ${listResponse.status}: ${errorText}`);
      }

      const listData = await listResponse.json();
      const fileInfo = listData.files.find(
        (f: any) => f.fileName === fullFileName,
      );

      if (!fileInfo) {
        throw new BadRequestException(`File '${fileId}' not found`);
      }
      const downloadResponse = await fetch(
        `${apiUrl}/b2api/v2/b2_download_file_by_id`,
        {
          method: 'POST',
          headers: {
            Authorization: authorizationToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileId: fileInfo.fileId,
          }),
        },
      );

      if (!downloadResponse.ok) {
        const errorText = await downloadResponse.text();
        throw new Error(`HTTP ${downloadResponse.status}: ${errorText}`);
      }

      const arrayBuffer = await downloadResponse.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }, 'Download File');
  }

  async deleteFile(fileId: string, folderPath?: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const { authorizationToken, apiUrl } = await this.getAuthToken();
      const bucketId = await this.getBucketId();
      const fullFileName = this.constructFilePath(fileId, folderPath);

      const listResponse = await fetch(
        `${apiUrl}/b2api/v2/b2_list_file_names`,
        {
          method: 'POST',
          headers: {
            Authorization: authorizationToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bucketId,
            startFileName: fullFileName,
            maxFileCount: 1,
          }),
        },
      );

      if (!listResponse.ok) {
        const errorText = await listResponse.text();
        throw new Error(`HTTP ${listResponse.status}: ${errorText}`);
      }

      const listData = await listResponse.json();
      const fileInfo = listData.files.find(
        (f: any) => f.fileName === fullFileName,
      );

      if (!fileInfo) {
        throw new BadRequestException(`File '${fileId}' not found`);
      }

      const deleteResponse = await fetch(
        `${apiUrl}/b2api/v2/b2_delete_file_version`,
        {
          method: 'POST',
          headers: {
            Authorization: authorizationToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileId: fileInfo.fileId,
            fileName: fileInfo.fileName,
          }),
        },
      );

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        throw new Error(`HTTP ${deleteResponse.status}: ${errorText}`);
      }

      this.logger.log(`File deleted successfully: ${fullFileName}`);
    }, 'Delete File');
  }

  async createFolder(folderPath: string): Promise<void> {
    this.validateFolderPath(folderPath);

    return this.executeWithErrorHandling(async () => {
      const bucketId = await this.getBucketId();
      const { uploadUrl, authorizationToken } =
        await this.getUploadUrl(bucketId);

      const folderMarker = `${folderPath}/.b2_folder_placeholder`;
      const emptyBuffer = Buffer.from('');
      const sha1Hash = crypto
        .createHash('sha1')
        .update(emptyBuffer)
        .digest('hex');

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: authorizationToken,
          'X-Bz-File-Name': encodeURIComponent(folderMarker),
          'Content-Type': 'application/octet-stream',
          'Content-Length': '0',
          'X-Bz-Content-Sha1': sha1Hash,
        },
        body: emptyBuffer,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `B2 create folder response: ${response.status} - ${errorText}`,
        );
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      this.logger.log(`Folder '${folderPath}' created in B2`);
    }, 'Create Folder');
  }

  async deleteFolder(folderPath: string): Promise<void> {
    this.validateFolderPath(folderPath);

    return this.executeWithErrorHandling(async () => {
      const bucketId = await this.getBucketId();
      const { authorizationToken, apiUrl } = await this.getAuthToken();

      const response = await fetch(`${apiUrl}/b2api/v2/b2_list_file_names`, {
        method: 'POST',
        headers: {
          Authorization: authorizationToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bucketId,
          prefix: `${folderPath}/`,
          maxFileCount: 10000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      for (const file of data.files) {
        const deleteResponse = await fetch(
          `${apiUrl}/b2api/v2/b2_delete_file_version`,
          {
            method: 'POST',
            headers: {
              Authorization: authorizationToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileId: file.fileId,
              fileName: file.fileName,
            }),
          },
        );

        if (!deleteResponse.ok) {
          const errorText = await deleteResponse.text();
          throw new Error(`HTTP ${deleteResponse.status}: ${errorText}`);
        }
      }
    }, 'Delete Folder');
  }
}
