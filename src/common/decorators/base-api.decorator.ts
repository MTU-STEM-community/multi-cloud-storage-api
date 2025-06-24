import { applyDecorators } from '@nestjs/common';
import { ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';

/**
 * Standard API responses for all endpoints
 */
export const ApiStandardResponses = () =>
  applyDecorators(
    ApiResponse({
      status: 400,
      description: 'Bad Request - Invalid input parameters',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: { type: 'string', example: 'Invalid input parameters' },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 500 },
          message: { type: 'string', example: 'Internal server error' },
          error: { type: 'string', example: 'Internal Server Error' },
        },
      },
    }),
  );

/**
 * Authentication required responses
 */
export const ApiAuthRequired = () =>
  applyDecorators(
    ApiResponse({
      status: 401,
      description: 'Unauthorized - Authentication required',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Unauthorized' },
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'Forbidden - Insufficient permissions',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 403 },
          message: { type: 'string', example: 'Forbidden resource' },
          error: { type: 'string', example: 'Forbidden' },
        },
      },
    }),
  );

/**
 * Not found response for specific entity
 */
export const ApiNotFoundResponse = (entityName: string) =>
  ApiResponse({
    status: 404,
    description: `${entityName} not found`,
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: `${entityName} not found` },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  });

/**
 * Provider parameter decorator
 */
export const ApiProviderParam = () =>
  ApiParam({
    name: 'provider',
    type: 'string',
    description: 'Cloud storage provider',
    enum: [
      'google-cloud',
      'dropbox',
      'mega',
      'google-drive',
      'backblaze',
      'onedrive',
    ],
    example: 'dropbox',
  });

/**
 * File ID parameter decorator
 */
export const ApiFileIdParam = () =>
  ApiParam({
    name: 'fileId',
    type: 'string',
    description: 'File identifier',
    example: 'document.pdf',
  });

/**
 * Folder path query decorator
 */
export const ApiFolderPathQuery = (required: boolean = false) =>
  ApiQuery({
    name: 'folderPath',
    type: 'string',
    description: 'Optional folder path',
    required,
    example: 'documents/projects',
  });

/**
 * File upload body decorator
 */
export const ApiFileUploadBody = () =>
  ApiBody({
    description: 'File to upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
      },
    },
  });

/**
 * Folder path body decorator
 */
export const ApiFolderPathBody = () =>
  ApiBody({
    description: 'Folder path to create or delete',
    schema: {
      type: 'object',
      properties: {
        folderPath: {
          type: 'string',
          description: 'Path of the folder',
          example: 'documents/projects',
        },
      },
    },
  });

/**
 * Bulk operation response schema
 */
export const ApiBulkOperationResponse = (entityName: string) => ({
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
          row: { type: 'number', example: 3 },
          error: {
            type: 'string',
            example: `${entityName} code already exists`,
          },
        },
      },
    },
  },
});

/**
 * Statistics response schema
 */
export const ApiStatisticsResponse = (properties: Record<string, any>) => ({
  type: 'object',
  properties,
});

/**
 * CSV template response
 */
export const ApiCsvTemplateResponse = () =>
  ApiResponse({
    status: 200,
    description: 'CSV template file',
    headers: {
      'Content-Type': {
        description: 'MIME type',
        schema: { type: 'string', example: 'text/csv' },
      },
      'Content-Disposition': {
        description: 'File attachment',
        schema: {
          type: 'string',
          example: 'attachment; filename=template.csv',
        },
      },
    },
  });
