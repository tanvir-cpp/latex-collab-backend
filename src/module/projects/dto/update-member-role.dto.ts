import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ProjectRole } from '../project-role.enum.js';

/** Owners are not assignable: a project has exactly one, its creator. */
export const ASSIGNABLE_ROLES = [ProjectRole.Editor, ProjectRole.Viewer] as const;

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ASSIGNABLE_ROLES })
  @IsIn(ASSIGNABLE_ROLES)
  role: (typeof ASSIGNABLE_ROLES)[number];
}
