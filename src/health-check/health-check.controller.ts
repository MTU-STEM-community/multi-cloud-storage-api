import { Controller, Get } from '@nestjs/common';
import { HealthCheckService } from './health-check.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthCheckController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  @Get()
  @ApiOperation({ summary: 'Check application health status' })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'ok',
          description: 'Health status (ok, warning, error)',
        },
        info: {
          type: 'object',
          description: 'Detailed health information for each component',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                responseTime: { type: 'number' },
              },
            },
            memory: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                usage: { type: 'number' },
                threshold: { type: 'number' },
              },
            },
            uptime: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                value: { type: 'number' },
              },
            },
          },
        },
        error: {
          type: 'object',
          description: 'Error details if any component is unhealthy',
        },
        details: {
          type: 'object',
          description: 'Additional health check details',
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        error: { type: 'object' },
      },
    },
  })
  async check() {
    return this.healthCheckService.checkHealth();
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Basic liveness probe' })
  @ApiResponse({
    status: 200,
    description: 'Application is live',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiResponse({
    status: 200,
    description: 'Application is ready to accept traffic',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number' },
      },
    },
  })
  async readiness() {
    return this.healthCheckService.checkReadiness();
  }
}
