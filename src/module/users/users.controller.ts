import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import type { AuthUser } from '../../common/interfaces/auth-user.interface.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the signed-in user' })
  async me(@CurrentUser() current: AuthUser): Promise<UserResponseDto> {
    return UserResponseDto.fromEntity(await this.users.getByIdOrFail(current.id));
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the signed-in user\'s profile' })
  async updateMe(
    @CurrentUser() current: AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return UserResponseDto.fromEntity(await this.users.updateProfile(current.id, dto));
  }

  @Patch('me/password')
  @HttpCode(204)
  @ApiOperation({ summary: 'Change password (signs out all sessions)' })
  changePassword(@CurrentUser() current: AuthUser, @Body() dto: ChangePasswordDto): Promise<void> {
    return this.users.changePassword(current.id, dto.currentPassword, dto.newPassword);
  }

  @Delete('me')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete the signed-in account' })
  deleteMe(@CurrentUser() current: AuthUser): Promise<void> {
    return this.users.remove(current.id);
  }

  @Get()
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'List users (admin)' })
  async list(@Query() query: ListUsersQueryDto) {
    const [items, total] = await this.users.findPage(query.page, query.limit);
    return {
      items: items.map((u) => UserResponseDto.fromEntity(u)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  @Get(':id')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Get a user by id (admin)' })
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return UserResponseDto.fromEntity(await this.users.getByIdOrFail(id));
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Delete a user (admin)' })
  removeUser(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.users.remove(id);
  }
}
