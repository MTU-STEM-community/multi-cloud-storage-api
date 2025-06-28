import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PerformanceMetricsService } from './performance-metrics.service';
import {
  ApiSystemMetrics,
  ApiProviderPerformance,
  ApiPerformanceSummary,
  ApiDetailedMetrics,
  ApiSlowOperations,
  ApiPerformanceDashboard,
} from './decorators/monitoring-api.decorators';

@ApiTags('monitoring')
@Controller('monitoring')
export class PerformanceController {
  constructor(private readonly metricsService: PerformanceMetricsService) {}

  @Get('performance/system')
  @ApiSystemMetrics()
  getSystemMetrics() {
    return this.metricsService.getSystemMetrics();
  }

  @Get('performance/providers')
  @ApiProviderPerformance()
  getProviderPerformance() {
    return this.metricsService.getProviderPerformance();
  }

  @Get('performance/summary')
  @ApiPerformanceSummary()
  getPerformanceSummary() {
    return this.metricsService.getHourlyPerformanceSummary();
  }

  @Get('performance/metrics')
  @ApiDetailedMetrics()
  getDetailedMetrics(
    @Query('hours', new ParseIntPipe({ optional: true })) hours: number = 24,
    @Query('operation') operation?: string,
    @Query('provider') provider?: string,
  ) {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const metrics = this.metricsService.getMetrics(
      startTime,
      undefined,
      operation,
      provider,
    );

    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    const successfulMetrics = metrics.filter((m) => m.success);

    return {
      metrics: metrics.slice(-100), // Return last 100 metrics to avoid huge responses
      summary: {
        totalMetrics: metrics.length,
        averageResponseTime:
          metrics.length > 0 ? Math.round(totalDuration / metrics.length) : 0,
        successRate:
          metrics.length > 0
            ? Math.round((successfulMetrics.length / metrics.length) * 10000) /
              100
            : 0,
        timeRange: `last_${hours}_hours`,
      },
    };
  }

  @Get('performance/slow-operations')
  @ApiSlowOperations()
  getSlowOperations(
    @Query('threshold', new ParseIntPipe({ optional: true }))
    threshold: number = 5000,
    @Query('hours', new ParseIntPipe({ optional: true })) hours: number = 24,
  ) {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const allMetrics = this.metricsService.getMetrics(startTime);
    const slowOperations = allMetrics.filter((m) => m.duration >= threshold);

    return {
      threshold,
      timeRange: `last_${hours}_hours`,
      slowOperations: slowOperations.slice(-50), // Last 50 slow operations
      summary: {
        totalSlowOperations: slowOperations.length,
        slowestOperation:
          slowOperations.length > 0
            ? Math.max(...slowOperations.map((m) => m.duration))
            : 0,
        averageSlowDuration:
          slowOperations.length > 0
            ? Math.round(
                slowOperations.reduce((sum, m) => sum + m.duration, 0) /
                  slowOperations.length,
              )
            : 0,
      },
    };
  }

  @Get('dashboard')
  @ApiPerformanceDashboard()
  getDashboard() {
    const systemMetrics = this.metricsService.getSystemMetrics();
    const providerPerformance = this.metricsService.getProviderPerformance();
    const performanceSummary =
      this.metricsService.getHourlyPerformanceSummary();

    // Get recent slow operations
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentMetrics = this.metricsService.getMetrics(oneHourAgo);
    const slowOperations = recentMetrics
      .filter((m) => m.duration > 3000)
      .slice(-10);

    return {
      timestamp: new Date(),
      system: systemMetrics,
      providers: providerPerformance,
      hourlyActivity: performanceSummary,
      alerts: {
        slowOperations: slowOperations.length,
        unhealthyProviders: providerPerformance.filter(
          (p) => p.status === 'unhealthy',
        ).length,
        degradedProviders: providerPerformance.filter(
          (p) => p.status === 'degraded',
        ).length,
        lowSuccessRate: systemMetrics.successRate < 95,
      },
      recentSlowOperations: slowOperations.map((op) => ({
        operation: op.operation,
        provider: op.provider,
        duration: op.duration,
        timestamp: op.timestamp,
        error: op.error,
      })),
    };
  }
}
