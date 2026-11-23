import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, tokenFromMail, type SentMail } from './helpers/create-test-app.js';

describe('Auth & Users (e2e)', () => {
  let app: INestApplication;
  let outbox: SentMail[];
  const email = `ada.${Date.now()}@example.com`;
  const password = 'Passw0rd-test';
  let accessToken: string;
  let refreshToken: string;

  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, outbox } = await createTestApp());
  });

  afterAll(async () => {
    await app.get(DataSource).query('DELETE FROM users WHERE email = $1', [email]);
    await app.close();
  });

  it('serves the health check without a token', () => http().get('/health').expect(200));

  it('rejects invalid registration input', async () => {
    await http()
      .post('/api/auth/register')
      .send({ email: 'nope', fullName: 'A', password: 'short' })
      .expect(400);
  });

  it('registers a user and emails a verification link', async () => {
    const res = await http()
      .post('/api/auth/register')
      .send({ email, fullName: 'Ada Lovelace', password })
      .expect(201);
    expect(res.body).toMatchObject({ email, isEmailVerified: false });
    expect(res.body.passwordHash).toBeUndefined();
    expect(outbox.at(-1)).toMatchObject({ to: email, subject: 'Verify your email address' });
  });

  it('refuses duplicate registration with 409', () =>
    http().post('/api/auth/register').send({ email, fullName: 'Ada', password }).expect(409));

  it('does not allow login before the email is verified', () =>
    http().post('/api/auth/login').send({ email, password }).expect(403));

  it('verifies the email once, then rejects the reused token', async () => {
    const token = tokenFromMail(outbox.at(-1)!);
    await http().post('/api/auth/verify-email').send({ token }).expect(200);
    await http().post('/api/auth/verify-email').send({ token }).expect(400);
  });

  it('rejects wrong credentials with 401', async () => {
    await http().post('/api/auth/login').send({ email, password: 'wrong-Pass1' }).expect(401);
    await http().post('/api/auth/login').send({ email: 'ghost@example.com', password }).expect(401);
    await http().post('/api/auth/login').send({ email: { $ne: '' }, password }).expect(401);
  });

  it('logs in and returns a token pair', async () => {
    const res = await http().post('/api/auth/login').send({ email, password }).expect(200);
    ({ accessToken, refreshToken } = res.body);
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
  });

  it('protects /users/me and serves it with a valid token', async () => {
    await http().get('/api/users/me').expect(401);
    const res = await http()
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body).toMatchObject({ email, isEmailVerified: true, role: 'user' });
  });

  it('updates the profile and rejects null names', async () => {
    const auth = { Authorization: `Bearer ${accessToken}` };
    await http().patch('/api/users/me').set(auth).send({ fullName: 'Ada King' }).expect(200);
    await http().patch('/api/users/me').set(auth).send({ fullName: null }).expect(400);
  });

  it('forbids admin routes for normal users', () =>
    http().get('/api/users').set('Authorization', `Bearer ${accessToken}`).expect(403));

  it('rotates refresh tokens and rejects the old one', async () => {
    const res = await http().post('/api/auth/refresh').send({ refreshToken }).expect(200);
    expect(res.body.refreshToken).not.toBe(refreshToken);
    await http().post('/api/auth/refresh').send({ refreshToken }).expect(401);
    // Reuse of a revoked token drops the whole session.
    await http()
      .post('/api/auth/refresh')
      .send({ refreshToken: res.body.refreshToken })
      .expect(401);
  });

  it('resets a forgotten password', async () => {
    await http().post('/api/auth/forgot-password').send({ email }).expect(200);
    const mail = outbox.at(-1)!;
    expect(mail.subject).toBe('Reset your password');
    const newPassword = 'Br4nd-new-pass';
    await http()
      .post('/api/auth/reset-password')
      .send({ token: tokenFromMail(mail), password: newPassword })
      .expect(200);
    await http().post('/api/auth/login').send({ email, password }).expect(401);
    await http().post('/api/auth/login').send({ email, password: newPassword }).expect(200);
  });

  it('answers forgot-password identically for unknown emails', async () => {
    const before = outbox.length;
    const res = await http()
      .post('/api/auth/forgot-password')
      .send({ email: 'ghost@example.com' })
      .expect(200);
    expect(res.body.message).toMatch(/If the address is registered/);
    expect(outbox.length).toBe(before);
  });
});
