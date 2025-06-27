import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  Delete,
  Res,
  HttpStatus,
  Query,
  Body,
  Put,
  Patch,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { FileValidationPipe } from '../common/pipes/file-validation.pipe';
import { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiUploadFile,
  ApiListFiles,
  ApiDownloadFile,
  ApiDeleteFile,
  ApiCreateFolder,
  ApiDeleteFolder,
  ApiUpdateFileMetadata,
  ApiGetFileById,
  ApiSearchFiles,
  ApiBulkDeleteFiles,
  ApiCreateFileTag,
  ApiGetAllFileTags,
  ApiBulkUploadFiles,
  ApiMultiProviderUpload,
  ApiMultiProviderDelete,
} from './decorators/storage-api.decorator';
import {
  UpdateFileMetadataDto,
  FileSearchDto,
  BulkDeleteDto,
  CreateFileTagDto,
  MultiProviderUploadDto,
  MultiProviderDeleteDto,
  BulkUploadMetadataDto,
} from './dto/file-metadata.dto';

@ApiTags('storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload/:provider')
  @ApiUploadFile()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(FileValidationPipe) file: Express.Multer.File,
    @Param('provider') provider: string,
    @Query('folderPath') folderPath?: string,
  ) {
    const result = await this.storageService.uploadFileToProvider(
      file,
      provider,
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
    @Query('originalName') originalName?: string,
  ) {
    const fileInfo = await this.storageService.getFileById(fileId);

    const fileData = await this.storageService.downloadFileFromProvider(
      provider,
      fileId,
    );

    const contentType = FileValidationPipe.getMimeType(fileInfo.name);

    const downloadName = originalName || fileInfo.name || fileId;

    response.setHeader('Content-Type', contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${downloadName}"`,
    );
    response.setHeader('Content-Length', fileData.length);

    return response.status(HttpStatus.OK).send(fileData);
  }

  @Delete('delete/:provider/:fileId')
  @ApiDeleteFile()
  async deleteFile(
    @Param('provider') provider: string,
    @Param('fileId') fileId: string,
  ) {
    await this.storageService.deleteFileFromProvider(provider, fileId);
    return { message: `File ${fileId} successfully deleted from ${provider}` };
  }

  @Post(':provider/folder')
  @ApiCreateFolder()
  async createFolder(
    @Param('provider') provider: string,
    @Body('folderPath') folderPath: string,
  ) {
    await this.storageService.createFolderInProvider(provider, folderPath);
    return {
      message: `Folder successfully created in ${provider}`,
      folderPath,
    };
  }

  @Delete(':provider/folder')
  @ApiDeleteFolder()
  async deleteFolder(
    @Param('provider') provider: string,
    @Query('folderPath') folderPath: string,
  ) {
    await this.storageService.deleteFolderFromProvider(provider, folderPath);
    return {
      message: `Folder '${folderPath}' successfully deleted from ${provider}`,
    };
  }

  @Patch('files/:fileId/metadata')
  @ApiUpdateFileMetadata()
  async updateFileMetadata(
    @Param('fileId') fileId: string,
    @Body() updateData: UpdateFileMetadataDto,
  ) {
    return this.storageService.updateFileMetadata(fileId, updateData);
  }

  @Get('files/:fileId')
  @ApiGetFileById()
  async getFileById(@Param('fileId') fileId: string) {
    return this.storageService.getFileById(fileId);
  }

  @Get('files/search')
  @ApiSearchFiles()
  async searchFiles(@Query() searchParams: FileSearchDto) {
    return this.storageService.searchFiles(searchParams);
  }

  @Delete('files/bulk')
  @ApiBulkDeleteFiles()
  async bulkDeleteFiles(@Body() bulkDeleteData: BulkDeleteDto) {
    return this.storageService.bulkDeleteFiles(bulkDeleteData);
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


  @Post('bulk-upload')
  @ApiBulkUploadFiles()
  @UseInterceptors(FilesInterceptor('files', 20)) // Max 20 files
  async bulkUploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() metadata: BulkUploadMetadataDto,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    for (const file of files) {
      if (!file || !file.buffer) {
        throw new BadRequestException(
          `Invalid file data for file: ${file?.originalname || 'unknown'}`,
        );
      }
    }

    return this.storageService.bulkUploadFiles(files, metadata);
  }

  @Post('multi-provider-upload')
  @ApiMultiProviderUpload()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFileToMultipleProviders(
    @UploadedFile(FileValidationPipe) file: Express.Multer.File,
    @Body() uploadData: MultiProviderUploadDto,
  ) {
    return this.storageService.uploadFileToMultipleProviders(file, uploadData);
  }

  @Delete('multi-provider-delete')
  @ApiMultiProviderDelete()
  async deleteFileFromMultipleProviders(
    @Body() deleteData: MultiProviderDeleteDto,
  ) {
    return this.storageService.deleteFileFromMultipleProviders(deleteData);
  }
}
