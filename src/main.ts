import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { SocketIoAdapter } from './common/adapters/socket-io.adapter.js';
import { configureApp, setupSwagger } from './app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  configureApp(app);
  const frontendUrl = config.getOrThrow<string>('FRONTEND_URL');
  app.enableCors({ origin: frontendUrl, credentials: true });
  app.useWebSocketAdapter(new SocketIoAdapter(app, frontendUrl));
  app.enableShutdownHooks();
  setupSwagger(app);

  await app.listen(config.getOrThrow<number>('PORT'));
}
await bootstrap();
