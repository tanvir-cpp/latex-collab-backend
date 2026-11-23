import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { buildDatabaseOptions } from './config/database.config.js';
import { validateEnv } from './config/env.validation.js';
import { AiModule } from './module/ai/ai.module.js';
import { AuthModule } from './module/auth/auth.module.js';
import { ChatModule } from './module/chat/chat.module.js';
import { DocumentsModule } from './module/documents/documents.module.js';
import { MailModule } from './module/mail/mail.module.js';
import { NotificationsModule } from './module/notifications/notifications.module.js';
import { ProjectsModule } from './module/projects/projects.module.js';
import { RealtimeModule } from './module/realtime/realtime.module.js';
import { UsersModule } from './module/users/users.module.js';
import { WorkspacesModule } from './module/workspaces/workspaces.module.js';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: buildDatabaseOptions,
    }),
    MailModule,
    UsersModule,
    AuthModule,
    WorkspacesModule,
    ProjectsModule,
    DocumentsModule,
    ChatModule,
    RealtimeModule,
    NotificationsModule,
    AiModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
