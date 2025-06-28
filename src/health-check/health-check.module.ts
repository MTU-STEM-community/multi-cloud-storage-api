import { Module } from '@nestjs/common';
import { HealthCheckController } from './health-check.controller';
import { HealthCheckService } from './health-check.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { CloudStorageFactoryService } from '../common/providers/cloud-storage-factory.service';

@Module({
  imports: [PrismaModule, MonitoringModule],
  controllers: [HealthCheckController],
  providers: [HealthCheckService, PrismaService, CloudStorageFactoryService],
})
export class HealthCheckModule {}
