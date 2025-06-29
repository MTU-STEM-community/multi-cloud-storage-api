import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ApiStandardResponses } from '../../common/decorators/base-api.decorator';

export const ApiLogin = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Admin login',
      description: 'Authenticate admin user and receive JWT token',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: {
            type: 'string',
            example: 'admin',
            description: 'Admin username',
          },
          password: {
            type: 'string',
            example: 'password123',
            description: 'Admin password',
          },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Login successful',
      schema: {
        type: 'object',
        properties: {
          access_token: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            description: 'JWT access token',
          },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'clp1234567890abcdef' },
              username: { type: 'string', example: 'admin' },
              email: { type: 'string', example: 'admin@example.com' },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Invalid credentials',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Invalid credentials' },
        },
      },
    }),
    ApiStandardResponses(),
  );

export const ApiRegister = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Register new admin user',
      description: 'Create a new admin user account',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: {
            type: 'string',
            example: 'admin',
            description: 'Unique username',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'admin@example.com',
            description: 'Unique email address',
          },
          password: {
            type: 'string',
            minLength: 6,
            example: 'password123',
            description: 'Password (minimum 6 characters)',
          },
        },
      },
    }),
    ApiResponse({
      status: 201,
      description: 'User registered successfully',
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'clp1234567890abcdef' },
          username: { type: 'string', example: 'admin' },
          email: { type: 'string', example: 'admin@example.com' },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Username or email already exists',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Username or email already exists' },
        },
      },
    }),
    ApiStandardResponses(),
  );

export const ApiGetProfile = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get current user profile',
      description: 'Retrieve the authenticated user profile information',
    }),
    ApiResponse({
      status: 200,
      description: 'User profile retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'clp1234567890abcdef' },
          username: { type: 'string', example: 'admin' },
          email: { type: 'string', example: 'admin@example.com' },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - Invalid or missing JWT token',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
    ApiStandardResponses(),
  );

export const ApiChangePassword = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Change user password',
      description: 'Change the authenticated user password',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: {
            type: 'string',
            example: 'admin123',
            description: 'Current password',
          },
          newPassword: {
            type: 'string',
            minLength: 6,
            example: 'newSecurePassword123',
            description: 'New password (minimum 6 characters)',
          },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Password changed successfully',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Password changed successfully' },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Current password is incorrect or user unauthorized',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Current password is incorrect' },
        },
      },
    }),
    ApiStandardResponses(),
  );
