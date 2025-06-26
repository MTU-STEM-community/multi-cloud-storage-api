import {
  IsOptional,
  IsString,
  IsArray,
  IsBoolean,
  IsObject,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFileMetadataDto {
  @ApiPropertyOptional({
    description: 'File description',
    example: 'Important project document for Q4 planning',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'File tags for categorization',
    example: ['project', 'important', 'q4'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Custom metadata as key-value pairs',
    example: { department: 'engineering', priority: 'high', version: '1.2' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether the file is publicly accessible',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'File expiration date (ISO string)',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class FileSearchDto {
  @ApiPropertyOptional({
    description: 'Search term for file name',
    example: 'project',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filter by file type/MIME type',
    example: 'application/pdf',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Filter by tags',
    example: ['important', 'project'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Filter by folder path',
    example: 'documents/projects',
  })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({
    description: 'Filter by public/private status',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
    enum: ['name', 'size', 'type', 'createdAt', 'updatedAt', 'downloadCount'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class BulkDeleteDto {
  @ApiProperty({
    description: 'Array of file IDs to delete',
    example: ['clp1234567890abcdef', 'clp0987654321fedcba'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  fileIds: string[];

  @ApiPropertyOptional({
    description: 'Cloud storage provider',
    example: 'dropbox',
    enum: [
      'google-cloud',
      'dropbox',
      'mega',
      'google-drive',
      'backblaze',
      'onedrive',
    ],
  })
  @IsOptional()
  @IsString()
  provider?: string;
}

export class CreateFileTagDto {
  @ApiProperty({
    description: 'Tag name',
    example: 'important',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Tag color (hex code)',
    example: '#ff0000',
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    description: 'Tag description',
    example: 'Files marked as important for immediate attention',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class MultiProviderUploadDto {
  @ApiProperty({
    description: 'Array of cloud storage providers to upload to',
    example: ['dropbox', 'google-cloud', 'onedrive'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  providers: string[];

  @ApiPropertyOptional({
    description: 'Folder path for the file',
    example: 'documents/projects',
  })
  @IsOptional()
  @IsString()
  folderPath?: string;

  @ApiPropertyOptional({
    description: 'File description',
    example: 'Important project document',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'File tags',
    example: ['project', 'important'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Custom metadata',
    example: { department: 'engineering', priority: 'high' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class MultiProviderDeleteDto {
  @ApiProperty({
    description: 'File ID to delete',
    example: 'clp1234567890abcdef',
  })
  @IsString()
  fileId: string;

  @ApiProperty({
    description: 'Array of cloud storage providers to delete from',
    example: ['dropbox', 'google-cloud'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  providers: string[];
}

export class BulkUploadMetadataDto {
  @ApiPropertyOptional({
    description: 'Folder path for all files',
    example: 'documents/projects',
  })
  @IsOptional()
  @IsString()
  folderPath?: string;

  @ApiPropertyOptional({
    description: 'Cloud storage provider',
    example: 'dropbox',
    enum: ['google-cloud', 'dropbox', 'mega', 'google-drive', 'backblaze', 'onedrive'],
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({
    description: 'Default tags for all files',
    example: ['bulk-upload', 'project'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  defaultTags?: string[];

  @ApiPropertyOptional({
    description: 'Default metadata for all files',
    example: { uploadBatch: 'batch-001', department: 'engineering' },
  })
  @IsOptional()
  @IsObject()
  defaultMetadata?: Record<string, any>;
}
