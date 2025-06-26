import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import {
  ApiStandardResponses,
  ApiProviderParam,
  ApiFolderPathQuery,
  ApiFileUploadBody,
  ApiFolderPathBody,
} from '../../common/decorators/base-api.decorator';

export const ApiUploadFile = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Upload file to cloud storage',
      description:
        'Upload a file to the specified cloud storage provider with optional folder path',
    }),
    ApiConsumes('multipart/form-data'),
    ApiProviderParam(),
    ApiFolderPathQuery(false),
    ApiFileUploadBody(),
    ApiResponse({
      status: 201,
      description: 'File uploaded successfully',
      schema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            example: 'https://dropbox.com/s/abc123/document.pdf',
          },
          originalName: { type: 'string', example: 'document.pdf' },
          storageName: {
            type: 'string',
            example: '1640995200000_document.pdf',
          },
          fileId: {
            type: 'string',
            format: 'uuid',
            example: 'clp1234567890abcdef',
          },
          folderPath: {
            type: 'string',
            example: 'documents/projects',
            nullable: true,
          },
        },
      },
    }),
    ApiResponse({
      status: 413,
      description: 'File too large',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 413 },
          message: { type: 'string', example: 'File size exceeds limit' },
          error: { type: 'string', example: 'Payload Too Large' },
        },
      },
    }),
    ApiStandardResponses(),
  );

export const ApiListFiles = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List files from cloud storage',
      description:
        'Retrieve a list of files from the specified cloud storage provider',
    }),
    ApiProviderParam(),
    ApiFolderPathQuery(false),
    ApiResponse({
      status: 200,
      description: 'Files retrieved successfully',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'document.pdf' },
            size: { type: 'string', example: '1024' },
            contentType: { type: 'string', example: 'application/pdf' },
            created: { type: 'string', format: 'date-time' },
            updated: { type: 'string', format: 'date-time' },
            path: {
              type: 'string',
              example: 'documents/projects/document.pdf',
            },
            isFolder: { type: 'boolean', example: false },
          },
        },
      },
    }),
    ApiStandardResponses(),
  );

export const ApiDownloadFile = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Download file from cloud storage',
      description: 'Download a file using its database ID from the specified cloud storage provider',
    }),
    ApiProviderParam(),
    ApiParam({
      name: 'fileId',
      type: 'string',
      description: 'Database file ID (UUID)',
      example: 'clp1234567890abcdef',
    }),
    ApiQuery({
      name: 'originalName',
      type: 'string',
      description: 'Custom filename for download (optional)',
      required: false,
      example: 'my-document.pdf',
    }),
    ApiResponse({
      status: 200,
      description: 'File downloaded successfully',
      content: {
        'application/octet-stream': {
          schema: {
            type: 'string',
            format: 'binary',
          },
        },
      },
      headers: {
        'Content-Type': {
          description: 'MIME type of the file',
          schema: { type: 'string' },
        },
        'Content-Disposition': {
          description: 'File attachment header',
          schema: {
            type: 'string',
            example: 'attachment; filename="document.pdf"',
          },
        },
        'Content-Length': {
          description: 'File size in bytes',
          schema: { type: 'number' },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'File not found',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'File not found' },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiStandardResponses(),
  );

export const ApiDeleteFile = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Delete file from cloud storage',
      description: 'Delete a file using its database ID from the specified cloud storage provider',
    }),
    ApiProviderParam(),
    ApiParam({
      name: 'fileId',
      type: 'string',
      description: 'Database file ID (UUID)',
      example: 'clp1234567890abcdef',
    }),
    ApiResponse({
      status: 200,
      description: 'File deleted successfully',
      schema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'File document.pdf successfully deleted from dropbox',
          },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'File not found',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'File not found' },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiStandardResponses(),
  );

