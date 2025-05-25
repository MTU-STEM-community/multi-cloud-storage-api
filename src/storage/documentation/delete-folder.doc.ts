import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import {
  StorageProvider,
  DeleteFolderDto,
  DeleteFolderResponseDto,
} from './models';

export const DeleteFolderDoc = {
  ApiOperation: ApiOperation({
    summary: 'Delete a folder from a cloud provider',
  }),
  ApiParam: ApiParam({
    name: 'provider',
    enum: Object.values(StorageProvider),
    description: 'Cloud provider name',
  }),
  ApiBody: ApiBody({
    type: DeleteFolderDto,
  }),
  ApiResponse: ApiResponse({
    status: 200,
    description: 'Folder deleted successfully',
    type: DeleteFolderResponseDto,
  }),
};
