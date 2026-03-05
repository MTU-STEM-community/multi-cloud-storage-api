import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { FileValidationPipe } from '../common/pipes/file-validation.pipe';
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
import {
  ApiAddTagsToFile,
  ApiBulkDeleteFiles,
  ApiBulkUploadFiles,
  ApiCreateFileTag,
  ApiCreateFolder,
  ApiDeleteFile,
  ApiDeleteFolder,
  ApiDownloadFile,
  ApiGetAllFileTags,
  ApiGetFileById,
  ApiListFiles,
  ApiMultiProviderDelete,
  ApiMultiProviderUpload,
  ApiSearchFiles,
  ApiUpdateFileMetadata,
  ApiUploadFile,
} from './decorators/storage-api.decorator';
import { StorageService } from './storage.service';

@ApiTags('storage')
@ApiBearerAuth('JWT-auth')
@Controller('storage')
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly storageService: StorageService) {}

  @Post('upload/:provider')
  @ApiUploadFile()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  async uploadFile(
    @UploadedFile(FileValidationPipe) file: Express.Multer.File,
    @Param('provider') provider: string,
    @Request() req: any,
    @Query('folderPath') folderPath?: string,
  ) {
    const result = await this.storageService.uploadFileToProvider(
      file,
      provider,
      req.user.id,
      folderPath,
    );
    return {
      url: result.url,
      originalName: result.originalName,
      storageName: result.storageName,
      fileId: result.fileId,
      folderPath: result.folderPath,
    };
  }

  @Get('list/:provider')
  @ApiListFiles()
  async listFiles(
    @Param('provider') provider: string,
    @Query('folderPath') folderPath?: string,
  ) {
    return this.storageService.listFilesFromProvider(provider, folderPath);
  }

  @Get('download/:provider/:fileId')
  @ApiDownloadFile()
  async downloadFile(
    @Param('provider') provider: string,
    @Param('fileId') fileId: string,
    @Res() response: Response,
    @Request() req: any,
    @Query('originalName') originalName?: string,
  ) {
    const fileInfo = await this.storageService.getFileById(fileId, req.user.id);
    const stream = await this.storageService.downloadFileFromProvider(
      provider,
      fileId,
      req.user.id,
    );

    const contentType = FileValidationPipe.getMimeType(fileInfo.name);
    const downloadName = originalName || fileInfo.name || fileId;

    response.setHeader('Content-Type', contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(downloadName)}"`,
    );
    response.setHeader('Content-Length', fileInfo.size);

    stream.on('error', (err) => {
      this.logger.error(`Download stream error for file ${fileId}: ${err.message}`);
      if (!response.headersSent) {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'File download failed',
          timestamp: new Date().toISOString(),
        });
      } else {
        response.end();
      }
    });

    response.on('error', (err) => {
      this.logger.error(`Response stream error for file ${fileId}: ${err.message}`);
      stream.destroy();
    });

    stream.pipe(response);
  }

  @Delete('delete/:provider/:fileId')
  @ApiDeleteFile()
  async deleteFile(
    @Param('provider') provider: string,
    @Param('fileId') fileId: string,
    @Request() req: any,
  ) {
    await this.storageService.deleteFileFromProvider(provider, fileId, req.user.id);
    return { message: `File ${fileId} successfully deleted from ${provider}` };
  }

  @Post(':provider/folder')
  @ApiCreateFolder()
  async createFolder(
    @Param('provider') provider: string,
    @Body('folderPath') folderPath: string,
  ) {
    await this.storageService.createFolderInProvider(provider, folderPath);
    return { message: `Folder successfully created in ${provider}`, folderPath };
  }

  @Delete(':provider/folder')
  @ApiDeleteFolder()
  async deleteFolder(
    @Param('provider') provider: string,
    @Query('folderPath') folderPath: string,
  ) {
    await this.storageService.deleteFolderFromProvider(provider, folderPath);
    return { message: `Folder '${folderPath}' successfully deleted from ${provider}` };
  }

  @Patch('files/:fileId/metadata')
  @ApiUpdateFileMetadata()
  async updateFileMetadata(
    @Param('fileId') fileId: string,
    @Body() updateData: UpdateFileMetadataDto,
    @Request() req: any,
  ) {
    return this.storageService.updateFileMetadata(fileId, updateData, req.user.id);
  }

  @Get('files/search')
  @ApiSearchFiles()
  async searchFiles(@Query() searchParams: FileSearchDto, @Request() req: any) {
    return this.storageService.searchFiles(searchParams, req.user.id);
  }

  @Get('files/:fileId')
  @ApiGetFileById()
  async getFileById(@Param('fileId') fileId: string, @Request() req: any) {
    return this.storageService.getFileById(fileId, req.user.id);
  }

  @Delete('files/bulk')
  @ApiBulkDeleteFiles()
  async bulkDeleteFiles(@Body() bulkDeleteData: BulkDeleteDto, @Request() req: any) {
    return this.storageService.bulkDeleteFiles(bulkDeleteData, req.user.id);
  }

  @Post('tags')
  @ApiCreateFileTag()
  async createFileTag(@Body() tagData: CreateFileTagDto) {
    return this.storageService.createFileTag(tagData);
  }

  @Get('tags')
  @ApiGetAllFileTags()
  async getAllFileTags() {
    return this.storageService.getAllFileTags();
  }

  @Post('files/:fileId/tags')
  @ApiAddTagsToFile()
  async addTagsToFile(
    @Param('fileId') fileId: string,
    @Body() dto: AddTagsToFileDto,
    @Request() req: any,
  ) {
    return this.storageService.addTagsToFile(fileId, dto, req.user.id);
  }

  @Post('bulk-upload')
  @ApiBulkUploadFiles()
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      limits: { fileSize: 10 * 1024 * 1024, files: 20 },
    }),
  )
  async bulkUploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() metadata: BulkUploadMetadataDto,
    @Request() req: any,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    for (const file of files) {
      if (!file || !file.buffer) {
        throw new BadRequestException(
          `Invalid file data for file: ${file?.originalname ?? 'unknown'}`,
        );
      }
    }

    return this.storageService.bulkUploadFiles(files, metadata, req.user.id);
  }

  @Post('multi-provider-upload')
  @ApiMultiProviderUpload()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  async uploadFileToMultipleProviders(
    @UploadedFile(FileValidationPipe) file: Express.Multer.File,
    @Body() uploadData: MultiProviderUploadDto,
    @Request() req: any,
  ) {
    return this.storageService.uploadFileToMultipleProviders(file, uploadData, req.user.id);
  }

  @Delete('multi-provider-delete')
  @ApiMultiProviderDelete()
  async deleteFileFromMultipleProviders(
    @Body() deleteData: MultiProviderDeleteDto,
    @Request() req: any,
  ) {
    return this.storageService.deleteFileFromMultipleProviders(deleteData, req.user.id);
  }
}
