import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** 8–72 chars (bcrypt ignores anything past 72 bytes) with at least one letter and one digit. */
export const IsStrongPassword = () =>
  applyDecorators(
    IsString(),
    MinLength(8),
    MaxLength(72),
    Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
      message: 'password must contain at least one letter and one number',
    }),
  );
