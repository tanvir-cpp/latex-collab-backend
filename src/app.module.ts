import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { buildDatabaseOptions } from './config/database.config.js';
import { validateEnv } from './config/env.validation.js';
import { AuthModule } from './module/auth/auth.module.js';
import { DocumentsModule } from './module/documents/documents.module.js';
import { MailModule } from './module/mail/mail.module.js';
import { ProjectsModule } from './module/projects/projects.module.js';
import { UsersModule } from './module/users/users.module.js';
import { WorkspacesModule } from './module/workspaces/workspaces.module.js';

@Module({
  imports: [
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
  ],
  controllers: [AppController],
})
export class AppModule {}
