import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { buildDatabaseOptions } from './config/database.config.js';
import { validateEnv } from './config/env.validation.js';
import { MailModule } from './module/mail/mail.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: buildDatabaseOptions,
    }),
    MailModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
