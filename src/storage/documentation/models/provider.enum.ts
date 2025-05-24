import { ApiProperty } from '@nestjs/swagger';

export enum StorageProvider {
  GOOGLE = 'google-cloud',
  DROPBOX = 'dropbox',
  MEGA = 'mega',
  GOOGLE_DRIVE = 'google-drive',
  BACKBLAZE = 'backblaze',
}

export class ProviderParam {
  @ApiProperty({
    enum: StorageProvider,
    description: 'Cloud provider name',
  })
  provider: StorageProvider;
}
