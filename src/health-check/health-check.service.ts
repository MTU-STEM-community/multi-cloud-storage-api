import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import * as os from 'os';
import { CloudStorageFactoryService } from '../common/providers/cloud-storage-factory.service';
import { PerformanceMetricsService } from '../monitoring/performance-metrics.service';
import { PrismaService } from '../prisma/prisma.service';

const SUPPORTED_PROVIDERS = [
  'google-cloud',
  'dropbox',
  'mega',
  'google-drive',
  'backblaze',
  'onedrive',
] as const;

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudStorageFactory: CloudStorageFactoryService,
    private readonly metricsService: PerformanceMetricsService,
  ) {}

  async checkHealth() {
    try {
      const [
        dbCheck,
        memoryCheck,
        uptimeCheck,
        providersCheck,
        performanceCheck,
      ] = await Promise.all([
        this.checkDatabase(),
        this.checkMemoryUsage(),
        this.checkUptime(),
        this.checkProviders(),
        this.checkPerformance(),
      ]);

      const checks = [
        dbCheck,
        memoryCheck,
        uptimeCheck,
        providersCheck,
        performanceCheck,
      ];
      const hasError = checks.some((c) => c.status === 'error');
      const hasWarning = checks.some((c) => c.status === 'warning');
      const status = hasError ? 'error' : hasWarning ? 'warning' : 'ok';

      const result = {
        status,
        info: {
          database: dbCheck,
          memory: memoryCheck,
          uptime: uptimeCheck,
          providers: providersCheck,
          performance: performanceCheck,
        },
        error: {} as Record<string, any>,
        details: {
          environment: process.env.NODE_ENV ?? 'development',
          hostname: os.hostname(),
        },
      };

      if (status === 'error') {
        if (dbCheck.status === 'error')
          result.error['database'] = (dbCheck as any).error;
        if (memoryCheck.status === 'error')
          result.error['memory'] = (memoryCheck as any).error;
        throw new HttpException(result, HttpStatus.SERVICE_UNAVAILABLE);
      }

      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error('Health check failed', error);
      throw new HttpException(
        { status: 'error', error: { message: error.message } },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async checkReadiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
      };
    } catch (error) {
      this.logger.error('Readiness check failed', error);
      throw new HttpException(
        { status: 'error', error: { message: 'Service not ready' } },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async checkDatabase() {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;

      return {
        status: responseTime < 500 ? 'ok' : 'warning',
        responseTime,
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  private checkMemoryUsage() {
    try {
      const { heapUsed, heapTotal } = process.memoryUsage();
      const usedMB = heapUsed / 1024 / 1024;
      const totalMB = heapTotal / 1024 / 1024;
      const threshold = totalMB * 0.8;

      return {
        status: usedMB < threshold ? 'ok' : 'warning',
        usage: Math.round(usedMB * 100) / 100,
        threshold: Math.round(threshold * 100) / 100,
        totalHeap: Math.round(totalMB * 100) / 100,
        percentUsed: Math.round((usedMB / totalMB) * 100),
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  private checkUptime() {
    return {
      status: 'ok',
      value: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  private async checkProviders() {
    const providerChecks = await Promise.allSettled(
      SUPPORTED_PROVIDERS.map(async (provider) => {
        const start = Date.now();
        try {
          const storageProvider =
            await this.cloudStorageFactory.getProvider(provider);
          await storageProvider.ping();
          const responseTime = Date.now() - start;

          return {
            provider,
            status: responseTime < 3000 ? 'ok' : 'warning',
            responseTime,
          };
        } catch (error) {
          return { provider, status: 'error', error: error.message };
        }
      }),
    );

    const results = providerChecks.map((check, index) =>
      check.status === 'fulfilled'
        ? check.value
        : {
            provider: SUPPORTED_PROVIDERS[index],
            status: 'error',
            error: check.reason?.message,
          },
    );

    const healthyCount = results.filter((r) => r.status === 'ok').length;
    const total = results.length;

    return {
      status:
        healthyCount === total
          ? 'ok'
          : healthyCount > total / 2
            ? 'warning'
            : 'error',
      healthy: healthyCount,
      total,
      providers: results,
    };
  }

  private checkPerformance() {
    try {
      const systemMetrics = this.metricsService.getSystemMetrics();
      const providerPerformance = this.metricsService.getProviderPerformance();

      const unhealthyCount = providerPerformance.filter(
        (p) => p.status === 'unhealthy',
      ).length;
      const degradedCount = providerPerformance.filter(
        (p) => p.status === 'degraded',
      ).length;

      let status = 'ok';
      if (unhealthyCount > 0 || systemMetrics.successRate < 80) {
        status = 'error';
      } else if (
        degradedCount > 0 ||
        systemMetrics.averageResponseTime > 3000
      ) {
        status = 'warning';
      }

      return {
        status,
        systemMetrics: {
          averageResponseTime: systemMetrics.averageResponseTime,
          successRate: systemMetrics.successRate,
          totalRequests: systemMetrics.totalRequests,
        },
        providerSummary: {
          healthy: providerPerformance.filter((p) => p.status === 'healthy')
            .length,
          degraded: degradedCount,
          unhealthy: unhealthyCount,
        },
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }
}
