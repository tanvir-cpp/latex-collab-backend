import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { ProjectMember } from './entities/project-member.entity.js';
import { ProjectAccessService } from './project-access.service.js';
import { hasAtLeast, ProjectRole } from './project-role.enum.js';

describe('hasAtLeast', () => {
  it('orders viewer < editor < owner', () => {
    expect(hasAtLeast(ProjectRole.Owner, ProjectRole.Editor)).toBe(true);
    expect(hasAtLeast(ProjectRole.Editor, ProjectRole.Editor)).toBe(true);
    expect(hasAtLeast(ProjectRole.Viewer, ProjectRole.Editor)).toBe(false);
    expect(hasAtLeast(ProjectRole.Editor, ProjectRole.Owner)).toBe(false);
  });
});

describe('ProjectAccessService', () => {
  const findOneBy = vi.fn();
  const service = new ProjectAccessService({ findOneBy } as unknown as Repository<ProjectMember>);

  it('returns the role when it is sufficient', async () => {
    findOneBy.mockResolvedValue({ role: ProjectRole.Editor });
    await expect(service.assertRole('p', 'u', ProjectRole.Viewer)).resolves.toBe(ProjectRole.Editor);
  });

  it('hides the project from non-members with 404', async () => {
    findOneBy.mockResolvedValue(null);
    await expect(service.assertRole('p', 'u', ProjectRole.Viewer)).rejects.toThrow(NotFoundException);
  });

  it('answers 403 when a member lacks the required role', async () => {
    findOneBy.mockResolvedValue({ role: ProjectRole.Viewer });
    await expect(service.assertRole('p', 'u', ProjectRole.Editor)).rejects.toThrow(ForbiddenException);
  });
});
