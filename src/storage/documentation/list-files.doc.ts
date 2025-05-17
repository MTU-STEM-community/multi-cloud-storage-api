import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { StorageProvider, FileListItemDto } from './models';

export const ListFilesDoc = {
  ApiOperation: ApiOperation({ summary: 'List files from a cloud provider' }),
  ApiParam: ApiParam({
    name: 'provider',
    enum: Object.values(StorageProvider),
    description: 'Cloud provider name',
  }),
  ApiQuery: ApiQuery({
    name: 'folderPath',
    required: false,
    description: 'Optional folder path to list files from',
  }),
  ApiResponse: ApiResponse({
    status: 200,
    description: 'List of files retrieved successfully',
    type: [FileListItemDto],
  }),
};
