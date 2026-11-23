import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { AuthUser } from '../../common/interfaces/auth-user.interface.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { User } from '../users/entities/user.entity.js';
import { AuthService } from './auth.service.js';
import { AuthResponseDto, MessageResponseDto } from './dto/auth-response.dto.js';
import { EmailDto } from './dto/email.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { TokenDto } from './dto/token.dto.js';
import { LocalAuthGuard } from './guards/local-auth.guard.js';

const GENERIC_EMAIL_REPLY = 'If the address is registered, an email has been sent';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Create an account and send a verification email' })
  async register(@Body() dto: RegisterDto): Promise<UserResponseDto> {
    return UserResponseDto.fromEntity(await this.auth.register(dto));
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiBody({ type: LoginDto })
  login(@Req() req: Request & { user: User }): Promise<AuthResponseDto> {
    return this.auth.login(req.user);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.auth.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke the current refresh token' })
  logout(@CurrentUser() user: AuthUser): Promise<void> {
    return this.auth.logout(user.id);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm an email address with the emailed token' })
  async verifyEmail(@Body() dto: TokenDto): Promise<MessageResponseDto> {
    await this.auth.verifyEmail(dto.token);
    return { message: 'Email verified' };
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send a new verification email' })
  async resendVerification(@Body() dto: EmailDto): Promise<MessageResponseDto> {
    await this.auth.resendVerification(dto.email);
    return { message: GENERIC_EMAIL_REPLY };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Email a password reset link' })
  async forgotPassword(@Body() dto: EmailDto): Promise<MessageResponseDto> {
    await this.auth.forgotPassword(dto.email);
    return { message: GENERIC_EMAIL_REPLY };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Set a new password using the emailed token' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponseDto> {
    await this.auth.resetPassword(dto.token, dto.password);
    return { message: 'Password updated' };
  }
}
