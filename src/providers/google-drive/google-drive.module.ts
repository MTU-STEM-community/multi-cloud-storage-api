import { Module } from '@nestjs/common';
import { GoogleDriveService } from './google-drive.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [GoogleDriveService, PrismaService, EncryptionService],
  exports: [GoogleDriveService],
})
export class GoogleDriveModule {}
