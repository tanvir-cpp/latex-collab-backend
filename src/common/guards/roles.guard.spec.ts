import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum.js';
import { RolesGuard } from './roles.guard.js';

function contextFor(user?: { role: Role }): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  it('allows routes without @Roles()', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(contextFor({ role: Role.User }))).toBe(true);
  });

  it('allows a matching role and blocks others', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.Admin]);
    expect(guard.canActivate(contextFor({ role: Role.Admin }))).toBe(true);
    expect(guard.canActivate(contextFor({ role: Role.User }))).toBe(false);
    expect(guard.canActivate(contextFor(undefined))).toBe(false);
  });
});
