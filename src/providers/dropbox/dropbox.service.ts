import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import { Dropbox } from 'dropbox';
import {
  CloudStorageProvider,
  FileListItem,
} from '../../common/interfaces/cloud-storage.interface';

@Injectable()
export class DropboxService implements CloudStorageProvider {
  private readonly logger = new Logger(DropboxService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    fileName: string,
    folderPath?: string,
  ): Promise<{ url: string; storageName: string }> {
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

      const fullPath = folderPath
        ? `/${folderPath}/${fileName}`
        : `/${fileName}`;

      const response = await dropbox.filesUpload({
        path: fullPath,
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

      return {
        url: linkResponse.result.url.replace('?dl=0', '?raw=1'),
        storageName: fileName,
      };
    } catch (error) {
      throw new BadRequestException(`Dropbox upload error: ${error.message}`);
    }
  }

  async listFiles(folderPath?: string): Promise<FileListItem[]> {
    const accessToken = this.configService.get<string>('DROPBOX_ACCESS_TOKEN');
    if (!accessToken) {
      throw new BadRequestException(
        'DROPBOX_ACCESS_TOKEN is missing in environment variables.',
      );
    }

    const dropbox = new Dropbox({ accessToken });
    const path = folderPath ? `/${folderPath}` : '';
    const response = await dropbox.filesListFolder({ path });

    return response.result.entries.map((entry) => ({
      name: entry.name,
      path: entry.path_lower,
      size: (entry as any).size || 'Unknown',
      contentType: (entry as any).content_type || 'Unknown',
      modified: (entry as any).server_modified || 'Unknown',
      isFolder: entry['.tag'] === 'folder',
    }));
  }

  async downloadFile(fileId: string, folderPath?: string): Promise<Buffer> {
    const accessToken = this.configService.get<string>('DROPBOX_ACCESS_TOKEN');
    if (!accessToken) {
      throw new BadRequestException(
        'DROPBOX_ACCESS_TOKEN is missing in environment variables.',
      );
    }

    try {
      const dropbox = new Dropbox({ accessToken });
      const path = folderPath ? `/${folderPath}/${fileId}` : `/${fileId}`;
      const response = await dropbox.filesDownload({ path });

      const fileContents =
        (response.result as any).fileBinary ||
        (response.result as any).fileContents;

      if (!fileContents) {
        throw new BadRequestException(
          'Failed to retrieve file contents from Dropbox',
        );
      }

      return Buffer.from(fileContents);
    } catch (error) {
      throw new BadRequestException(
        `Failed to download file from Dropbox: ${error.message}`,
      );
    }
  }

  async deleteFile(fileId: string, folderPath?: string): Promise<void> {
    const accessToken = this.configService.get<string>('DROPBOX_ACCESS_TOKEN');
    if (!accessToken) {
      throw new BadRequestException(
        'DROPBOX_ACCESS_TOKEN is missing in environment variables.',
      );
    }

    try {
      const dropbox = new Dropbox({ accessToken });
      const path = folderPath ? `/${folderPath}/${fileId}` : `/${fileId}`;
      await dropbox.filesDeleteV2({ path });
    } catch (error) {
      throw new BadRequestException(
        `Failed to delete file from Dropbox: ${error.message}`,
      );
    }
  }

  async createFolder(folderPath: string): Promise<void> {
    const accessToken = this.configService.get<string>('DROPBOX_ACCESS_TOKEN');
    if (!accessToken) {
      throw new BadRequestException(
        'DROPBOX_ACCESS_TOKEN is missing in environment variables.',
      );
    }

    try {
      const dropbox = new Dropbox({ accessToken });
      await dropbox.filesCreateFolderV2({ path: `/${folderPath}` });
    } catch (error) {
      if (error.status === 409) {
        this.logger.log(`Folder '${folderPath}' already exists in Dropbox`);
        return;
      }
      throw new BadRequestException(
        `Failed to create folder in Dropbox: ${error.message}`,
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

    const accessToken = this.configService.get('DROPBOX_ACCESS_TOKEN');
    if (!accessToken) {
      throw new BadRequestException(
        'DROPBOX_ACCESS_TOKEN is not set in environment variables',
      );
    }

    const encryptedToken = await this.encryptionService.encrypt(
      accessToken,
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
            provider: 'dropbox',
            apiKey: encryptedToken,
          },
        },
      },
    });

    return savedFile.id;
  }

  async deleteFolder(folderPath: string): Promise<void> {
    const accessToken = this.configService.get<string>('DROPBOX_ACCESS_TOKEN');
    if (!accessToken) {
      throw new BadRequestException(
        'DROPBOX_ACCESS_TOKEN is missing in environment variables.',
      );
    }

    try {
      const dropbox = new Dropbox({ accessToken });
      await dropbox.filesDeleteV2({ path: `/${folderPath}` });
    } catch (error) {
      throw new BadRequestException(
        `Failed to delete folder from Dropbox: ${error.message}`,
      );
    }
  }
}
