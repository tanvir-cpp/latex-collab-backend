import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { IsStrongPassword } from '../../../common/validators/password.validator.js';

export class RegisterDto {
  @ApiProperty({ example: 'ada@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'Ada Lovelace' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ minLength: 8, maxLength: 72, example: 'Passw0rd-example' })
  @IsStrongPassword()
  password: string;
}
