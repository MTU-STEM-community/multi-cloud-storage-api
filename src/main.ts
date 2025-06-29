import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CloudStorageFilter } from './common/filters/cloud-storage.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PerformanceInterceptor } from './monitoring/performance.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  // Get performance interceptor from the app context
  const performanceInterceptor = app.get(PerformanceInterceptor);

  app.useGlobalFilters(new CloudStorageFilter());
  app.useGlobalInterceptors(performanceInterceptor);

  await app.listen(3000);
}
bootstrap();
