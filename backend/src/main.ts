// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const port = config.get<number>('PORT') ?? 3000;
  const apiPrefix = config.get<string>('API_PREFIX') ?? 'api';
  const corsOriginRaw = config.get<string>('CORS_ORIGIN') ?? '';
  const corsOrigins = corsOriginRaw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Global API prefix — /agents yerine /api/agents
  app.setGlobalPrefix(apiPrefix);

  // CORS — virgüllü liste: birden fazla origin desteği (prod + preview)
  app.enableCors({
    origin: corsOrigins.length > 1 ? corsOrigins : corsOrigins[0],
    credentials: true,
  });

  // Global validation — DTO'ları class-validator ile doğrula
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // DTO'da olmayan field'ları at
      forbidNonWhitelisted: true,   // DTO'da olmayan field varsa hata
      transform: true,              // Payload'ı DTO tipine çevir
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Estate Agency Transaction API')
    .setDescription(
      'API for managing real estate transaction lifecycles and commission distribution.',
    )
    .setVersion('1.0')
    .addTag('agents')
    .addTag('properties')
    .addTag('transactions')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  await app.listen(port);
  logger.log(`🚀 Application running on http://localhost:${port}/${apiPrefix}`);
  logger.log(`📚 Swagger docs at http://localhost:${port}/${apiPrefix}/docs`);
}

bootstrap();