import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto.js';
import { Workspace } from './entities/workspace.entity.js';

/** Workspaces group a user's projects. Only the owner can see or change one. */
@Injectable()
export class WorkspacesService {
  constructor(@InjectRepository(Workspace) private readonly workspaces: Repository<Workspace>) {}

  create(ownerId: string, dto: CreateWorkspaceDto): Promise<Workspace> {
    return this.workspaces.save(this.workspaces.create({ name: dto.name, description: dto.description ?? '', ownerId }));
  }

  findAllForOwner(ownerId: string): Promise<Workspace[]> {
    return this.workspaces.find({ where: { ownerId }, order: { createdAt: 'DESC' } });
  }

  async getOwned(id: string, ownerId: string): Promise<Workspace> {
    const workspace = await this.workspaces.findOneBy({ id, ownerId });
    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }

  async update(id: string, ownerId: string, dto: UpdateWorkspaceDto): Promise<Workspace> {
    if (Object.keys(dto).length > 0) {
      const result = await this.workspaces.update({ id, ownerId }, dto);
      if (!result.affected) throw new NotFoundException('Workspace not found');
    }
    return this.getOwned(id, ownerId);
  }

  /** Projects in the workspace are kept (their workspace link is cleared by the database). */
  async remove(id: string, ownerId: string): Promise<void> {
    const result = await this.workspaces.delete({ id, ownerId });
    if (!result.affected) throw new NotFoundException('Workspace not found');
  }
}
