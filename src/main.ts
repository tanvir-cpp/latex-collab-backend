import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp, setupSwagger } from './app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  configureApp(app);
  app.enableCors({ origin: config.getOrThrow<string>('FRONTEND_URL'), credentials: true });
  app.enableShutdownHooks();
  setupSwagger(app);

  await app.listen(config.getOrThrow<number>('PORT'));
}
await bootstrap();
