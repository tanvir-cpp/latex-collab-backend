import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, Repository } from 'typeorm';
import { WorkspacesService } from '../workspaces/workspaces.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { ProjectMember } from './entities/project-member.entity.js';
import { Project } from './entities/project.entity.js';
import { ProjectAccessService } from './project-access.service.js';
import { ProjectRole } from './project-role.enum.js';
import { MemberResponseDto, ProjectResponseDto } from './dto/project-response.dto.js';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(ProjectMember) private readonly members: Repository<ProjectMember>,
    private readonly access: ProjectAccessService,
    private readonly workspaces: WorkspacesService,
    private readonly dataSource: DataSource,
  ) {}

  async create(userId: string, dto: CreateProjectDto): Promise<ProjectResponseDto> {
    if (dto.workspaceId) await this.workspaces.getOwned(dto.workspaceId, userId);

    const project = await this.dataSource.transaction(async (manager) => {
      const created = await manager.save(
        manager.create(Project, {
          name: dto.name,
          description: dto.description ?? '',
          workspaceId: dto.workspaceId ?? null,
          ownerId: userId,
        }),
      );
      await manager.save(
        manager.create(ProjectMember, { projectId: created.id, userId, role: ProjectRole.Owner }),
      );
      return created;
    });
    return ProjectResponseDto.from(project, ProjectRole.Owner);
  }

  /** Projects the user owns or was invited to. */
  async listForUser(userId: string, workspaceId?: string): Promise<ProjectResponseDto[]> {
    const memberships = await this.members.find({
      where: { userId, ...(workspaceId ? { project: { workspaceId } } : {}) },
      relations: { project: true },
      order: { project: { updatedAt: 'DESC' } },
    });
    return memberships.map((m) => ProjectResponseDto.from(m.project, m.role));
  }

  async getForUser(projectId: string, userId: string): Promise<ProjectResponseDto> {
    const role = await this.access.assertRole(projectId, userId, ProjectRole.Viewer);
    const project = await this.projects.findOneBy({ id: projectId });
    if (!project) throw new NotFoundException('Project not found');
    return ProjectResponseDto.from(project, role);
  }

  async update(projectId: string, userId: string, dto: UpdateProjectDto): Promise<ProjectResponseDto> {
    await this.access.assertRole(projectId, userId, ProjectRole.Owner);
    if (Object.keys(dto).length > 0) {
      const result = await this.projects.update({ id: projectId }, dto);
      if (!result.affected) throw new NotFoundException('Project not found');
    }
    return this.getForUser(projectId, userId);
  }

  async remove(projectId: string, userId: string): Promise<void> {
    await this.access.assertRole(projectId, userId, ProjectRole.Owner);
    await this.projects.delete({ id: projectId });
  }

  async listMembers(projectId: string, userId: string): Promise<MemberResponseDto[]> {
    await this.access.assertRole(projectId, userId, ProjectRole.Viewer);
    const members = await this.members.find({
      where: { projectId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
    return members.map((m) => MemberResponseDto.from(m));
  }

  async updateMemberRole(
    projectId: string,
    actorId: string,
    targetUserId: string,
    role: ProjectRole,
  ): Promise<void> {
    await this.access.assertRole(projectId, actorId, ProjectRole.Owner);
    const result = await this.members.update(
      { projectId, userId: targetUserId, role: Not(ProjectRole.Owner) },
      { role },
    );
    if (!result.affected) throw new NotFoundException('Member not found');
  }

  /** Owners remove anyone but themselves; any member may leave. */
  async removeMember(projectId: string, actorId: string, targetUserId: string): Promise<void> {
    if (actorId === targetUserId) {
      const role = await this.access.assertRole(projectId, actorId, ProjectRole.Viewer);
      if (role === ProjectRole.Owner) {
        throw new BadRequestException('The owner cannot leave; delete the project instead');
      }
    } else {
      await this.access.assertRole(projectId, actorId, ProjectRole.Owner);
    }
    const result = await this.members.delete({
      projectId,
      userId: targetUserId,
      role: Not(ProjectRole.Owner),
    });
    if (!result.affected) throw new NotFoundException('Member not found');
  }
}
