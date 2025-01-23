import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [StorageController],
  providers: [StorageService, PrismaService]
})
export class StorageModule {}
