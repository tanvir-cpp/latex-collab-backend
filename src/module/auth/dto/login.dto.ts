import { ApiProperty } from '@nestjs/swagger';

/** Documents the body read by the Passport local strategy (validated there). */
export class LoginDto {
  @ApiProperty({ example: 'ada@example.com' })
  email: string;

  @ApiProperty()
  password: string;
}
