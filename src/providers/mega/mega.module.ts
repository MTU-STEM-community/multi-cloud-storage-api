import { Module } from '@nestjs/common';
import { MegaService } from './mega.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [MegaService, PrismaService, EncryptionService],
  exports: [MegaService],
})
export class MegaModule {}
