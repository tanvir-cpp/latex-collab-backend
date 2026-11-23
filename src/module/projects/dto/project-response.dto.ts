import { ApiProperty } from '@nestjs/swagger';
import { ProjectMember } from '../entities/project-member.entity.js';
import { Project } from '../entities/project.entity.js';
import { ProjectRole } from '../project-role.enum.js';

export class ProjectResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() description: string;
  @ApiProperty() ownerId: string;
  @ApiProperty({ nullable: true, type: String }) workspaceId: string | null;
  @ApiProperty({ enum: ProjectRole, description: 'Role of the requesting user' }) myRole: ProjectRole;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static from(project: Project, myRole: ProjectRole): ProjectResponseDto {
    const dto = new ProjectResponseDto();
    dto.id = project.id;
    dto.name = project.name;
    dto.description = project.description;
    dto.ownerId = project.ownerId;
    dto.workspaceId = project.workspaceId;
    dto.myRole = myRole;
    dto.createdAt = project.createdAt;
    dto.updatedAt = project.updatedAt;
    return dto;
  }
}

export class MemberResponseDto {
  @ApiProperty() userId: string;
  @ApiProperty() email: string;
  @ApiProperty() fullName: string;
  @ApiProperty({ enum: ProjectRole }) role: ProjectRole;
  @ApiProperty() joinedAt: Date;

  static from(member: ProjectMember): MemberResponseDto {
    const dto = new MemberResponseDto();
    dto.userId = member.userId;
    dto.email = member.user.email;
    dto.fullName = member.user.fullName;
    dto.role = member.role;
    dto.joinedAt = member.createdAt;
    return dto;
  }
}
