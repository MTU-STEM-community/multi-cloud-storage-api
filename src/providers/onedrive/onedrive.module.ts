import { Module } from '@nestjs/common';
import { OneDriveService } from './onedrive.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [OneDriveService, PrismaService, EncryptionService],
  exports: [OneDriveService],
})
export class OneDriveModule {}
