import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import {
  ApiStandardResponses,
} from '../../common/decorators/base-api.decorator';

export const ApiHealthCheck = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Check application health status',
      description: 'Comprehensive health check including database, memory, and uptime status',
    }),
    ApiResponse({
      status: 200,
      description: 'Application health status retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['ok', 'warning', 'error'],
            example: 'ok',
            description: 'Overall health status',
          },
          info: {
            type: 'object',
            description: 'Detailed health information for each component',
            properties: {
              database: {
                type: 'object',
                properties: {
                  status: { 
                    type: 'string', 
                    enum: ['ok', 'error'],
                    example: 'ok' 
                  },
                  responseTime: { 
                    type: 'number', 
                    example: 15,
                    description: 'Database response time in milliseconds'
                  },
                },
              },
              memory: {
                type: 'object',
                properties: {
                  status: { 
                    type: 'string', 
                    enum: ['ok', 'warning', 'error'],
                    example: 'ok' 
                  },
                  usage: { 
                    type: 'number', 
                    example: 45.2,
                    description: 'Memory usage percentage'
                  },
                  threshold: { 
                    type: 'number', 
                    example: 80,
                    description: 'Memory usage threshold percentage'
                  },
                },
              },
              uptime: {
                type: 'object',
                properties: {
                  status: { 
                    type: 'string', 
                    enum: ['ok'],
                    example: 'ok' 
                  },
                  value: { 
                    type: 'number', 
                    example: 3600,
                    description: 'Application uptime in seconds'
                  },
                },
              },
            },
          },
          error: {
            type: 'object',
            description: 'Error details if any component is unhealthy',
            example: {},
          },
          details: {
            type: 'object',
            description: 'Additional system information',
            properties: {
              environment: {
                type: 'string',
                example: 'production',
                description: 'Current environment'
              },
              hostname: {
                type: 'string',
                example: 'server-01',
                description: 'Server hostname'
              },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 503,
      description: 'Service Unavailable - Application is not healthy',
      schema: {
        type: 'object',
        properties: {
          status: { 
            type: 'string', 
            example: 'error',
            description: 'Health status indicating failure'
          },
          info: {
            type: 'object',
            description: 'Health information for components that are working',
          },
          error: { 
            type: 'object',
            description: 'Detailed error information for failed components',
            example: {
              database: 'Connection timeout after 5000ms',
              memory: 'Memory usage 95% exceeds threshold of 80%'
            }
          },
          details: {
            type: 'object',
            description: 'Additional system information',
          },
        },
      },
    }),
    ApiStandardResponses(),
  );

export const ApiLivenessCheck = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Basic liveness probe',
      description: 'Simple endpoint to verify the application is running and responsive',
    }),
    ApiResponse({
      status: 200,
      description: 'Application is alive and responsive',
      schema: {
        type: 'object',
        properties: {
          status: { 
            type: 'string', 
            example: 'ok',
            description: 'Liveness status'
          },
          timestamp: { 
            type: 'string', 
            format: 'date-time',
            example: '2024-06-24T21:30:00.000Z',
            description: 'Current server timestamp'
          },
        },
      },
    }),
    ApiStandardResponses(),
  );

export const ApiReadinessCheck = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Readiness probe',
      description: 'Check if application is ready to accept traffic and handle requests',
    }),
    ApiResponse({
      status: 200,
      description: 'Application is ready to accept traffic',
      schema: {
        type: 'object',
        properties: {
          status: { 
            type: 'string', 
            example: 'ok',
            description: 'Readiness status'
          },
          timestamp: { 
            type: 'string', 
            format: 'date-time',
            example: '2024-06-24T21:30:00.000Z',
            description: 'Current server timestamp'
          },
          uptime: { 
            type: 'number', 
            example: 3600,
            description: 'Application uptime in seconds'
          },
        },
      },
    }),
    ApiResponse({
      status: 503,
      description: 'Service Unavailable - Application is not ready',
      schema: {
        type: 'object',
        properties: {
          status: { 
            type: 'string', 
            example: 'error',
            description: 'Readiness status indicating not ready'
          },
          timestamp: { 
            type: 'string', 
            format: 'date-time'
          },
          error: {
            type: 'string',
            example: 'Database connection not available',
            description: 'Reason why application is not ready'
          },
        },
      },
    }),
    ApiStandardResponses(),
  );
