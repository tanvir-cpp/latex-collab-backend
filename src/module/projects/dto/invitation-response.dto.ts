import { ApiProperty } from '@nestjs/swagger';
import { ProjectInvitation } from '../entities/project-invitation.entity.js';
import { ProjectRole } from '../project-role.enum.js';

export class InvitationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() projectId: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: ProjectRole }) role: ProjectRole;
  @ApiProperty() expiresAt: Date;
  @ApiProperty() createdAt: Date;

  static from(invitation: ProjectInvitation): InvitationResponseDto {
    const dto = new InvitationResponseDto();
    dto.id = invitation.id;
    dto.projectId = invitation.projectId;
    dto.email = invitation.email;
    dto.role = invitation.role;
    dto.expiresAt = invitation.expiresAt;
    dto.createdAt = invitation.createdAt;
    return dto;
  }
}
