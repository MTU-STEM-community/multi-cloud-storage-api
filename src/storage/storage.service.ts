import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Readable } from 'stream';
import { CloudStorageFactoryService } from '../common/providers/cloud-storage-factory.service';
import {
  BulkOperationResult,
  BulkUploadResult,
  EnhancedFileInfo,
  FileListItem,
  FileSearchResult,
  FileUploadResult,
  MultiProviderDeleteResult,
  MultiProviderUploadResult,
} from '../common/interfaces/cloud-storage.interface';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../utils/encryption.util';
import { ConfigService } from '@nestjs/config';
import { CleanupService } from './services/cleanup.service';
import {
  AddTagsToFileDto,
  BulkDeleteDto,
  BulkUploadMetadataDto,
  CreateFileTagDto,
  FileSearchDto,
  MultiProviderDeleteDto,
  MultiProviderUploadDto,
  UpdateFileMetadataDto,
} from './dto/file-metadata.dto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private readonly cloudStorageFactory: CloudStorageFactoryService,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
    private readonly cleanupService: CleanupService,
  ) {}

  async uploadFileToProvider(
    file: Express.Multer.File,
    provider: string,
    userId: string,
    folderPath?: string,
  ): Promise<FileUploadResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Invalid file data');
    }

    const storageProvider = await this.cloudStorageFactory.getProvider(provider);
    const storageName = storageProvider.generateStorageName(file.originalname);

    if (folderPath && storageProvider.createFolder) {
      await storageProvider.createFolder(folderPath);
    }

    const uploadResult = await storageProvider.uploadFile(file, storageName, folderPath);
    const fileId = await storageProvider.saveFileRecord(
      file,
      uploadResult.url,
      storageName,
      folderPath,
      userId,
    );

    return {
      fileId,
      url: uploadResult.url,
      originalName: file.originalname,
      storageName,
      folderPath,
      message: `File uploaded successfully. Use fileId '${fileId}' for future operations.`,
    };
  }

  async listFilesFromProvider(provider: string, folderPath?: string): Promise<FileListItem[]> {
    const storageProvider = await this.cloudStorageFactory.getProvider(provider);
    return storageProvider.listFiles(folderPath);
  }

  async downloadFileFromProvider(
    provider: string,
    fileId: string,
    requestingUserId: string,
  ): Promise<Readable> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { cloudStorages: true },
    });

    if (!file) {
      throw new NotFoundException(`File '${fileId}' not found`);
    }

    if (!file.isPublic && file.userId && file.userId !== requestingUserId) {
      throw new ForbiddenException('You do not have access to this file');
    }

    const hasProvider = file.cloudStorages.some(
      (cs) => cs.provider.toLowerCase() === provider.toLowerCase(),
    );

    if (!hasProvider) {
      throw new NotFoundException(`File '${fileId}' not found in ${provider} storage`);
    }

    this.prisma.file
      .update({
        where: { id: fileId },
        data: { downloadCount: { increment: 1 }, lastAccessedAt: new Date() },
      })
      .catch((err) => {
        this.logger.warn(`Failed to update download stats for file ${fileId}: ${err.message}`);
      });

    const storageProvider = await this.cloudStorageFactory.getProvider(provider);
    return storageProvider.downloadFile(file.storageName, file.path);
  }

  async deleteFileFromProvider(
    provider: string,
    fileId: string,
    requestingUserId: string,
  ): Promise<void> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { cloudStorages: true },
    });

    if (!file) {
      throw new NotFoundException(`File '${fileId}' not found`);
    }

    if (file.userId && file.userId !== requestingUserId) {
      throw new ForbiddenException('You do not have permission to delete this file');
    }

    const cloudStorage = file.cloudStorages.find(
      (cs) => cs.provider.toLowerCase() === provider.toLowerCase(),
    );

    if (!cloudStorage) {
      throw new NotFoundException(`File '${fileId}' not found in ${provider} storage`);
    }

    const storageProvider = await this.cloudStorageFactory.getProvider(provider);
    await storageProvider.deleteFile(file.storageName, file.path);

    await this.prisma.$transaction(async (tx) => {
      await tx.cloudStorage.delete({ where: { id: cloudStorage.id } });

      const remaining = await tx.cloudStorage.count({
        where: { files: { some: { id: fileId } } },
      });

      if (remaining === 0) {
        await tx.file.update({
          where: { id: fileId },
          data: { deletedAt: new Date() },
        });
      }
    });

    this.logger.log(`File deleted from ${provider}: ${file.name}`);
  }

  async createFolderInProvider(provider: string, folderPath: string): Promise<void> {
    if (!folderPath) {
      throw new BadRequestException('Folder path is required');
    }

    const storageProvider = await this.cloudStorageFactory.getProvider(provider);

    if (storageProvider.createFolder) {
      await storageProvider.createFolder(folderPath);
    }
  }

  async deleteFolderFromProvider(provider: string, folderPath: string): Promise<void> {
    if (!folderPath) {
      throw new BadRequestException('Folder path is required');
    }

    const storageProvider = await this.cloudStorageFactory.getProvider(provider);
    await storageProvider.deleteFolder(folderPath);
  }

  async updateFileMetadata(
    fileId: string,
    updateData: UpdateFileMetadataDto,
    requestingUserId: string,
  ): Promise<EnhancedFileInfo> {
    const existing = await this.prisma.file.findUnique({ where: { id: fileId } });

    if (!existing) {
      throw new NotFoundException(`File '${fileId}' not found`);
    }

    if (existing.userId && existing.userId !== requestingUserId) {
      throw new ForbiddenException('You do not have permission to update this file');
    }

    const updatedFile = await this.prisma.file.update({
      where: { id: fileId },
      data: {
        description: updateData.description,
        tags: updateData.tags,
        metadata: updateData.metadata ?? {},
        isPublic: updateData.isPublic,
        expiresAt: updateData.expiresAt ? new Date(updateData.expiresAt) : undefined,
      },
      include: { cloudStorages: true, fileTags: true },
    });

    return this.mapToEnhancedFileInfo(updatedFile);
  }

  async getFileById(fileId: string, requestingUserId?: string): Promise<EnhancedFileInfo> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { cloudStorages: true, fileTags: true },
    });

    if (!file) {
      throw new NotFoundException(`File '${fileId}' not found`);
    }

    if (!file.isPublic && file.userId && requestingUserId && file.userId !== requestingUserId) {
      throw new ForbiddenException('You do not have access to this file');
    }

    this.prisma.file
      .update({ where: { id: fileId }, data: { lastAccessedAt: new Date() } })
      .catch((err) => {
        this.logger.warn(`Failed to update lastAccessedAt for file ${fileId}: ${err.message}`);
      });

    return this.mapToEnhancedFileInfo(file);
  }

  async searchFiles(searchParams: FileSearchDto, userId: string): Promise<FileSearchResult> {
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
      OR: [{ userId }, { isPublic: true }],
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

    const [total, files] = await Promise.all([
      this.prisma.file.count({ where }),
      this.prisma.file.findMany({
        where,
        include: { cloudStorages: true, fileTags: true },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
    ]);

    return {
      files: files.map((file) => this.mapToEnhancedFileInfo(file)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async bulkDeleteFiles(
    bulkDeleteData: BulkDeleteDto,
    requestingUserId: string,
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

        if (file.userId && file.userId !== requestingUserId) {
          result.failed++;
          result.errors.push({ fileId, error: 'Permission denied' });
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
              `Failed to delete file ${fileId} from cloud: ${cloudError.message}`,
            );
          }
        }

        await this.prisma.$transaction(async (tx) => {
          await tx.cloudStorage.deleteMany({
            where: { files: { some: { id: fileId } } },
          });
          await tx.file.update({
            where: { id: fileId },
            data: { deletedAt: new Date() },
          });
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
    const existing = await this.prisma.fileTag.findUnique({
      where: { name: tagData.name },
    });

    if (existing) {
      throw new ConflictException(`Tag '${tagData.name}' already exists`);
    }

    return this.prisma.fileTag.create({ data: tagData });
  }

  async getAllFileTags() {
    return this.prisma.fileTag.findMany({ orderBy: { name: 'asc' } });
  }

  async addTagsToFile(fileId: string, dto: AddTagsToFileDto, requestingUserId: string) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });

    if (!file) {
      throw new NotFoundException(`File '${fileId}' not found`);
    }

    if (file.userId && file.userId !== requestingUserId) {
      throw new ForbiddenException('You do not have permission to modify this file');
    }

    const tags = await this.prisma.fileTag.findMany({
      where: { id: { in: dto.tagIds } },
    });

    if (tags.length !== dto.tagIds.length) {
      const foundIds = tags.map((t) => t.id);
      const missingIds = dto.tagIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(`Tags not found: ${missingIds.join(', ')}`);
    }

    return this.prisma.file.update({
      where: { id: fileId },
      data: { fileTags: { connect: dto.tagIds.map((id) => ({ id })) } },
      include: { fileTags: true },
    });
  }

  async bulkUploadFiles(
    files: Express.Multer.File[],
    metadata: BulkUploadMetadataDto,
    userId: string,
  ): Promise<BulkUploadResult> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided for bulk upload');
    }

    if (files.length > 20) {
      throw new BadRequestException('Maximum 20 files allowed per bulk upload');
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const maxTotalSize = 100 * 1024 * 1024;

    if (totalSize > maxTotalSize) {
      throw new BadRequestException(
        `Total file size (${Math.round(totalSize / (1024 * 1024))}MB) exceeds maximum allowed (100MB)`,
      );
    }

    const provider = metadata.provider ?? 'dropbox';
    await this.cloudStorageFactory.getProvider(provider);

    const result: BulkUploadResult = {
      successful: 0,
      failed: 0,
      total: files.length,
      files: [],
    };

    for (const file of files) {
      try {
        const uploadResult = await this.uploadFileToProvider(
          file,
          provider,
          userId,
          metadata.folderPath,
        );

        if (metadata.defaultTags || metadata.defaultMetadata) {
          await this.updateFileMetadata(
            uploadResult.fileId,
            { tags: metadata.defaultTags, metadata: metadata.defaultMetadata },
            userId,
          );
        }

        result.files.push({
          originalName: file.originalname,
          fileId: uploadResult.fileId,
          success: true,
        });
        result.successful++;
      } catch (error) {
        result.files.push({
          originalName: file.originalname,
          success: false,
          error: error.message,
        });
        result.failed++;
      }
    }

    return result;
  }

  async uploadFileToMultipleProviders(
    file: Express.Multer.File,
    uploadData: MultiProviderUploadDto,
    userId: string,
  ): Promise<MultiProviderUploadResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Invalid file data');
    }

    if (!uploadData.providers || uploadData.providers.length === 0) {
      throw new BadRequestException('At least one provider must be specified');
    }

    for (const provider of uploadData.providers) {
      await this.cloudStorageFactory.getProvider(provider);
    }

    const result: MultiProviderUploadResult = {
      fileId: '',
      originalName: file.originalname,
      folderPath: uploadData.folderPath,
      results: [],
      successful: 0,
      failed: 0,
      total: uploadData.providers.length,
    };

    let primaryFileId: string | null = null;

    for (const provider of uploadData.providers) {
      try {
        if (!primaryFileId) {
          const firstResult = await this.uploadFileToProvider(
            file,
            provider,
            userId,
            uploadData.folderPath,
          );
          primaryFileId = firstResult.fileId;
          result.fileId = primaryFileId;
          result.results.push({
            provider,
            success: true,
            url: firstResult.url,
            storageName: firstResult.storageName,
          });
        } else {
          const storageProvider = await this.cloudStorageFactory.getProvider(provider);
          const storageName = storageProvider.generateStorageName(file.originalname);
          const providerResult = await storageProvider.uploadFile(
            file,
            storageName,
            uploadData.folderPath,
          );

          const tempFileId = await storageProvider.saveFileRecord(
            file,
            providerResult.url,
            storageName,
            uploadData.folderPath,
            userId,
          );

          await this.prisma.$transaction(async (tx) => {
            const tempFile = await tx.file.findUnique({
              where: { id: tempFileId },
              include: { cloudStorages: true },
            });

            if (tempFile && tempFile.cloudStorages.length > 0) {
              const cloudStorage = tempFile.cloudStorages[0];

              await tx.cloudStorage.update({
                where: { id: cloudStorage.id },
                data: {
                  files: {
                    disconnect: { id: tempFileId },
                    connect: { id: primaryFileId },
                  },
                },
              });

              await tx.file.delete({ where: { id: tempFileId } });
            }
          });

          result.results.push({
            provider,
            success: true,
            url: providerResult.url,
            storageName,
          });
        }

        result.successful++;
      } catch (error) {
        result.results.push({ provider, success: false, error: error.message });
        result.failed++;
      }
    }

    if (
      result.fileId &&
      (uploadData.description || uploadData.tags || uploadData.metadata)
    ) {
      await this.updateFileMetadata(
        result.fileId,
        {
          description: uploadData.description,
          tags: uploadData.tags,
          metadata: uploadData.metadata,
        },
        userId,
      ).catch((err) => {
        this.logger.warn(`Failed to update metadata after multi-provider upload: ${err.message}`);
      });
    }

    return result;
  }

  async deleteFileFromMultipleProviders(
    deleteData: MultiProviderDeleteDto,
    requestingUserId: string,
  ): Promise<MultiProviderDeleteResult> {
    const file = await this.prisma.file.findUnique({
      where: { id: deleteData.fileId },
      include: { cloudStorages: true },
    });

    if (!file) {
      throw new NotFoundException(`File '${deleteData.fileId}' not found`);
    }

    if (file.userId && file.userId !== requestingUserId) {
      throw new ForbiddenException('You do not have permission to delete this file');
    }

    const result: MultiProviderDeleteResult = {
      fileId: deleteData.fileId,
      results: [],
      successful: 0,
      failed: 0,
      total: deleteData.providers.length,
      fileDeleted: false,
    };

    for (const provider of deleteData.providers) {
      try {
        const cloudStorage = file.cloudStorages.find(
          (cs) => cs.provider.toLowerCase() === provider.toLowerCase(),
        );

        if (!cloudStorage) {
          result.results.push({
            provider,
            success: false,
            error: 'File not found in this provider',
          });
          result.failed++;
          continue;
        }

        await this.deleteFileFromProvider(provider, deleteData.fileId, requestingUserId);
        result.results.push({ provider, success: true });
        result.successful++;
      } catch (error) {
        result.results.push({ provider, success: false, error: error.message });
        result.failed++;
      }
    }

    const remainingStorages = await this.prisma.cloudStorage.count({
      where: { files: { some: { id: deleteData.fileId } } },
    });

    result.fileDeleted = remainingStorages === 0;

    return result;
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
      tags: file.tags ?? [],
      metadata: file.metadata ?? {},
      isPublic: file.isPublic,
      downloadCount: file.downloadCount,
      lastAccessedAt: file.lastAccessedAt,
      expiresAt: file.expiresAt,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      cloudStorages: file.cloudStorages ?? [],
      fileTags: file.fileTags ?? [],
    };
  }
}
