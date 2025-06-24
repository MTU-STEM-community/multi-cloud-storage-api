import { Injectable, Logger, HttpStatus, HttpException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as os from 'os';

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private startTime: number;

  constructor(private readonly prisma: PrismaService) {
    this.startTime = Date.now();
  }

  async checkHealth() {
    try {
      const checks = await Promise.all([
        this.checkDatabase(),
        this.checkMemoryUsage(),
        this.checkUptime(),
      ]);

      const [dbCheck, memoryCheck, uptimeCheck] = checks;

      const hasError = checks.some((check) => check.status === 'error');
      const hasWarning = checks.some((check) => check.status === 'warning');

      const status = hasError ? 'error' : hasWarning ? 'warning' : 'ok';

      const result = {
        status,
        info: {
          database: dbCheck,
          memory: memoryCheck,
          uptime: uptimeCheck,
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
}
