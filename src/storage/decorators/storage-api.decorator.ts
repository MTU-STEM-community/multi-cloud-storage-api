import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import {
  ApiStandardResponses,
  ApiProviderParam,
  ApiFileIdParam,
  ApiFolderPathQuery,
  ApiFileUploadBody,
  ApiFolderPathBody,
} from '../../common/decorators/base-api.decorator';

export const ApiUploadFile = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Upload file to cloud storage',
      description: 'Upload a file to the specified cloud storage provider with optional folder path',
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
          url: { type: 'string', example: 'https://dropbox.com/s/abc123/document.pdf' },
          originalName: { type: 'string', example: 'document.pdf' },
          storageName: { type: 'string', example: '1640995200000_document.pdf' },
          fileId: { type: 'string', format: 'uuid', example: 'clp1234567890abcdef' },
          folderPath: { type: 'string', example: 'documents/projects', nullable: true },
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
      description: 'Retrieve a list of files from the specified cloud storage provider',
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
            path: { type: 'string', example: 'documents/projects/document.pdf' },
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
      description: 'Download a file from the specified cloud storage provider',
    }),
    ApiProviderParam(),
    ApiFileIdParam(),
    ApiFolderPathQuery(false),
    ApiQuery({
      name: 'originalName',
      type: 'string',
      description: 'Original filename for download',
      required: false,
      example: 'document.pdf',
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
          schema: { type: 'string', example: 'attachment; filename="document.pdf"' },
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
      description: 'Delete a file from the specified cloud storage provider',
    }),
    ApiProviderParam(),
    ApiFileIdParam(),
    ApiFolderPathQuery(false),
    ApiResponse({
      status: 200,
      description: 'File deleted successfully',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'File document.pdf successfully deleted from dropbox' },
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
      description: 'Create a new folder in the specified cloud storage provider',
    }),
    ApiProviderParam(),
    ApiFolderPathBody(),
    ApiResponse({
      status: 201,
      description: 'Folder created successfully',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Folder successfully created in dropbox' },
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
      description: 'Delete a folder and its contents from the specified cloud storage provider',
    }),
    ApiProviderParam(),
    ApiFolderPathQuery(true),
    ApiResponse({
      status: 200,
      description: 'Folder deleted successfully',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Folder \'documents/projects\' successfully deleted from dropbox' },
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
