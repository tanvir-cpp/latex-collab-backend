import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ListProjectsQueryDto {
  @ApiPropertyOptional({ description: 'Only projects in this workspace' })
  @IsOptional()
  @IsUUID()
  workspaceId?: string;
}
