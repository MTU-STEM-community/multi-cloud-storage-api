import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { CloudStorageFactoryService } from '../common/providers/cloud-storage-factory.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EncryptionService } from '../utils/encryption.util';
import { GoogleCloudModule } from '../providers/google-cloud/google-cloud.module';
import { DropboxModule } from '../providers/dropbox/dropbox.module';
import { MegaModule } from 'src/providers/mega/mega.module';
import { GoogleDriveModule } from '../providers/google-drive/google-drive.module';
import { BackblazeModule } from 'src/providers/backblaze/backblaze.module';
import { OneDriveModule } from 'src/providers/onedrive/onedrive.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    GoogleCloudModule,
    DropboxModule,
    MegaModule,
    GoogleDriveModule,
    BackblazeModule,
    OneDriveModule,
  ],
  controllers: [StorageController],
  providers: [StorageService, CloudStorageFactoryService, EncryptionService],
})
export class StorageModule {}
