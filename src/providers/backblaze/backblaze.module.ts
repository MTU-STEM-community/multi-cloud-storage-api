import { Module } from '@nestjs/common';
import { BackblazeService } from './backblaze.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../utils/encryption.util';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [BackblazeService, PrismaService, EncryptionService],
  exports: [BackblazeService],
})
export class BackblazeModule {}
