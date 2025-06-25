import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CloudStorageFactoryService } from '../common/providers/cloud-storage-factory.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  FileUploadResult,
  FileListItem,
  EnhancedFileInfo,
  FileSearchResult,
  BulkOperationResult,
} from '../common/interfaces/cloud-storage.interface';
import {
  UpdateFileMetadataDto,
  FileSearchDto,
  BulkDeleteDto,
  CreateFileTagDto,
} from './dto/file-metadata.dto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private readonly cloudStorageFactory: CloudStorageFactoryService,
    private readonly prisma: PrismaService,
  ) {}

  async uploadFileToProvider(
    file: Express.Multer.File,
    provider: string,
    folderPath?: string,
  ): Promise<FileUploadResult> {
    try {
      if (!file || !file.buffer) {
        throw new BadRequestException('Invalid file data');
      }

      const storageProvider =
        await this.cloudStorageFactory.getProvider(provider);
      const storageName = storageProvider.generateStorageName(
        file.originalname,
      );

      if (folderPath && storageProvider.createFolder) {
        await storageProvider.createFolder(folderPath);
      }

      const uploadResult = await storageProvider.uploadFile(
        file,
        storageName,
        folderPath,
      );

      const fileId = await storageProvider.saveFileRecord(
        file,
        uploadResult.url,
        storageName,
        folderPath,
      );

      return {
        fileId,
        url: uploadResult.url,
        originalName: file.originalname,
        storageName,
        folderPath,
        message: `File uploaded successfully. Use fileId '${fileId}' for future operations.`,
      };
    } catch (error) {
      this.logger.error(`Upload failed: ${error.message}`);
      throw error;
    }
  }

  async listFilesFromProvider(
    provider: string,
    folderPath?: string,
  ): Promise<FileListItem[]> {
    try {
      const storageProvider =
        await this.cloudStorageFactory.getProvider(provider);
      return await storageProvider.listFiles(folderPath);
    } catch (error) {
      this.logger.error(`Listing files failed: ${error.message}`);
      throw error;
    }
  }

  async downloadFileFromProvider(
    provider: string,
    fileId: string,
  ): Promise<Buffer> {
    try {
      const file = await this.prisma.file.findUnique({
        where: { id: fileId },
        include: { cloudStorages: true },
      });

      if (!file) {
        throw new BadRequestException('File not found');
      }

      const hasProvider = file.cloudStorages.some(
        cs => cs.provider.toLowerCase() === provider.toLowerCase()
      );

      if (!hasProvider) {
        throw new BadRequestException(`File not found in ${provider} storage`);
      }

      await this.prisma.file.update({
        where: { id: fileId },
        data: {
          downloadCount: { increment: 1 },
          lastAccessedAt: new Date(),
        },
      });

      const storageProvider = await this.cloudStorageFactory.getProvider(provider);
      return await storageProvider.downloadFile(file.storageName, file.path);
    } catch (error) {
      this.logger.error(`Download failed: ${error.message}`);
      throw error;
    }
  }

  async deleteFileFromProvider(
    provider: string,
    fileId: string,
  ): Promise<void> {
    try {
      const file = await this.prisma.file.findUnique({
        where: { id: fileId },
        include: { cloudStorages: true },
      });

      if (!file) {
        throw new BadRequestException('File not found');
      }

      const cloudStorage = file.cloudStorages.find(
        cs => cs.provider.toLowerCase() === provider.toLowerCase()
      );

      if (!cloudStorage) {
        throw new BadRequestException(`File not found in ${provider} storage`);
      }

      const storageProvider = await this.cloudStorageFactory.getProvider(provider);
      await storageProvider.deleteFile(file.storageName, file.path);

      await this.prisma.cloudStorage.delete({
        where: { id: cloudStorage.id },
      });

      const remainingStorages = await this.prisma.cloudStorage.count({
        where: { files: { some: { id: fileId } } },
      });

      if (remainingStorages === 0) {
        await this.prisma.file.update({
          where: { id: fileId },
          data: { deletedAt: new Date() },
        });
      }

      this.logger.log(`File deleted successfully from ${provider}: ${file.name}`);
    } catch (error) {
      this.logger.error(`Delete failed: ${error.message}`);
      throw error;
    }
  }

  async createFolderInProvider(
    provider: string,
    folderPath: string,
  ): Promise<void> {
    if (!folderPath) {
      throw new BadRequestException('Folder path is required');
    }

    try {
      const storageProvider =
        await this.cloudStorageFactory.getProvider(provider);
      if (storageProvider.createFolder) {
        await storageProvider.createFolder(folderPath);
      }
    } catch (error) {
      if (error.message?.includes('already exists')) {
        this.logger.log(`Folder '${folderPath}' already exists in ${provider}`);
        return;
      }
      this.logger.error(`Create folder failed: ${error.message}`);
      throw error;
    }
  }

  async deleteFolderFromProvider(
    provider: string,
    folderPath: string,
  ): Promise<void> {
    if (!folderPath) {
      throw new BadRequestException('Folder path is required');
    }

    try {
      const storageProvider =
        await this.cloudStorageFactory.getProvider(provider);
      await storageProvider.deleteFolder(folderPath);
    } catch (error) {
      this.logger.error(`Delete folder failed: ${error.message}`);
      throw error;
    }
  }


  async updateFileMetadata(
    fileId: string,
    updateData: UpdateFileMetadataDto,
  ): Promise<EnhancedFileInfo> {
    try {
      const updatedFile = await this.prisma.file.update({
        where: { id: fileId },
        data: {
          description: updateData.description,
          tags: updateData.tags,
          metadata: updateData.metadata || {},
          isPublic: updateData.isPublic,
          expiresAt: updateData.expiresAt
            ? new Date(updateData.expiresAt)
            : undefined,
        },
        include: {
          cloudStorages: true,
          fileTags: true,
        },
      });

      return this.mapToEnhancedFileInfo(updatedFile);
    } catch (error) {
      this.logger.error(`Update file metadata failed: ${error.message}`);
      throw new BadRequestException(
        `Failed to update file metadata: ${error.message}`,
      );
    }
  }

  async getFileById(fileId: string): Promise<EnhancedFileInfo> {
    try {
      const file = await this.prisma.file.findUnique({
        where: { id: fileId },
        include: {
          cloudStorages: true,
          fileTags: true,
        },
      });

      if (!file) {
        throw new BadRequestException('File not found');
      }

      await this.prisma.file.update({
        where: { id: fileId },
        data: { lastAccessedAt: new Date() },
      });

      return this.mapToEnhancedFileInfo(file);
    } catch (error) {
      this.logger.error(`Get file failed: ${error.message}`);
      throw error;
    }
  }

  async searchFiles(searchParams: FileSearchDto): Promise<FileSearchResult> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        ...filters
      } = searchParams;
      const skip = (page - 1) * limit;

      const where: any = {
        deletedAt: null,
      };

      if (filters.name) {
        where.name = { contains: filters.name, mode: 'insensitive' };
      }

      if (filters.type) {
        where.type = { contains: filters.type, mode: 'insensitive' };
      }

      if (filters.path) {
        where.path = { contains: filters.path, mode: 'insensitive' };
      }

      if (filters.tags && filters.tags.length > 0) {
        where.tags = { hasSome: filters.tags };
      }

      if (filters.isPublic !== undefined) {
        where.isPublic = filters.isPublic;
      }

      const total = await this.prisma.file.count({ where });

      const files = await this.prisma.file.findMany({
        where,
        include: {
          cloudStorages: true,
          fileTags: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      });

      return {
        files: files.map((file) => this.mapToEnhancedFileInfo(file)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Search files failed: ${error.message}`);
      throw new BadRequestException(`Failed to search files: ${error.message}`);
    }
  }

  async bulkDeleteFiles(
    bulkDeleteData: BulkDeleteDto,
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      successful: 0,
      failed: 0,
      total: bulkDeleteData.fileIds.length,
      errors: [],
    };

    for (const fileId of bulkDeleteData.fileIds) {
      try {
        const file = await this.prisma.file.findUnique({
          where: { id: fileId },
          include: { cloudStorages: true },
        });

        if (!file) {
          result.failed++;
          result.errors.push({ fileId, error: 'File not found' });
          continue;
        }

        if (bulkDeleteData.provider && file.storageName) {
          try {
            const storageProvider = await this.cloudStorageFactory.getProvider(
              bulkDeleteData.provider,
            );
            await storageProvider.deleteFile(file.storageName, file.path);
          } catch (cloudError) {
            this.logger.warn(
              `Failed to delete from cloud storage: ${cloudError.message}`,
            );
          }
        }

        await this.prisma.file.update({
          where: { id: fileId },
          data: { deletedAt: new Date() },
        });

        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({ fileId, error: error.message });
      }
    }

    return result;
  }


  async createFileTag(tagData: CreateFileTagDto) {
    try {
      return await this.prisma.fileTag.create({
        data: tagData,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Tag name already exists');
      }
      throw new BadRequestException(`Failed to create tag: ${error.message}`);
    }
  }

  async getAllFileTags() {
    return await this.prisma.fileTag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async addTagsToFile(fileId: string, tagIds: string[]) {
    try {
      return await this.prisma.file.update({
        where: { id: fileId },
        data: {
          fileTags: {
            connect: tagIds.map((id) => ({ id })),
          },
        },
        include: {
          fileTags: true,
        },
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to add tags to file: ${error.message}`,
      );
    }
  }


  private mapToEnhancedFileInfo(file: any): EnhancedFileInfo {
    return {
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.type,
      url: file.url,
      storageName: file.storageName,
      path: file.path,
      description: file.description,
      tags: file.tags || [],
      metadata: file.metadata || {},
      isPublic: file.isPublic,
      downloadCount: file.downloadCount,
      lastAccessedAt: file.lastAccessedAt,
      expiresAt: file.expiresAt,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      cloudStorages: file.cloudStorages || [],
      fileTags: file.fileTags || [],
    };
  }
}
