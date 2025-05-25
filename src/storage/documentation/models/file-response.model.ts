import { ApiProperty } from '@nestjs/swagger';

export class FileUploadResponseDto {
  @ApiProperty({ description: 'URL to access the uploaded file' })
  url: string;

  @ApiProperty({ description: 'Original file name' })
  originalName: string;

  @ApiProperty({ description: 'Name used in cloud storage' })
  storageName: string;

  @ApiProperty({ description: 'Unique file identifier' })
  fileId: string;

  @ApiProperty({
    description: 'Folder path where file was stored (if specified)',
    required: false,
  })
  folderPath?: string;
}

export class FileListItemDto {
  @ApiProperty({ description: 'File name' })
  name: string;

  @ApiProperty({ description: 'File size' })
  size: string;

  @ApiProperty({ description: 'File content type' })
  contentType: string;

  @ApiProperty({ description: 'Creation date' })
  created: string;

  @ApiProperty({ description: 'Last update date' })
  updated: string;

  @ApiProperty({ description: 'File path' })
  path: string;

  @ApiProperty({ description: 'Whether the item is a folder' })
  isFolder: boolean;
}

export class DeleteFileResponseDto {
  @ApiProperty({ description: 'Success message' })
  message: string;
}

export class CreateFolderDto {
  @ApiProperty({ description: 'Path of the folder to create' })
  folderPath: string;
}

export class CreateFolderResponseDto {
  @ApiProperty({ description: 'Success message' })
  message: string;

  @ApiProperty({ description: 'Created folder path' })
  folderPath: string;
}

export class DeleteFolderDto {
  @ApiProperty({ description: 'Path of the folder to delete' })
  folderPath: string;
}

export class DeleteFolderResponseDto {
    @ApiProperty({ description: 'Success message' })
    message: string;

    @ApiProperty({ description: 'Created folder path' })
    folderPath: string;
  }
