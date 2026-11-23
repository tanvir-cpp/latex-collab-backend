import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum.js';
import { User } from '../entities/user.entity.js';

/** Public representation of a user; never exposes hashes. */
export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() fullName: string;
  @ApiProperty({ enum: Role }) role: Role;
  @ApiProperty() isEmailVerified: boolean;
  @ApiProperty() createdAt: Date;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.fullName = user.fullName;
    dto.role = user.role;
    dto.isEmailVerified = user.isEmailVerified;
    dto.createdAt = user.createdAt;
    return dto;
  }
}
