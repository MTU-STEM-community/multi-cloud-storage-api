import { Module } from '@nestjs/common';
import { MegaService } from './mega.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import { ProviderConfigService } from '../../common/providers/provider-config.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [MegaService, PrismaService, EncryptionService, ProviderConfigService],
  exports: [MegaService],
})
export class MegaModule {}
