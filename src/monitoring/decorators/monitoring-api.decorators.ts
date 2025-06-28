import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';

export function ApiSystemMetrics() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get overall system performance metrics',
      description:
        'Returns comprehensive system performance data including response times, success rates, memory usage, and uptime statistics for the last 24 hours',
    }),
    ApiResponse({
      status: 200,
      description: 'System performance metrics retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          totalRequests: {
            type: 'number',
            example: 1250,
            description: 'Total number of requests in the last 24 hours',
          },
          averageResponseTime: {
            type: 'number',
            example: 850,
            description: 'Average response time in milliseconds',
          },
          successRate: {
            type: 'number',
            example: 98.5,
            description: 'Success rate percentage',
          },
          activeConnections: {
            type: 'number',
            example: 12,
            description: 'Number of active connections',
          },
          memoryUsage: {
            type: 'object',
            properties: {
              used: {
                type: 'number',
                example: 125.5,
                description: 'Used memory in MB',
              },
              total: {
                type: 'number',
                example: 512.0,
                description: 'Total memory in MB',
              },
              percentage: {
                type: 'number',
                example: 24.5,
                description: 'Memory usage percentage',
              },
            },
          },
          uptime: {
            type: 'number',
            example: 86400,
            description: 'System uptime in seconds',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp when metrics were collected',
          },
        },
      },
    }),
    ApiInternalServerErrorResponse({
      description: 'Internal server error while retrieving system metrics',
    }),
  );
}

export function ApiProviderPerformance() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get provider-specific performance metrics',
      description:
        'Returns performance data for each cloud storage provider including response times, success rates, and health status for the last 24 hours',
    }),
    ApiResponse({
      status: 200,
      description: 'Provider performance metrics retrieved successfully',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              example: 'google-cloud',
              description: 'Cloud storage provider name',
            },
            averageResponseTime: {
              type: 'number',
              example: 750,
              description: 'Average response time in milliseconds',
            },
            successRate: {
              type: 'number',
              example: 99.2,
              description: 'Success rate percentage',
            },
            totalOperations: {
              type: 'number',
              example: 450,
              description: 'Total number of operations performed',
            },
            lastChecked: {
              type: 'string',
              format: 'date-time',
              description: 'Last time provider was checked',
            },
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'],
              example: 'healthy',
              description: 'Provider health status',
            },
          },
        },
      },
    }),
    ApiInternalServerErrorResponse({
      description: 'Internal server error while retrieving provider metrics',
    }),
  );
}

export function ApiPerformanceSummary() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get hourly performance summary',
      description:
        'Returns performance summary for different operations (upload, download, delete, list) in the last hour',
    }),
    ApiResponse({
      status: 200,
      description: 'Performance summary retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            example: 'last_hour',
            description: 'Time period for the summary',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp when summary was generated',
          },
          totalOperations: {
            type: 'number',
            example: 125,
            description: 'Total number of operations in the period',
          },
          operations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  example: 'upload',
                  description: 'Type of operation',
                },
                count: {
                  type: 'number',
                  example: 45,
                  description: 'Number of operations of this type',
                },
                averageTime: {
                  type: 'number',
                  example: 1200,
                  description: 'Average time in milliseconds',
                },
                successRate: {
                  type: 'number',
                  example: 97.8,
                  description: 'Success rate percentage for this operation',
                },
              },
            },
          },
        },
      },
    }),
    ApiInternalServerErrorResponse({
      description: 'Internal server error while retrieving performance summary',
    }),
  );
}

export function ApiDetailedMetrics() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get detailed performance metrics',
      description:
        'Returns detailed performance metrics with optional filtering by time period, operation type, and provider',
    }),
    ApiQuery({
      name: 'hours',
      required: false,
      description: 'Number of hours to look back (default: 24)',
      example: 24,
    }),
    ApiQuery({
      name: 'operation',
      required: false,
      description: 'Filter by operation type (upload, download, delete, etc.)',
      example: 'upload',
    }),
    ApiQuery({
      name: 'provider',
      required: false,
      description: 'Filter by cloud storage provider',
      example: 'google-cloud',
    }),
    ApiResponse({
      status: 200,
      description: 'Detailed metrics retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          metrics: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                operation: { type: 'string', example: 'upload' },
                provider: { type: 'string', example: 'dropbox' },
                duration: { type: 'number', example: 1250 },
                timestamp: { type: 'string', format: 'date-time' },
                success: { type: 'boolean', example: true },
                fileSize: { type: 'number', example: 1048576 },
                error: { type: 'string', example: 'Network timeout' },
              },
            },
          },
          summary: {
            type: 'object',
            properties: {
              totalMetrics: { type: 'number', example: 150 },
              averageResponseTime: { type: 'number', example: 950 },
              successRate: { type: 'number', example: 96.7 },
              timeRange: { type: 'string', example: 'last_24_hours' },
            },
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid query parameters',
    }),
    ApiInternalServerErrorResponse({
      description: 'Internal server error while retrieving detailed metrics',
    }),
  );
}

export function ApiSlowOperations() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get slow operations',
      description:
        'Returns operations that took longer than the specified threshold, useful for identifying performance bottlenecks',
    }),
    ApiQuery({
      name: 'threshold',
      required: false,
      description: 'Minimum duration in milliseconds (default: 5000)',
      example: 5000,
    }),
    ApiQuery({
      name: 'hours',
      required: false,
      description: 'Number of hours to look back (default: 24)',
      example: 24,
    }),
    ApiResponse({
      status: 200,
      description: 'Slow operations retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          threshold: { type: 'number', example: 5000 },
          timeRange: { type: 'string', example: 'last_24_hours' },
          slowOperations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                operation: { type: 'string', example: 'upload' },
                provider: { type: 'string', example: 'mega' },
                duration: { type: 'number', example: 8500 },
                timestamp: { type: 'string', format: 'date-time' },
                success: { type: 'boolean', example: false },
                error: { type: 'string', example: 'Connection timeout' },
              },
            },
          },
          summary: {
            type: 'object',
            properties: {
              totalSlowOperations: { type: 'number', example: 15 },
              slowestOperation: { type: 'number', example: 12000 },
              averageSlowDuration: { type: 'number', example: 7200 },
            },
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid threshold or hours parameter',
    }),
    ApiInternalServerErrorResponse({
      description: 'Internal server error while retrieving slow operations',
    }),
  );
}

export function ApiPerformanceDashboard() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get performance dashboard data',
      description:
        'Returns comprehensive dashboard data including system metrics, provider performance, recent activity, and alerts for monitoring overview',
    }),
    ApiResponse({
      status: 200,
      description: 'Dashboard data retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          timestamp: { type: 'string', format: 'date-time' },
          system: {
            type: 'object',
            description: 'Overall system performance metrics',
          },
          providers: {
            type: 'array',
            description: 'Performance data for each cloud provider',
          },
          hourlyActivity: {
            type: 'object',
            description: 'Activity summary for the last hour',
          },
          alerts: {
            type: 'object',
            properties: {
              slowOperations: { type: 'number', example: 3 },
              unhealthyProviders: { type: 'number', example: 0 },
              degradedProviders: { type: 'number', example: 1 },
              lowSuccessRate: { type: 'boolean', example: false },
            },
          },
          recentSlowOperations: {
            type: 'array',
            description: 'Recent operations that were slower than normal',
          },
        },
      },
    }),
    ApiInternalServerErrorResponse({
      description: 'Internal server error while retrieving dashboard data',
    }),
  );
}
