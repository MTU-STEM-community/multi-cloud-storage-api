import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { GoogleCloudModule } from '../providers/google-cloud/google-cloud.module';
import { DropboxModule } from '../providers/dropbox/dropbox.module';
import { MegaModule } from 'src/providers/mega/mega.module';
import { GoogleDriveModule } from '../providers/google-drive/google-drive.module';

@Module({
  imports: [GoogleCloudModule, DropboxModule, MegaModule, GoogleDriveModule],
  controllers: [StorageController],
  providers: [StorageService],
})
export class StorageModule {}
