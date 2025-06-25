import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { CloudStorageFactoryService } from '../common/providers/cloud-storage-factory.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GoogleCloudModule } from '../providers/google-cloud/google-cloud.module';
import { DropboxModule } from '../providers/dropbox/dropbox.module';
import { MegaModule } from 'src/providers/mega/mega.module';
import { GoogleDriveModule } from '../providers/google-drive/google-drive.module';
import { BackblazeModule } from 'src/providers/backblaze/backblaze.module';
import { OneDriveModule } from 'src/providers/onedrive/onedrive.module';

@Module({
  imports: [
    PrismaModule,
    GoogleCloudModule,
    DropboxModule,
    MegaModule,
    GoogleDriveModule,
    BackblazeModule,
    OneDriveModule,
  ],
  controllers: [StorageController],
  providers: [StorageService, CloudStorageFactoryService],
})
export class StorageModule {}
