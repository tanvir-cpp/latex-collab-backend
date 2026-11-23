import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

export class EmailDto {
  @ApiProperty({ example: 'ada@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;
}
