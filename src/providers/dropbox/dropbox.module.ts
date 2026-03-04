import { Module } from '@nestjs/common';
import { DropboxService } from './dropbox.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import { ProviderConfigService } from '../../common/providers/provider-config.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [
    DropboxService,
    PrismaService,
    EncryptionService,
    ProviderConfigService,
  ],
  exports: [DropboxService],
})
export class DropboxModule {}
