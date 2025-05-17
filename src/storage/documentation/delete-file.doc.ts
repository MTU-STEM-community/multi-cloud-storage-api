import { ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { StorageProvider } from './models';

export const DeleteFileDoc = {
  ApiOperation: ApiOperation({
    summary: 'Delete a file from a cloud provider',
  }),
  ApiParam: ApiParam({
    name: 'provider',
    enum: Object.values(StorageProvider),
    description: 'Cloud provider name',
  }),
  ApiParam2: ApiParam({
    name: 'fileId',
    description: 'ID or name of the file to delete',
  }),
  ApiQuery: ApiQuery({
    name: 'folderPath',
    required: false,
    description: 'Optional folder path where the file is stored',
  }),
};
