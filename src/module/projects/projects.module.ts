import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';
import { ProjectInvitation } from './entities/project-invitation.entity.js';
import { ProjectMember } from './entities/project-member.entity.js';
import { Project } from './entities/project.entity.js';
import { InvitationsController } from './invitations.controller.js';
import { InvitationsService } from './invitations.service.js';
import { ProjectAccessService } from './project-access.service.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectMember, ProjectInvitation]),
    UsersModule,
    WorkspacesModule,
  ],
  controllers: [ProjectsController, InvitationsController],
  providers: [ProjectsService, InvitationsService, ProjectAccessService],
  // ProjectAccessService is the permission contract used by documents, realtime and chat.
  exports: [ProjectAccessService, TypeOrmModule],
})
export class ProjectsModule {}
