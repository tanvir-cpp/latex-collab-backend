import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';
import type { AuthUser } from '../../common/interfaces/auth-user.interface.js';
import { UsersService } from '../users/users.service.js';

export interface SocketUser extends AuthUser {
  fullName: string;
}

@Injectable()
export class WsAuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly users: UsersService,
  ) {}

  /** Reads the access token from `auth.token` (browsers) or an `Authorization: Bearer` header. */
  async authenticate(socket: Socket): Promise<SocketUser> {
    const fromAuth: unknown = socket.handshake.auth?.token;
    const header = socket.handshake.headers.authorization;
    const token =
      typeof fromAuth === 'string' && fromAuth
        ? fromAuth
        : header?.startsWith('Bearer ')
          ? header.slice(7)
          : null;
    if (!token) throw new UnauthorizedException('Missing access token');

    let sub: string;
    try {
      ({ sub } = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      }));
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    const user = await this.users.findById(sub);
    if (!user) throw new UnauthorizedException('Unknown user');
    return { id: user.id, email: user.email, role: user.role, fullName: user.fullName };
  }
}
