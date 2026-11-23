import { randomUUID, timingSafeEqual } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service.js';
import { PasswordService } from '../users/password.service.js';
import { User } from '../users/entities/user.entity.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { UsersService } from '../users/users.service.js';
import { passwordResetEmail, verificationEmail } from './auth-email.templates.js';
import { AuthTokenService, sha256 } from './auth-token.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { AuthResponseDto } from './dto/auth-response.dto.js';
import { AuthTokenType } from './entities/auth-token.entity.js';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly authTokens: AuthTokenService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<User> {
    const user = await this.users.create({
      email: dto.email,
      fullName: dto.fullName,
      passwordHash: await this.passwords.hash(dto.password),
    });
    await this.sendVerificationEmail(user);
    return user;
  }

  /** Used by the Passport local strategy. Returns null for any bad credential. */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.users.findByEmail(email);
    const valid = await this.passwords.verify(password, user?.passwordHash);
    return user && valid ? user : null;
  }

  async login(user: User): Promise<AuthResponseDto> {
    if (!user.isEmailVerified) {
      throw new ForbiddenException('Please verify your email before signing in');
    }
    return this.issueSession(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    let sub: string;
    try {
      ({ sub } = await this.jwt.verifyAsync<{ sub: string }>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      }));
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.users.findById(sub);
    const presented = Buffer.from(sha256(refreshToken));
    const stored = Buffer.from(user?.refreshTokenHash ?? '');
    if (!user || stored.length !== presented.length || !timingSafeEqual(stored, presented)) {
      // A reused or revoked token: drop the session so a leaked token stops working.
      if (user) await this.users.update(user.id, { refreshTokenHash: null });
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.issueSession(user);
  }

  logout(userId: string): Promise<void> {
    return this.users.update(userId, { refreshTokenHash: null });
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = await this.authTokens.consume(token, AuthTokenType.EmailVerification);
    if (!userId) throw new BadRequestException('Invalid or expired verification token');
    await this.users.update(userId, { isEmailVerified: true });
  }

  /** Silent for unknown or already verified emails so accounts can't be enumerated. */
  async resendVerification(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (user && !user.isEmailVerified) await this.sendVerificationEmail(user);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) return;
    const token = await this.authTokens.issue(user.id, AuthTokenType.PasswordReset, RESET_TTL_MS);
    const link = `${this.frontendUrl()}/reset-password?token=${token}`;
    await this.safeSend(user, passwordResetEmail(user.fullName, link));
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const userId = await this.authTokens.consume(token, AuthTokenType.PasswordReset);
    if (!userId) throw new BadRequestException('Invalid or expired reset token');
    await this.users.update(userId, {
      passwordHash: await this.passwords.hash(password),
      refreshTokenHash: null,
    });
  }

  private async issueSession(user: User): Promise<AuthResponseDto> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.config.getOrThrow<string>('JWT_EXPIRES_IN') as JwtSignOptions['expiresIn'],
      },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.getOrThrow<string>(
          'JWT_REFRESH_EXPIRES_IN',
        ) as JwtSignOptions['expiresIn'],
        jwtid: randomUUID(),
      },
    );
    await this.users.update(user.id, { refreshTokenHash: sha256(refreshToken) });
    return { accessToken, refreshToken, user: UserResponseDto.fromEntity(user) };
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    const token = await this.authTokens.issue(
      user.id,
      AuthTokenType.EmailVerification,
      VERIFICATION_TTL_MS,
    );
    const link = `${this.frontendUrl()}/verify-email?token=${token}`;
    await this.safeSend(user, verificationEmail(user.fullName, link));
  }

  /** A mail outage must not fail registration or leak whether an address exists. */
  private async safeSend(user: User, mail: { subject: string; html: string }): Promise<void> {
    try {
      await this.mail.send(user.email, mail.subject, mail.html);
    } catch {
      this.logger.warn(`Could not deliver "${mail.subject}" to user ${user.id}`);
    }
  }

  private frontendUrl(): string {
    return this.config.getOrThrow<string>('FRONTEND_URL').replace(/\/$/, '');
  }
}
