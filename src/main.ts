import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CloudStorageFilter } from './common/filters/cloud-storage.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Multi-Cloud Storage API')
    .setDescription('API for managing files across multiple cloud providers')
    .setVersion('1.0')
    .addTag('storage')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.useGlobalFilters(new CloudStorageFilter());
  await app.listen(3000);
}
bootstrap();
