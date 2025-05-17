import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { GoogleCloudModule } from '../providers/google-cloud/google-cloud.module';
import { DropboxModule } from '../providers/dropbox/dropbox.module';
import { MegaModule } from 'src/providers/mega/mega.module';

@Module({
  imports: [GoogleCloudModule, DropboxModule, MegaModule],
  controllers: [StorageController],
  providers: [StorageService],
})
export class StorageModule {}
