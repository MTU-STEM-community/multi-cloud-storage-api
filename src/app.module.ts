import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StorageModule } from './storage/storage.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { DropboxModule } from './providers/dropbox/dropbox.module';
import { GoogleCloudModule } from './providers/google-cloud/google-cloud.module';
import { HealthCheckModule } from './health-check/health-check.module';
import { MegaModule } from './providers/mega/mega.module';
import { GoogleDriveModule } from './providers/google-drive/google-drive.module';
import { BackblazeModule } from './providers/backblaze/backblaze.module';
import { OneDriveModule } from './providers/onedrive/onedrive.module';
import { MonitoringModule } from './monitoring/monitoring.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    StorageModule,
    PrismaModule,
    DropboxModule,
    GoogleCloudModule,
    MegaModule,
    GoogleDriveModule,
    BackblazeModule,
    OneDriveModule,
    HealthCheckModule,
    MonitoringModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
