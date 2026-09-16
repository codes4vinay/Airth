import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()

    .setTitle('Job Queue Management API')
    .setDescription('REST API for the Job Queue Management Dashboard')
    .setVersion('1.0')
    .addTag('jobs')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`Backend server running on http://localhost:${port}`);
  logger.log(
    `Swagger documentation available at http://localhost:${port}/docs`,
  );

  // Self-ping every 14 minutes to prevent Render free-tier instance from sleeping (Render sleeps after 15m inactivity)
  const renderExternalUrl =
    process.env.RENDER_EXTERNAL_URL ||
    process.env.BACKEND_URL ||
    'https://airth-job-queue-backend-q1fp.onrender.com';

  if (process.env.NODE_ENV === 'production' && renderExternalUrl) {
    const FOURTEEN_MINUTES_MS = 14 * 60 * 1000;
    const healthUrl = `${renderExternalUrl.replace(/\/$/, '')}/health`;

    setInterval(async () => {
      try {
        const res = await fetch(healthUrl);
        logger.log(`Keep-alive ping to ${healthUrl}: status ${res.status}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn(`Keep-alive ping failed: ${message}`);
      }
    }, FOURTEEN_MINUTES_MS);

    logger.log(`Scheduled 14-minute keep-alive ping to ${healthUrl}`);
  }
}

bootstrap();
