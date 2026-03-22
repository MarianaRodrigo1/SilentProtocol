import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { PUBLIC_DIR, UPLOADS_DIR } from './common/constants';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/', (_req: Request, res: Response) => {
    res.redirect(302, '/agent-tracker.html');
  });
  const corsOrigins = (
    process.env.CORS_ORIGINS ??
    'http://localhost:8081,http://localhost:19006,http://127.0.0.1:8081,http://127.0.0.1:19006'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowAnyOrigin = corsOrigins.includes('*');
  app.enableCors({
    origin: allowAnyOrigin ? true : corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useStaticAssets(PUBLIC_DIR, { prefix: '/' });
  app.useStaticAssets(UPLOADS_DIR, { prefix: '/uploads/' });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Silent Protocol API')
    .setDescription('Technical challenge backend API')
    .setVersion('1.0.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
