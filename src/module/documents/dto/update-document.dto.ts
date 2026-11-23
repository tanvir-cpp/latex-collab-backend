import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import { DOCUMENT_PATH_MESSAGE, DOCUMENT_PATH_REGEX, MAX_DOCUMENT_CHARS } from '../document-limits.js';

export class UpdateDocumentDto {
  @ApiPropertyOptional({ description: 'Rename / move the file' })
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MaxLength(255)
  @Matches(DOCUMENT_PATH_REGEX, { message: DOCUMENT_PATH_MESSAGE })
  path?: string;

  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MaxLength(MAX_DOCUMENT_CHARS)
  content?: string;
}
