import { ApiProperty } from '@nestjs/swagger';

export class UploadDocumentDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'A text file (.tex, .bib, .sty, .cls, .txt, .md), max 1 MB' })
  file: unknown;
}

/** The part of a multer memory-storage file that this module uses. */
export interface UploadedTextFile {
  originalname: string;
  buffer: Buffer;
}
