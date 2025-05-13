import { Module } from '@nestjs/common';
import { GoogleCloudService } from './google-cloud.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [GoogleCloudService, PrismaService, EncryptionService],
  exports: [GoogleCloudService],
})
export class GoogleCloudModule {}
