import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { DOCUMENT_PATH_MESSAGE, DOCUMENT_PATH_REGEX, MAX_DOCUMENT_CHARS } from '../document-limits.js';

export class CreateDocumentDto {
  @ApiProperty({ example: 'main.tex' })
  @IsString()
  @MaxLength(255)
  @Matches(DOCUMENT_PATH_REGEX, { message: DOCUMENT_PATH_MESSAGE })
  path: string;

  @ApiPropertyOptional({ example: '\\documentclass{article}\n\\begin{document}\nHello\n\\end{document}' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_DOCUMENT_CHARS)
  content?: string;
}
