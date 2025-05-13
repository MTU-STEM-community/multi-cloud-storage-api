import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  Delete,
  Res,
  Body,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { FileValidationPipe } from '../pipes/file-validation.pipe';
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
    enum: ['google', 'dropbox'],
    description: 'Cloud provider name',
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
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(FileValidationPipe) file: Express.Multer.File,
    @Param('provider') provider: string,
  ) {
    const result = await this.storageService.uploadFileToProvider(
      file,
      provider,
    );
    return {
      url: result.url,
      originalName: file.originalname,
      storageName: result.storageName,
    };
  }

  @Get('list/:provider')
  @ApiOperation({ summary: 'List files from a cloud provider' })
  @ApiParam({
    name: 'provider',
    enum: ['google', 'dropbox'],
    description: 'Cloud provider name',
  })
  async listFiles(@Param('provider') provider: string) {
    return this.storageService.listFilesFromProvider(provider);
  }

  @Get('download/:provider/:fileId')
  @ApiOperation({ summary: 'Download a file from a cloud provider' })
  @ApiParam({
    name: 'provider',
    enum: ['google', 'dropbox'],
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
  async downloadFile(
    @Param('provider') provider: string,
    @Param('fileId') fileId: string,
    @Query('originalName') originalName: string,
    @Res() response: Response,
  ) {
    const fileData = await this.storageService.downloadFileFromProvider(
      provider,
      fileId,
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
    enum: ['google', 'dropbox'],
    description: 'Cloud provider name',
  })
  @ApiParam({ name: 'fileId', description: 'ID or name of the file to delete' })
  async deleteFile(
    @Param('provider') provider: string,
    @Param('fileId') fileId: string,
  ) {
    await this.storageService.deleteFileFromProvider(provider, fileId);
    return { message: `File ${fileId} successfully deleted from ${provider}` };
  }
}
