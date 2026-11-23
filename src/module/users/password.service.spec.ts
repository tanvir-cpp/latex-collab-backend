import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('verifies a correct password against its hash', async () => {
    const hash = await service.hash('Passw0rd-test');
    expect(hash).not.toContain('Passw0rd-test');
    expect(await service.verify('Passw0rd-test', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await service.hash('Passw0rd-test');
    expect(await service.verify('other', hash)).toBe(false);
  });

  it('rejects when no hash exists (unknown user) without throwing', async () => {
    expect(await service.verify('anything', null)).toBe(false);
    expect(await service.verify('anything', undefined)).toBe(false);
  });
});
