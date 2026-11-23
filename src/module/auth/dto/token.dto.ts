import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class TokenDto {
  @ApiProperty({ description: 'One-time token from the email link' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
