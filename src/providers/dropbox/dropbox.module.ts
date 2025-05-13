import { Module } from '@nestjs/common';
import { DropboxService } from './dropbox.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [DropboxService, PrismaService, EncryptionService],
  exports: [DropboxService],
})
export class DropboxModule {}
