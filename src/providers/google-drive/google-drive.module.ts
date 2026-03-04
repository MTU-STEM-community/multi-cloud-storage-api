import { Module } from '@nestjs/common';
import { GoogleDriveService } from './google-drive.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import { ProviderConfigService } from '../../common/providers/provider-config.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [GoogleDriveService, PrismaService, EncryptionService, ProviderConfigService],
  exports: [GoogleDriveService],
})
export class GoogleDriveModule {}
