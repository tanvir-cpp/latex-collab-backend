import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../interfaces/auth-user.interface.js';

/** Injects the authenticated user (or one of its fields) into a handler. */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest<Request & { user: AuthUser }>().user;
    return field ? user[field] : user;
  },
);
