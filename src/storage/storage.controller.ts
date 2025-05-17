import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  Delete,
  Res,
  HttpStatus,
  Query,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { FileValidationPipe } from '../common/pipes/file-validation.pipe';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload/:provider')
  @ApiOperation({ summary: 'Upload file to a cloud provider' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'provider',
    enum: ['google', 'dropbox', 'mega'],
    description: 'Cloud provider name',
  })
  @ApiQuery({
    name: 'folderPath',
    required: false,
    description: 'Optional folder path for file organization',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (max 10MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to access the uploaded file' },
        originalName: { type: 'string', description: 'Original file name' },
        storageName: {
          type: 'string',
          description: 'Name used in cloud storage',
        },
        fileId: { type: 'string', description: 'Unique file identifier' },
        folderPath: {
          type: 'string',
          description: 'Folder path where file was stored (if specified)',
        },
      },
    },
  })
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
  @ApiOperation({ summary: 'List files from a cloud provider' })
  @ApiParam({
    name: 'provider',
    enum: ['google', 'dropbox', 'mega'],
    description: 'Cloud provider name',
  })
  @ApiQuery({
    name: 'folderPath',
    required: false,
    description: 'Optional folder path to list files from',
  })
  @ApiResponse({
    status: 200,
    description: 'List of files retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          size: { type: 'string' },
          contentType: { type: 'string' },
          created: { type: 'string' },
          updated: { type: 'string' },
          path: { type: 'string' },
          isFolder: { type: 'boolean' },
        },
      },
    },
  })
  async listFiles(
    @Param('provider') provider: string,
    @Query('folderPath') folderPath?: string,
  ) {
    return this.storageService.listFilesFromProvider(provider, folderPath);
  }

  @Get('download/:provider/:fileId')
  @ApiOperation({ summary: 'Download a file from a cloud provider' })
  @ApiParam({
    name: 'provider',
    enum: ['google', 'dropbox', 'mega'],
    description: 'Cloud provider name',
  })
  @ApiParam({
    name: 'fileId',
    description: 'ID or name of the file to download',
  })
  @ApiQuery({
    name: 'originalName',
    required: false,
    description: 'Original file name for the download',
  })
  @ApiQuery({
    name: 'folderPath',
    required: false,
    description: 'Optional folder path where the file is stored',
  })
  async downloadFile(
    @Param('provider') provider: string,
    @Param('fileId') fileId: string,
    @Res() response: Response,
    @Query('originalName') originalName?: string,
    @Query('folderPath') folderPath?: string,
  ) {
    const fileData = await this.storageService.downloadFileFromProvider(
      provider,
      fileId,
      folderPath,
    );

    let contentType = 'application/octet-stream';

    if (fileId.includes('.')) {
      const extension = fileId.split('.').pop().toLowerCase();
      switch (extension) {
        case 'txt':
          contentType = 'text/plain';
          break;
        case 'pdf':
          contentType = 'application/pdf';
          break;
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg';
          break;
        case 'png':
          contentType = 'image/png';
          break;
      }
    }

    const downloadName = originalName || fileId;

    response.setHeader('Content-Type', contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${downloadName}"`,
    );
    response.setHeader('Content-Length', fileData.length);

    return response.status(HttpStatus.OK).send(fileData);
  }

  @Delete('delete/:provider/:fileId')
  @ApiOperation({ summary: 'Delete a file from a cloud provider' })
  @ApiParam({
    name: 'provider',
    enum: ['google', 'dropbox', 'mega'],
    description: 'Cloud provider name',
  })
  @ApiParam({ name: 'fileId', description: 'ID or name of the file to delete' })
  @ApiQuery({
    name: 'folderPath',
    required: false,
    description: 'Optional folder path where the file is stored',
  })
  async deleteFile(
    @Param('provider') provider: string,
    @Param('fileId') fileId: string,
    @Query('folderPath') folderPath?: string,
  ) {
    await this.storageService.deleteFileFromProvider(
      provider,
      fileId,
      folderPath,
    );
    return { message: `File ${fileId} successfully deleted from ${provider}` };
  }

  @Post('folder/:provider')
  @ApiOperation({ summary: 'Create a new folder in a cloud provider' })
  @ApiParam({
    name: 'provider',
    enum: ['google', 'dropbox', 'mega'],
    description: 'Cloud provider name',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['folderPath'],
      properties: {
        folderPath: {
          type: 'string',
          description: 'Path of the folder to create',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Folder created successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        folderPath: { type: 'string' },
      },
    },
  })
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
}
