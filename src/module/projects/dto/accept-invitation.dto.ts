import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AcceptInvitationDto {
  @ApiProperty({ description: 'Token from the invitation email link' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
