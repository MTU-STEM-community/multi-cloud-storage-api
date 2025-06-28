import { Module } from '@nestjs/common';
import { PerformanceMetricsService } from './performance-metrics.service';
import { PerformanceController } from './performance.controller';
import { PerformanceInterceptor } from './performance.interceptor';

@Module({
  providers: [PerformanceMetricsService, PerformanceInterceptor],
  controllers: [PerformanceController],
  exports: [PerformanceMetricsService, PerformanceInterceptor],
})
export class MonitoringModule {}
