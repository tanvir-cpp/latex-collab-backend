import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../../common/interfaces/auth-user.interface.js';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

/** Per-user sliding window so one account can't run up the LLM bill. In-memory: per server instance. */
@Injectable()
export class AiRateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>();

  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<Request & { user?: AuthUser }>().user;
    if (!user) return true; // the JWT guard has already rejected anonymous callers
    const now = Date.now();
    const recent = (this.hits.get(user.id) ?? []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= MAX_REQUESTS) {
      throw new HttpException(
        `AI request limit reached (${MAX_REQUESTS} per minute)`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.hits.set(user.id, recent);
    return true;
  }
}
