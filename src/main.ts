import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as express from 'express';
import { CloudStorageFilter } from './common/filters/cloud-storage.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PerformanceInterceptor } from './monitoring/performance.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Multi-Cloud Storage API')
    .setDescription('API for managing files across multiple cloud providers')
    .setVersion('1.0')
    .addTag('storage')
    .addTag('monitoring')
    .addTag('health')
    .addTag('Authentication')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const performanceInterceptor = app.get(PerformanceInterceptor);
  app.useGlobalFilters(new CloudStorageFilter());
  app.useGlobalInterceptors(performanceInterceptor);

  await app.listen(3000);
}

bootstrap();
