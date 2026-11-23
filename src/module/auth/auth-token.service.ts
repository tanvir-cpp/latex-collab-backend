import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { sha256 } from '../../common/utils/hash.util.js';
import { AuthToken, AuthTokenType } from './entities/auth-token.entity.js';

@Injectable()
export class AuthTokenService {
  constructor(@InjectRepository(AuthToken) private readonly tokens: Repository<AuthToken>) {}

  /** Replaces any unused token of the same type and returns the raw token to email. */
  async issue(userId: string, type: AuthTokenType, ttlMs: number): Promise<string> {
    await this.tokens.delete({ userId, type, usedAt: IsNull() });
    const raw = randomBytes(32).toString('hex');
    await this.tokens.save(
      this.tokens.create({
        userId,
        type,
        tokenHash: sha256(raw),
        expiresAt: new Date(Date.now() + ttlMs),
        usedAt: null,
      }),
    );
    return raw;
  }

  /**
   * Marks a valid token as used and returns its user id, or null if it is unknown,
   * expired or already used. A single UPDATE keeps concurrent redemptions safe.
   */
  async consume(raw: string, type: AuthTokenType): Promise<string | null> {
    const result = await this.tokens
      .createQueryBuilder()
      .update()
      .set({ usedAt: () => 'now()' })
      .where('"tokenHash" = :hash AND type = :type AND "usedAt" IS NULL AND "expiresAt" > now()', {
        hash: sha256(raw),
        type,
      })
      .returning('"userId"')
      .execute();
    return (result.raw as Array<{ userId: string }>)[0]?.userId ?? null;
  }
}
