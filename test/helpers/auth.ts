import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { tokenFromMail, type SentMail } from './create-test-app.js';

export interface TestUser {
  id: string;
  email: string;
  token: string;
  auth: { Authorization: string };
}

/** Registers, verifies and signs in a throwaway user. */
export async function createUser(
  app: INestApplication,
  outbox: SentMail[],
  label: string,
): Promise<TestUser> {
  const email = `${label}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = 'Passw0rd-test';
  const http = () => request(app.getHttpServer());

  const registered = await http()
    .post('/api/auth/register')
    .send({ email, fullName: `User ${label}`, password })
    .expect(201);
  const mail = [...outbox].reverse().find((m) => m.to === email)!;
  await http().post('/api/auth/verify-email').send({ token: tokenFromMail(mail) }).expect(200);
  const login = await http().post('/api/auth/login').send({ email, password }).expect(200);
  const token = login.body.accessToken as string;
  return { id: registered.body.id, email, token, auth: { Authorization: `Bearer ${token}` } };
}
