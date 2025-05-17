import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import {
  CloudStorageProvider,
  FileListItem,
} from '../../common/interfaces/cloud-storage.interface';
import * as megajs from 'megajs';

@Injectable()
export class MegaService implements CloudStorageProvider {
  private readonly logger = new Logger(MegaService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  private async getMegaStorage() {
    const email = this.configService.get<string>('MEGA_EMAIL');
    const password = this.configService.get<string>('MEGA_PASSWORD');

    if (!email || !password) {
      throw new BadRequestException(
        'MEGA_EMAIL or MEGA_PASSWORD is missing in environment variables.',
      );
    }

    this.logger.log('Attempting to authenticate with Mega...');

    try {
      return await new Promise<megajs.Storage>((resolve, reject) => {
        const storage = new megajs.Storage({
          email: email,
          password: password,
          autoload: true,
        });

        storage.on('ready', () => {
          this.logger.log('Mega authentication successful');
          resolve(storage);
        });

        storage.on('error', (err) => {
          this.logger.error(`Mega authentication error: ${err.message}`);
          reject(new Error(`Failed to authenticate with Mega: ${err.message}`));
        });
      });
    } catch (error) {
      this.logger.error(`Mega authentication error: ${error.message}`);
      throw new BadRequestException(
        `Failed to authenticate with Mega: ${error.message}`,
      );
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    fileName: string,
    folderPath?: string,
  ): Promise<{ url: string; storageName: string }> {
    try {
      const storage = await this.getMegaStorage();

      let targetFolder: any = storage.root;
      if (folderPath) {
        const folders = folderPath.split('/');
        for (const folder of folders) {
          if (!folder) continue;

          let found = false;
          for (const child of targetFolder.children) {
            if (child.name === folder && child.directory) {
              targetFolder = child;
              found = true;
              break;
            }
          }

          if (!found) {
            targetFolder = await new Promise((resolve, reject) => {
              targetFolder.mkdir(folder, (err: any, folder: any) => {
                if (err) reject(err);
                else resolve(folder);
              });
            });
          }
        }
      }

      this.logger.log(`Uploading file '${fileName}' to Mega...`);

      const uploadResult: any = await new Promise((resolve, reject) => {
        targetFolder.upload(
          {
            name: fileName,
            size: file.size,
          },
          file.buffer,
          (err: any, uploadedFile: any) => {
            if (err) {
              this.logger.error(`Upload error: ${err.message}`);
              reject(err);
            } else {
              this.logger.log(`File uploaded successfully: ${fileName}`);
              resolve(uploadedFile);
            }
          },
        );
      });

      const shareLink: string = await new Promise((resolve, reject) => {
        uploadResult.link((err: any, url: string) => {
          if (err) {
            this.logger.error(`Error generating share link: ${err.message}`);
            reject(err);
          } else {
            this.logger.log(`Share link generated successfully`);
            resolve(url);
          }
        });
      });

      return {
        url: shareLink,
        storageName: fileName,
      };
    } catch (error) {
      this.logger.error(`Mega upload error: ${error.message}`);
      throw new BadRequestException(
        `Failed to upload file to Mega: ${error.message}`,
      );
    }
  }

  async listFiles(folderPath?: string): Promise<FileListItem[]> {
    try {
      const storage = await this.getMegaStorage();
      let targetFolder: any = storage.root;

      if (folderPath) {
        const folders = folderPath.split('/');
        for (const folder of folders) {
          if (!folder) continue;

          let found = false;
          for (const child of targetFolder.children) {
            if (child.name === folder && child.directory) {
              targetFolder = child;
              found = true;
              break;
            }
          }

          if (!found) {
            throw new BadRequestException(`Folder '${folderPath}' not found`);
          }
        }
      }

      return targetFolder.children.map((item: any) => ({
        name: item.name,
        size: item.directory ? '-' : item.size,
        contentType: item.directory ? 'folder' : this.getMimeType(item.name),
        created: new Date(item.timestamp * 1000).toISOString(),
        path: folderPath ? `${folderPath}/${item.name}` : item.name,
        isFolder: item.directory,
      }));
    } catch (error) {
      this.logger.error(`Mega list files error: ${error.message}`);
      throw new BadRequestException(
        `Failed to list files from Mega: ${error.message}`,
      );
    }
  }

  async downloadFile(fileId: string, folderPath?: string): Promise<Buffer> {
    try {
      const storage = await this.getMegaStorage();
      let targetFolder: any = storage.root;

      if (folderPath) {
        const folders = folderPath.split('/');
        for (const folder of folders) {
          if (!folder) continue;

          let found = false;
          for (const child of targetFolder.children) {
            if (child.name === folder && child.directory) {
              targetFolder = child;
              found = true;
              break;
            }
          }

          if (!found) {
            throw new BadRequestException(`Folder '${folderPath}' not found`);
          }
        }
      }

      const targetFile = targetFolder.children.find(
        (item: any) => item.name === fileId,
      );
      if (!targetFile) {
        throw new BadRequestException(`File '${fileId}' not found`);
      }

      const fileData: Buffer = await new Promise((resolve, reject) => {
        targetFile.download((err: any, data: Buffer) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      return fileData;
    } catch (error) {
      this.logger.error(`Mega download error: ${error.message}`);
      throw new BadRequestException(
        `Failed to download file from Mega: ${error.message}`,
      );
    }
  }

  async deleteFile(fileId: string, folderPath?: string): Promise<void> {
    try {
      const storage = await this.getMegaStorage();
      let targetFolder: any = storage.root;

      if (folderPath) {
        const folders = folderPath.split('/');
        for (const folder of folders) {
          if (!folder) continue;

          let found = false;
          for (const child of targetFolder.children) {
            if (child.name === folder && child.directory) {
              targetFolder = child;
              found = true;
              break;
            }
          }

          if (!found) {
            throw new BadRequestException(`Folder '${folderPath}' not found`);
          }
        }
      }

      const targetFile = targetFolder.children.find(
        (item: any) => item.name === fileId,
      );
      if (!targetFile) {
        throw new BadRequestException(`File '${fileId}' not found`);
      }

      await new Promise<void>((resolve, reject) => {
        targetFile.delete((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (error) {
      this.logger.error(`Mega delete error: ${error.message}`);
      throw new BadRequestException(
        `Failed to delete file from Mega: ${error.message}`,
      );
    }
  }

  async createFolder(folderPath: string): Promise<void> {
    try {
      if (!folderPath) {
        throw new BadRequestException('Folder path is required');
      }

      const storage = await this.getMegaStorage();
      let targetFolder: any = storage.root;
      const folders = folderPath.split('/');

      for (const folder of folders) {
        if (!folder) continue;

        let found = false;
        for (const child of targetFolder.children) {
          if (child.name === folder && child.directory) {
            targetFolder = child;
            found = true;
            break;
          }
        }

        if (!found) {
          targetFolder = await new Promise((resolve, reject) => {
            targetFolder.mkdir(folder, (err: any, folder: any) => {
              if (err) reject(err);
              else resolve(folder);
            });
          });
        }
      }

      this.logger.log(`Folder '${folderPath}' created in Mega`);
    } catch (error) {
      if (error.message?.includes('already exists')) {
        this.logger.log(`Folder '${folderPath}' already exists in Mega`);
        return;
      }
      this.logger.error(`Mega create folder error: ${error.message}`);
      throw new BadRequestException(
        `Failed to create folder in Mega: ${error.message}`,
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

    const email = this.configService.get('MEGA_EMAIL');
    const password = this.configService.get('MEGA_PASSWORD');
    if (!email || !password) {
      throw new BadRequestException(
        'MEGA_EMAIL or MEGA_PASSWORD is not set in environment variables',
      );
    }

    const encryptedCredentials = await this.encryptionService.encrypt(
      JSON.stringify({ email, password }),
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
            provider: 'mega',
            apiKey: encryptedCredentials,
          },
        },
      },
    });

    return savedFile.id;
  }

  private getMimeType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();

    const mimeTypes: { [key: string]: string } = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      txt: 'text/plain',
      zip: 'application/zip',
      mp3: 'audio/mpeg',
      mp4: 'video/mp4',
    };

    return extension && mimeTypes[extension]
      ? mimeTypes[extension]
      : 'application/octet-stream';
  }
}
