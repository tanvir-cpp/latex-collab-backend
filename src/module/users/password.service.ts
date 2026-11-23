import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';

const COST = 12;
// Verified against when the account doesn't exist, so response time doesn't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', COST);

@Injectable()
export class PasswordService {
  hash(password: string): Promise<string> {
    return bcrypt.hash(password, COST);
  }

  /** Pass `null` when the user wasn't found to keep timing constant. */
  async verify(password: string, hash: string | null | undefined): Promise<boolean> {
    const matches = await bcrypt.compare(password, hash ?? DUMMY_HASH);
    return hash != null && matches;
  }
}
