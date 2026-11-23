import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatModule } from '../chat/chat.module.js';
import { DocumentsModule } from '../documents/documents.module.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { UsersModule } from '../users/users.module.js';
import { CollabService } from './collab.service.js';
import { RealtimeBroadcaster } from './realtime-broadcaster.service.js';
import { RealtimeGateway } from './realtime.gateway.js';
import { WsAuthService } from './ws-auth.service.js';

@Module({
  imports: [JwtModule.register({}), UsersModule, DocumentsModule, ProjectsModule, ChatModule],
  providers: [RealtimeGateway, CollabService, WsAuthService, RealtimeBroadcaster],
  exports: [RealtimeBroadcaster],
})
export class RealtimeModule {}
