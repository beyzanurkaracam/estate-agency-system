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

  app.setGlobalPrefix(apiPrefix);

  app.enableCors({
    origin: corsOrigins.length > 1 ? corsOrigins : corsOrigins[0],
    credentials: true,
  });

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

  app.useGlobalFilters(new AllExceptionsFilter());

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