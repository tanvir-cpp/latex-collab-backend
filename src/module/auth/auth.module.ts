import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { UsersModule } from '../users/users.module.js';
import { AuthTokenService } from './auth-token.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthToken } from './entities/auth-token.entity.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { LocalStrategy } from './strategies/local.strategy.js';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    // Secrets and lifetimes are passed per call so access and refresh tokens use different keys.
    JwtModule.register({}),
    TypeOrmModule.forFeature([AuthToken]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokenService,
    JwtStrategy,
    LocalStrategy,
    // Order matters: authenticate first, then check roles.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  // Exported so the WebSocket gateway can verify access tokens on handshake.
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
