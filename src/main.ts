import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // Serve the read-only console (public/index.html) at the root path.
  app.useStaticAssets(join(__dirname, '..', 'public'));

  const port = Number(process.env.APP_PORT ?? 3000);
  const host = process.env.APP_HOST ?? '0.0.0.0';
  await app.listen(port, host);

  Logger.log(`Endpoint Management API listening on http://${host}:${port}`, 'Bootstrap');
  Logger.log(`Console available at http://${host}:${port}/`, 'Bootstrap');
}

bootstrap().catch((error: unknown) => {
  Logger.error(
    'Application failed to start',
    error instanceof Error ? error.stack : String(error),
    'Bootstrap',
  );
  process.exit(1);
});
