import { ApiProperty } from '@nestjs/swagger';
import { Document } from '../entities/document.entity.js';

/** Explicit shape so internal columns (the Yjs state) never reach API clients. */
export class DocumentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() projectId: string;
  @ApiProperty() path: string;
  @ApiProperty() content: string;
  @ApiProperty({ nullable: true, type: String }) createdById: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static from(document: Document): DocumentResponseDto {
    const dto = new DocumentResponseDto();
    dto.id = document.id;
    dto.projectId = document.projectId;
    dto.path = document.path;
    dto.content = document.content;
    dto.createdById = document.createdById;
    dto.createdAt = document.createdAt;
    dto.updatedAt = document.updatedAt;
    return dto;
  }
}
