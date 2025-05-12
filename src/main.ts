import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CloudStorageFilter } from './filters/cloud-storage.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new CloudStorageFilter());
  await app.listen(3000);
}
bootstrap();
