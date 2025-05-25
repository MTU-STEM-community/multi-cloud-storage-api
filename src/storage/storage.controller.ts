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
import { ApiTags } from '@nestjs/swagger';
import {
  UploadFileDoc,
  ListFilesDoc,
  DownloadFileDoc,
  DeleteFileDoc,
  CreateFolderDoc,
  DeleteFolderDoc
} from './documentation';

@ApiTags('storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload/:provider')
  @UploadFileDoc.ApiOperation
  @UploadFileDoc.ApiConsumes
  @UploadFileDoc.ApiParam
  @UploadFileDoc.ApiQuery
  @UploadFileDoc.ApiBody
  @UploadFileDoc.ApiResponse
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
  @ListFilesDoc.ApiOperation
  @ListFilesDoc.ApiParam
  @ListFilesDoc.ApiQuery
  @ListFilesDoc.ApiResponse
  async listFiles(
    @Param('provider') provider: string,
    @Query('folderPath') folderPath?: string,
  ) {
    return this.storageService.listFilesFromProvider(provider, folderPath);
  }

  @Get('download/:provider/:fileId')
  @DownloadFileDoc.ApiOperation
  @DownloadFileDoc.ApiParam
  @DownloadFileDoc.ApiParam2
  @DownloadFileDoc.ApiQuery
  @DownloadFileDoc.ApiQuery2
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

    let contentType = FileValidationPipe.getMimeType(fileId);

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
  @DeleteFileDoc.ApiOperation
  @DeleteFileDoc.ApiParam
  @DeleteFileDoc.ApiParam2
  @DeleteFileDoc.ApiQuery
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
  @CreateFolderDoc.ApiOperation
  @CreateFolderDoc.ApiParam
  @CreateFolderDoc.ApiBody
  @CreateFolderDoc.ApiResponse
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

  @Delete('folder/:provider')
  @DeleteFolderDoc.ApiOperation
  @DeleteFolderDoc.ApiParam
  @DeleteFolderDoc.ApiBody
  @DeleteFolderDoc.ApiResponse
  async deleteFolder(
    @Param('provider') provider: string,
    @Query('folderPath') folderPath: string,
  ) {
    await this.storageService.deleteFolderFromProvider(provider, folderPath);
    return {
      message: `Folder '${folderPath}' successfully deleted from ${provider}`,
    };
  }
}
