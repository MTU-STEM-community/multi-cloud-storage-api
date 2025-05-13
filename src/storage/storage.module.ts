import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { GoogleCloudModule } from '../providers/google-cloud/google-cloud.module';
import { DropboxModule } from '../providers/dropbox/dropbox.module';

@Module({
  imports: [GoogleCloudModule, DropboxModule],
  controllers: [StorageController],
  providers: [StorageService],
})
export class StorageModule {}
