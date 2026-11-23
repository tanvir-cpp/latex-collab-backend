import { ApiProperty } from '@nestjs/swagger';

export class DocumentSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() path: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
