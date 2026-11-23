import 'reflect-metadata';
import { validateEnv } from './env.validation.js';

const base = {
  DB_HOST: 'localhost',
  DB_USER: 'u',
  DB_PASSWORD: 'p',
  DB_NAME: 'n',
  JWT_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  MAIL_HOST: 'localhost',
  MAIL_FROM: 'x@example.com',
  FRONTEND_URL: 'http://localhost:3001',
};

describe('validateEnv (LLM settings)', () => {
  it('defaults to anthropic and needs no model', () => {
    const env = validateEnv(base);
    expect(env.LLM_PROVIDER).toBe('anthropic');
    expect(env.LLM_MODEL).toBeUndefined();
  });

  it('requires LLM_MODEL for openai and gemini', () => {
    expect(() => validateEnv({ ...base, LLM_PROVIDER: 'openai' })).toThrow(/LLM_MODEL: required/);
    expect(() => validateEnv({ ...base, LLM_PROVIDER: 'gemini' })).toThrow(/LLM_MODEL: required/);
    expect(validateEnv({ ...base, LLM_PROVIDER: 'gemini', LLM_MODEL: 'm' }).LLM_MODEL).toBe('m');
  });

  it('rejects unknown providers', () => {
    expect(() => validateEnv({ ...base, LLM_PROVIDER: 'cohere' })).toThrow(/LLM_PROVIDER/);
  });
});
