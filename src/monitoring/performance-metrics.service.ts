import { Injectable, Logger } from '@nestjs/common';

export interface PerformanceMetric {
  operation: string;
  provider?: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  fileSize?: number;
  error?: string;
}

export interface ProviderPerformance {
  provider: string;
  averageResponseTime: number;
  successRate: number;
  totalOperations: number;
  lastChecked: Date;
  status: 'healthy' | 'degraded' | 'unhealthy';
}

export interface SystemMetrics {
  totalRequests: number;
  averageResponseTime: number;
  successRate: number;
  activeConnections: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  uptime: number;
  timestamp: Date;
}

@Injectable()
export class PerformanceMetricsService {
  private readonly logger = new Logger(PerformanceMetricsService.name);
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 10000;
  private readonly startTime = Date.now();

  /**
   * Record a performance metric
   **/
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date(),
    };

    this.metrics.push(fullMetric);

    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    if (fullMetric.duration > 5000) {
      this.logger.warn(
        `Slow operation detected: ${fullMetric.operation} took ${fullMetric.duration}ms`,
        { metric: fullMetric },
      );
    }
  }

  /**
   * Get performance metrics for a specific time period
   */
  getMetrics(
    startTime?: Date,
    endTime?: Date,
    operation?: string,
    provider?: string,
  ): PerformanceMetric[] {
    let filteredMetrics = this.metrics;

    if (startTime) {
      filteredMetrics = filteredMetrics.filter((m) => m.timestamp >= startTime);
    }

    if (endTime) {
      filteredMetrics = filteredMetrics.filter((m) => m.timestamp <= endTime);
    }

    if (operation) {
      filteredMetrics = filteredMetrics.filter(
        (m) => m.operation === operation,
      );
    }

    if (provider) {
      filteredMetrics = filteredMetrics.filter((m) => m.provider === provider);
    }

    return filteredMetrics;
  }

  /**
   * Get provider-specific performance data
   */
  getProviderPerformance(): ProviderPerformance[] {
    const providers = [
      'google-cloud',
      'dropbox',
      'mega',
      'google-drive',
      'backblaze',
      'onedrive',
    ];
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return providers.map((provider) => {
      const providerMetrics = this.getMetrics(
        last24Hours,
        undefined,
        undefined,
        provider,
      );

      if (providerMetrics.length === 0) {
        return {
          provider,
          averageResponseTime: 0,
          successRate: 0,
          totalOperations: 0,
          lastChecked: new Date(),
          status: 'healthy' as const,
        };
      }

      const totalDuration = providerMetrics.reduce(
        (sum, m) => sum + m.duration,
        0,
      );
      const successfulOps = providerMetrics.filter((m) => m.success).length;
      const averageResponseTime = totalDuration / providerMetrics.length;
      const successRate = (successfulOps / providerMetrics.length) * 100;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (successRate < 50 || averageResponseTime > 10000) {
        status = 'unhealthy';
      } else if (successRate < 80 || averageResponseTime > 5000) {
        status = 'degraded';
      }

      return {
        provider,
        averageResponseTime: Math.round(averageResponseTime),
        successRate: Math.round(successRate * 100) / 100,
        totalOperations: providerMetrics.length,
        lastChecked: new Date(),
        status,
      };
    });
  }

  /**
   * Get overall system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentMetrics = this.getMetrics(last24Hours);

    const totalRequests = recentMetrics.length;
    const successfulRequests = recentMetrics.filter((m) => m.success).length;
    const totalDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0);

    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const memoryTotalMB = memoryUsage.heapTotal / 1024 / 1024;

    return {
      totalRequests,
      averageResponseTime:
        totalRequests > 0 ? Math.round(totalDuration / totalRequests) : 0,
      successRate:
        totalRequests > 0
          ? Math.round((successfulRequests / totalRequests) * 10000) / 100
          : 0,
      activeConnections: 0,
      memoryUsage: {
        used: Math.round(memoryUsedMB * 100) / 100,
        total: Math.round(memoryTotalMB * 100) / 100,
        percentage: Math.round((memoryUsedMB / memoryTotalMB) * 10000) / 100,
      },
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date(),
    };
  }

  getHourlyPerformanceSummary() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hourlyMetrics = this.getMetrics(oneHourAgo);

    const operations = [
      'upload',
      'download',
      'delete',
      'list',
      'bulk-upload',
      'bulk-delete',
    ];
    const summary = operations.map((operation) => {
      const opMetrics = hourlyMetrics.filter((m) =>
        m.operation.includes(operation),
      );
      const totalDuration = opMetrics.reduce((sum, m) => sum + m.duration, 0);
      const successfulOps = opMetrics.filter((m) => m.success).length;

      return {
        operation,
        count: opMetrics.length,
        averageTime:
          opMetrics.length > 0
            ? Math.round(totalDuration / opMetrics.length)
            : 0,
        successRate:
          opMetrics.length > 0
            ? Math.round((successfulOps / opMetrics.length) * 10000) / 100
            : 0,
      };
    });

    return {
      period: 'last_hour',
      timestamp: new Date(),
      operations: summary,
      totalOperations: hourlyMetrics.length,
    };
  }

  /**
   * Clear old metrics (cleanup job)
   */
  clearOldMetrics(olderThanDays: number = 7): number {
    const cutoffDate = new Date(
      Date.now() - olderThanDays * 24 * 60 * 60 * 1000,
    );
    const initialCount = this.metrics.length;

    this.metrics = this.metrics.filter((m) => m.timestamp >= cutoffDate);

    const removedCount = initialCount - this.metrics.length;
    if (removedCount > 0) {
      this.logger.log(
        `Cleaned up ${removedCount} old metrics older than ${olderThanDays} days`,
      );
    }

    return removedCount;
  }
}
