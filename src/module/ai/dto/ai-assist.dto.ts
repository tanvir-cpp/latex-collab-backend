import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export enum AiAction {
  Generate = 'generate',
  Debug = 'debug',
  Explain = 'explain',
  Improve = 'improve',
}

export class AiAssistDto {
  @ApiProperty({
    enum: AiAction,
    description:
      'generate: write LaTeX · debug: fix compile errors · explain: explain LaTeX · improve: polish writing',
  })
  @IsEnum(AiAction)
  action: AiAction;

  @ApiPropertyOptional({ example: 'Create a two-column table of results', maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  prompt?: string;

  @ApiPropertyOptional({ description: 'LaTeX the request is about (e.g. the selected text)', maxLength: 20000 })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  selection?: string;

  @ApiPropertyOptional({ description: 'Compiler output to diagnose', maxLength: 20000 })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  errorLog?: string;

  @ApiPropertyOptional({ description: 'Document to use as context; you need at least viewer access' })
  @IsOptional()
  @IsUUID()
  documentId?: string;
}

export class AiAssistResponseDto {
  @ApiProperty({ enum: AiAction }) action: AiAction;
  @ApiProperty() result: string;
}
