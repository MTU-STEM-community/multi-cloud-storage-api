import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { StorageProvider, FileUploadResponseDto } from './models';

export const UploadFileDoc = {
  ApiOperation: ApiOperation({ summary: 'Upload file to a cloud provider' }),
  ApiConsumes: ApiConsumes('multipart/form-data'),
  ApiParam: ApiParam({
    name: 'provider',
    enum: Object.values(StorageProvider),
    description: 'Cloud provider name',
  }),
  ApiQuery: ApiQuery({
    name: 'folderPath',
    required: false,
    description: 'Optional folder path for file organization',
  }),
  ApiBody: ApiBody({
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
  }),
  ApiResponse: ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: FileUploadResponseDto,
  }),
};
