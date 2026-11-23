import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMember } from './entities/project-member.entity.js';
import { hasAtLeast, ProjectRole } from './project-role.enum.js';

/**
 * Single place that answers "may this user do X in this project?".
 * Documents, the realtime gateway and chat all go through it.
 */
@Injectable()
export class ProjectAccessService {
  constructor(@InjectRepository(ProjectMember) private readonly members: Repository<ProjectMember>) {}

  async getRole(projectId: string, userId: string): Promise<ProjectRole | null> {
    const member = await this.members.findOneBy({ projectId, userId });
    return member?.role ?? null;
  }

  /**
   * Returns the user's role, or throws. Non-members get 404 so project ids
   * can't be probed; members with too low a role get 403.
   */
  async assertRole(projectId: string, userId: string, minimum: ProjectRole): Promise<ProjectRole> {
    const role = await this.getRole(projectId, userId);
    if (!role) throw new NotFoundException('Project not found');
    if (!hasAtLeast(role, minimum)) {
      throw new ForbiddenException('You do not have permission to do this in this project');
    }
    return role;
  }
}
