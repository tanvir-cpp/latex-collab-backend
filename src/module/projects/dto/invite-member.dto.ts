import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, MaxLength } from 'class-validator';
import { ProjectRole } from '../project-role.enum.js';
import { ASSIGNABLE_ROLES } from './update-member-role.dto.js';

export class InviteMemberDto {
  @ApiProperty({ example: 'grace@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ enum: ASSIGNABLE_ROLES, example: ProjectRole.Editor })
  @IsIn(ASSIGNABLE_ROLES)
  role: (typeof ASSIGNABLE_ROLES)[number];
}
