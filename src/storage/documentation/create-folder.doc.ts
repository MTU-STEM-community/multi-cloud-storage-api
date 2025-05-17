import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import {
  StorageProvider,
  CreateFolderDto,
  CreateFolderResponseDto,
} from './models';

export const CreateFolderDoc = {
  ApiOperation: ApiOperation({
    summary: 'Create a new folder in a cloud provider',
  }),
  ApiParam: ApiParam({
    name: 'provider',
    enum: Object.values(StorageProvider),
    description: 'Cloud provider name',
  }),
  ApiBody: ApiBody({
    type: CreateFolderDto,
  }),
  ApiResponse: ApiResponse({
    status: 201,
    description: 'Folder created successfully',
    type: CreateFolderResponseDto,
  }),
};
