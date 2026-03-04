import { Module } from '@nestjs/common';
import { GoogleCloudService } from './google-cloud.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import { ProviderConfigService } from '../../common/providers/provider-config.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [
    GoogleCloudService,
    PrismaService,
    EncryptionService,
    ProviderConfigService,
  ],
  exports: [GoogleCloudService],
})
export class GoogleCloudModule {}
