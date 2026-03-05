import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiStandardResponses } from '../../common/decorators/base-api.decorator';

export const ApiLogin = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Authenticate user',
      description:
        'Authenticate with username and password to receive a JWT access token',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'admin' },
          password: { type: 'string', example: 'SecurePass123' },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Authentication successful',
      schema: {
        type: 'object',
        properties: {
          access_token: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              username: { type: 'string' },
              email: { type: 'string' },
            },
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Invalid credentials' }),
    ApiResponse({ status: 429, description: 'Too many login attempts' }),
    ApiStandardResponses(),
  );

export const ApiRegister = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Register a new user',
      description: 'Create a new user account',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: {
            type: 'string',
            minLength: 3,
            maxLength: 50,
            example: 'john_doe',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'john@example.com',
          },
          password: {
            type: 'string',
            minLength: 8,
            example: 'SecurePass123',
            description:
              'Minimum 8 characters, must contain at least one uppercase letter and one number',
          },
        },
      },
    }),
    ApiResponse({ status: 201, description: 'User registered successfully' }),
    ApiResponse({
      status: 409,
      description: 'Username or email already exists',
    }),
    ApiStandardResponses(),
  );

export const ApiGetProfile = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Get current user profile',
      description: 'Retrieve the authenticated user profile',
    }),
    ApiResponse({ status: 200, description: 'Profile retrieved successfully' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiStandardResponses(),
  );

export const ApiChangePassword = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Change password',
      description: 'Change the authenticated user password',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', example: 'OldPass123' },
          newPassword: {
            type: 'string',
            minLength: 8,
            example: 'NewSecurePass123',
            description:
              'Minimum 8 characters, must contain at least one uppercase letter and one number',
          },
        },
      },
    }),
    ApiResponse({ status: 200, description: 'Password changed successfully' }),
    ApiResponse({ status: 401, description: 'Current password is incorrect' }),
    ApiStandardResponses(),
  );
