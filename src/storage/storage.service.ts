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
        url: uploadResult.url,
        originalName: file.originalname,
        storageName,
        fileId,
        folderPath,
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
    folderPath?: string,
  ): Promise<Buffer> {
    try {
      const storageProvider =
        await this.cloudStorageFactory.getProvider(provider);
      return await storageProvider.downloadFile(fileId, folderPath);
    } catch (error) {
      this.logger.error(`Download failed: ${error.message}`);
      throw error;
    }
  }

  async deleteFileFromProvider(
    provider: string,
    fileId: string,
    folderPath?: string,
  ): Promise<void> {
    try {
      const storageProvider =
        await this.cloudStorageFactory.getProvider(provider);
      return await storageProvider.deleteFile(fileId, folderPath);
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

  // ===== ENHANCED FILE METADATA METHODS =====

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

      // Update last accessed time
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

      // Build where clause
      const where: any = {
        deletedAt: null, // Only non-deleted files
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

      // Get total count
      const total = await this.prisma.file.count({ where });

      // Get files with pagination
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
        // Get file info first
        const file = await this.prisma.file.findUnique({
          where: { id: fileId },
          include: { cloudStorages: true },
        });

        if (!file) {
          result.failed++;
          result.errors.push({ fileId, error: 'File not found' });
          continue;
        }

        // Delete from cloud storage if provider specified
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

        // Soft delete from database
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

  // ===== FILE TAG MANAGEMENT =====

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

  // ===== HELPER METHODS =====

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
