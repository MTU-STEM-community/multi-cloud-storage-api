import { Module } from '@nestjs/common';
import { BackblazeService } from './backblaze.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import { ProviderConfigService } from '../../common/providers/provider-config.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [
    BackblazeService,
    PrismaService,
    EncryptionService,
    ProviderConfigService,
  ],
  exports: [BackblazeService],
})
export class BackblazeModule {}
