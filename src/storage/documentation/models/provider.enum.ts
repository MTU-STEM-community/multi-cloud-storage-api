import { ApiProperty } from '@nestjs/swagger';

export enum StorageProvider {
  GOOGLE = 'google',
  DROPBOX = 'dropbox',
  MEGA = 'mega',
  GOOGLE_DRIVE = 'google-drive',
}

export class ProviderParam {
  @ApiProperty({
    enum: StorageProvider,
    description: 'Cloud provider name',
  })
  provider: StorageProvider;
}