export const ApiCreateFolder = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Create folder in cloud storage',
      description:
        'Create a new folder in the specified cloud storage provider',
    }),
    ApiProviderParam(),
    ApiFolderPathBody(),
    ApiResponse({
      status: 201,
      description: 'Folder created successfully',
      schema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Folder successfully created in dropbox',
          },
          folderPath: { type: 'string', example: 'documents/projects' },
        },
      },
    }),
    ApiResponse({
      status: 409,
      description: 'Folder already exists',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 409 },
          message: { type: 'string', example: 'Folder already exists' },
          error: { type: 'string', example: 'Conflict' },
        },
      },
    }),
    ApiStandardResponses(),
  );

export const ApiDeleteFolder = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Delete folder from cloud storage',
      description:
        'Delete a folder and its contents from the specified cloud storage provider',
    }),
    ApiProviderParam(),
    ApiFolderPathQuery(true),
    ApiResponse({
      status: 200,
      description: 'Folder deleted successfully',
      schema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example:
              "Folder 'documents/projects' successfully deleted from dropbox",
          },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'Folder not found',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'Folder not found' },
          error: { type: 'string', example: 'Not Found' },
        },
      },
    }),
    ApiStandardResponses(),
  );

// ===== ENHANCED FILE METADATA DECORATORS =====

export const ApiUpdateFileMetadata = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Update file metadata',
      description:
        'Update file description, tags, custom metadata, and other properties',
    }),
    ApiParam({
      name: 'fileId',
      type: 'string',
      description: 'File ID',
      example: 'clp1234567890abcdef',
    }),
    ApiResponse({
      status: 200,
      description: 'File metadata updated successfully',
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'clp1234567890abcdef' },
          name: { type: 'string', example: 'document.pdf' },
          description: {
            type: 'string',
            example: 'Important project document',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            example: ['project', 'important'],
          },
          metadata: {
            type: 'object',
            example: { department: 'engineering', priority: 'high' },
          },
          isPublic: { type: 'boolean', example: false },
          downloadCount: { type: 'number', example: 5 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    }),
    ApiStandardResponses(),
  );

export const ApiGetFileById = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get file by ID',
      description:
        'Retrieve detailed file information including metadata and access statistics',
    }),
    ApiParam({
      name: 'fileId',
      type: 'string',
      description: 'File ID',
      example: 'clp1234567890abcdef',
    }),
    ApiResponse({
      status: 200,
      description: 'File information retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'clp1234567890abcdef' },
          name: { type: 'string', example: 'document.pdf' },
          size: { type: 'number', example: 1024 },
          type: { type: 'string', example: 'application/pdf' },
          description: {
            type: 'string',
            example: 'Important project document',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            example: ['project', 'important'],
          },
          metadata: { type: 'object', example: { department: 'engineering' } },
          isPublic: { type: 'boolean', example: false },
          downloadCount: { type: 'number', example: 5 },
          lastAccessedAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    }),
    ApiStandardResponses(),
  );

export const ApiSearchFiles = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Search files with advanced filters',
      description:
        'Search files by name, type, tags, metadata with pagination and sorting',
    }),
    ApiResponse({
      status: 200,
      description: 'Search results retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'clp1234567890abcdef' },
                name: { type: 'string', example: 'document.pdf' },
                size: { type: 'number', example: 1024 },
                type: { type: 'string', example: 'application/pdf' },
                tags: { type: 'array', items: { type: 'string' } },
                isPublic: { type: 'boolean', example: false },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
          total: { type: 'number', example: 150 },
          page: { type: 'number', example: 1 },
          limit: { type: 'number', example: 20 },
          totalPages: { type: 'number', example: 8 },
        },
      },
    }),
    ApiStandardResponses(),
  );

export const ApiBulkDeleteFiles = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Bulk delete files',
      description:
        'Delete multiple files at once from database and optionally from cloud storage',
    }),
    ApiResponse({
      status: 200,
      description: 'Bulk delete operation completed',
      schema: {
        type: 'object',
        properties: {
          successful: { type: 'number', example: 8 },
          failed: { type: 'number', example: 2 },
          total: { type: 'number', example: 10 },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                fileId: { type: 'string', example: 'clp1234567890abcdef' },
                error: { type: 'string', example: 'File not found' },
              },
            },
          },
        },
      },
    }),
    ApiStandardResponses(),
  );

