import { Injectable, Logger, HttpStatus, HttpException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudStorageFactoryService } from '../common/providers/cloud-storage-factory.service';
import { PerformanceMetricsService } from '../monitoring/performance-metrics.service';
import * as os from 'os';

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private startTime: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudStorageFactory: CloudStorageFactoryService,
    private readonly metricsService: PerformanceMetricsService,
  ) {
    this.startTime = Date.now();
  }

  async checkHealth() {
    try {
      const checks = await Promise.all([
        this.checkDatabase(),
        this.checkMemoryUsage(),
        this.checkUptime(),
        this.checkProviders(),
        this.checkPerformance(),
      ]);

      const [
        dbCheck,
        memoryCheck,
        uptimeCheck,
        providersCheck,
        performanceCheck,
      ] = checks;

      const hasError = checks.some((check) => check.status === 'error');
      const hasWarning = checks.some((check) => check.status === 'warning');

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
        error: {},
        details: {
          environment: process.env.NODE_ENV || 'development',
          hostname: os.hostname(),
        },
      };

      if (status === 'error') {
        const errors = {};
        if (dbCheck.status === 'error') errors['database'] = dbCheck.error;
        if (memoryCheck.status === 'error')
          errors['memory'] = memoryCheck.error;
        if (uptimeCheck.status === 'error')
          errors['uptime'] = uptimeCheck.error;

        result.error = errors;
        throw new HttpException(result, HttpStatus.SERVICE_UNAVAILABLE);
      }

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Health check failed', error);
      throw new HttpException(
        {
          status: 'error',
          error: { message: error.message },
        },
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
        {
          status: 'error',
          error: { message: 'Service not ready' },
        },
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
      this.logger.error('Database health check failed', error);
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  private checkMemoryUsage() {
    try {
      const memoryUsage = process.memoryUsage();
      const usedHeapSize = memoryUsage.heapUsed / 1024 / 1024;
      const totalHeapSize = memoryUsage.heapTotal / 1024 / 1024;

      const threshold = totalHeapSize * 0.8;

      return {
        status: usedHeapSize < threshold ? 'ok' : 'warning',
        usage: Math.round(usedHeapSize * 100) / 100,
        threshold: Math.round(threshold * 100) / 100,
        totalHeap: Math.round(totalHeapSize * 100) / 100,
        percentUsed: Math.round((usedHeapSize / totalHeapSize) * 100),
      };
    } catch (error) {
      this.logger.error('Memory health check failed', error);
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  private checkUptime() {
    try {
      const uptime = Math.floor((Date.now() - this.startTime) / 1000);
      return {
        status: 'ok',
        value: uptime,
      };
    } catch (error) {
      this.logger.error('Uptime health check failed', error);
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  private async checkProviders() {
    try {
      const providers = [
        'google-cloud',
        'dropbox',
        'mega',
        'google-drive',
        'backblaze',
        'onedrive',
      ];
      const providerChecks = await Promise.allSettled(
        providers.map(async (provider) => {
          try {
            const start = Date.now();
            const storageProvider =
              await this.cloudStorageFactory.getProvider(provider);

            // Simple connectivity test - try to list files
            await storageProvider.listFiles();
            const responseTime = Date.now() - start;

            return {
              provider,
              status: responseTime < 3000 ? 'ok' : 'warning',
              responseTime,
            };
          } catch (error) {
            return {
              provider,
              status: 'error',
              error: error.message,
            };
          }
        }),
      );

      const results = providerChecks.map((check, index) => {
        if (check.status === 'fulfilled') {
          return check.value;
        } else {
          return {
            provider: providers[index],
            status: 'error',
            error: check.reason?.message || 'Unknown error',
          };
        }
      });

      const healthyProviders = results.filter((r) => r.status === 'ok').length;
      const totalProviders = results.length;
      const overallStatus =
        healthyProviders === totalProviders
          ? 'ok'
          : healthyProviders > totalProviders / 2
            ? 'warning'
            : 'error';

      return {
        status: overallStatus,
        healthy: healthyProviders,
        total: totalProviders,
        providers: results,
      };
    } catch (error) {
      this.logger.error('Provider health check failed', error);
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  private checkPerformance() {
    try {
      const systemMetrics = this.metricsService.getSystemMetrics();
      const providerPerformance = this.metricsService.getProviderPerformance();

      const unhealthyProviders = providerPerformance.filter(
        (p) => p.status === 'unhealthy',
      ).length;
      const degradedProviders = providerPerformance.filter(
        (p) => p.status === 'degraded',
      ).length;

      let status = 'ok';
      if (unhealthyProviders > 0 || systemMetrics.successRate < 80) {
        status = 'error';
      } else if (
        degradedProviders > 0 ||
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
          degraded: degradedProviders,
          unhealthy: unhealthyProviders,
        },
      };
    } catch (error) {
      this.logger.error('Performance health check failed', error);
      return {
        status: 'error',
        error: error.message,
      };
    }
  }
}
