import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express'; // 1. Shuni olib kiramiz
import { join } from 'path'; // 2. path-dan join-ni olamiz

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(new ValidationPipe());
app.enableCors();
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/upload', // Brauzerdagi manzili: /upload/...
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();