export const ApiCreateFileTag = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Create file tag',
      description: 'Create a new tag for file categorization',
    }),
    ApiResponse({
      status: 201,
      description: 'Tag created successfully',
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'clp1234567890abcdef' },
          name: { type: 'string', example: 'important' },
          color: { type: 'string', example: '#ff0000' },
          description: { type: 'string', example: 'Files marked as important' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    }),
    ApiStandardResponses(),
  );

export const ApiGetAllFileTags = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get all file tags',
      description: 'Retrieve all available file tags for categorization',
    }),
    ApiResponse({
      status: 200,
      description: 'Tags retrieved successfully',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clp1234567890abcdef' },
            name: { type: 'string', example: 'important' },
            color: { type: 'string', example: '#ff0000' },
            description: {
              type: 'string',
              example: 'Files marked as important',
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    }),
    ApiStandardResponses(),
  );

// ===== BULK AND MULTI-PROVIDER DECORATORS =====

export const ApiBulkUploadFiles = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Bulk upload multiple files',
      description: 'Upload multiple files to a single cloud storage provider with optional metadata',
    }),
    ApiConsumes('multipart/form-data'),
    ApiResponse({
      status: 201,
      description: 'Bulk upload completed',
      schema: {
        type: 'object',
        properties: {
          successful: { type: 'number', example: 8 },
          failed: { type: 'number', example: 2 },
          total: { type: 'number', example: 10 },
          files: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                originalName: { type: 'string', example: 'document1.pdf' },
                fileId: { type: 'string', example: 'clp1234567890abcdef' },
                success: { type: 'boolean', example: true },
                error: { type: 'string', example: 'Upload failed' },
              },
            },
          },
        },
      },
    }),
    ApiStandardResponses(),
  );

export const ApiMultiProviderUpload = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Upload file to multiple cloud providers',
      description: 'Upload a single file to multiple cloud storage providers simultaneously',
    }),
    ApiConsumes('multipart/form-data'),
    ApiResponse({
      status: 201,
      description: 'Multi-provider upload completed',
      schema: {
        type: 'object',
        properties: {
          fileId: { type: 'string', example: 'clp1234567890abcdef' },
          originalName: { type: 'string', example: 'document.pdf' },
          folderPath: { type: 'string', example: 'projects/q4' },
          successful: { type: 'number', example: 2 },
          failed: { type: 'number', example: 1 },
          total: { type: 'number', example: 3 },
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                provider: { type: 'string', example: 'dropbox' },
                success: { type: 'boolean', example: true },
                url: { type: 'string', example: 'https://dropbox.com/s/abc123/document.pdf' },
                storageName: { type: 'string', example: '1640995200000_document.pdf' },
                error: { type: 'string', example: 'Provider unavailable' },
              },
            },
          },
        },
      },
    }),
    ApiStandardResponses(),
  );

export const ApiMultiProviderDelete = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Delete file from multiple cloud providers',
      description: 'Delete a file from multiple cloud storage providers simultaneously',
    }),
    ApiResponse({
      status: 200,
      description: 'Multi-provider delete completed',
      schema: {
        type: 'object',
        properties: {
          fileId: { type: 'string', example: 'clp1234567890abcdef' },
          successful: { type: 'number', example: 2 },
          failed: { type: 'number', example: 0 },
          total: { type: 'number', example: 2 },
          fileDeleted: { type: 'boolean', example: true },
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                provider: { type: 'string', example: 'dropbox' },
                success: { type: 'boolean', example: true },
                error: { type: 'string', example: 'File not found in provider' },
              },
            },
          },
        },
      },
    }),
    ApiStandardResponses(),
  );
