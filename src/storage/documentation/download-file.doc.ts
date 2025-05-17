import { ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { StorageProvider } from './models';

export const DownloadFileDoc = {
  ApiOperation: ApiOperation({
    summary: 'Download a file from a cloud provider',
  }),
  ApiParam: ApiParam({
    name: 'provider',
    enum: Object.values(StorageProvider),
    description: 'Cloud provider name',
  }),
  ApiParam2: ApiParam({
    name: 'fileId',
    description: 'ID or name of the file to download',
  }),
  ApiQuery: ApiQuery({
    name: 'originalName',
    required: false,
    description: 'Original file name for the download',
  }),
  ApiQuery2: ApiQuery({
    name: 'folderPath',
    required: false,
    description: 'Optional folder path where the file is stored',
  }),
};
