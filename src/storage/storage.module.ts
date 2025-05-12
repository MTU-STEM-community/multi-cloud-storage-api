import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from 'src/utils/encryption.util';

@Module({
  controllers: [StorageController],
  providers: [StorageService, PrismaService, EncryptionService]
})
export class StorageModule {}
