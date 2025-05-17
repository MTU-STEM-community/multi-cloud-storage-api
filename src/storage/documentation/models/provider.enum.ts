import { ApiProperty } from '@nestjs/swagger';

export enum StorageProvider {
  GOOGLE = 'google',
  DROPBOX = 'dropbox',
  MEGA = 'mega',
}

export class ProviderParam {
  @ApiProperty({
    enum: StorageProvider,
    description: 'Cloud provider name',
  })
  provider: StorageProvider;
}
