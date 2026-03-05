import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().required(),
  ENCRYPTION_SECRET: Joi.string().min(32).required(),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),

  ALLOWED_ORIGINS: Joi.string().optional(),

  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(100),

  GOOGLE_CLOUD_PROJECT_ID: Joi.string().optional(),
  GOOGLE_CLOUD_BUCKET_NAME: Joi.string().optional(),
  GOOGLE_CLOUD_KEYFILE_PATH: Joi.string().optional(),

  DROPBOX_ACCESS_TOKEN: Joi.string().optional(),

  MEGA_EMAIL: Joi.string().email().optional(),
  MEGA_PASSWORD: Joi.string().optional(),

  GOOGLE_DRIVE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_DRIVE_CLIENT_SECRET: Joi.string().optional(),
  GOOGLE_DRIVE_REFRESH_TOKEN: Joi.string().optional(),

  B2_KEY_ID: Joi.string().optional(),
  B2_APPLICATION_KEY: Joi.string().optional(),
  B2_BUCKET_NAME: Joi.string().optional(),
  B2_ACCOUNT_ID: Joi.string().optional(),

  ONEDRIVE_CLIENT_ID: Joi.string().optional(),
  ONEDRIVE_CLIENT_SECRET: Joi.string().optional(),
  ONEDRIVE_REFRESH_TOKEN: Joi.string().optional(),
  ONEDRIVE_TENANT_ID: Joi.string().optional(),
});
