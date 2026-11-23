import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createUser, type TestUser } from './helpers/auth.js';
import { createTestApp, type SentMail, type TestApp } from './helpers/create-test-app.js';

describe('AI assistant (e2e)', () => {
  let app: INestApplication;
  let test: TestApp;
  let outbox: SentMail[];
  let owner: TestUser;
  let stranger: TestUser;
  let documentId: string;

  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    test = await createTestApp();
    ({ app, outbox } = test);
    owner = await createUser(app, outbox, 'aiowner');
    stranger = await createUser(app, outbox, 'aistranger');
    const project = await http().post('/api/projects').set(owner.auth).send({ name: 'AI' }).expect(201);
    const doc = await http()
      .post(`/api/projects/${project.body.id}/documents`)
      .set(owner.auth)
      .send({ path: 'main.tex', content: '\\section{Intro}' })
      .expect(201);
    documentId = doc.body.id;
  });

  afterAll(async () => {
    await app.get(DataSource).query('DELETE FROM users WHERE id = ANY($1)', [[owner.id, stranger.id]]);
    await app.close();
  });

  it('requires authentication', () => http().post('/api/ai/assist').send({ action: 'explain', prompt: 'x' }).expect(401));

  it('validates the input', async () => {
    await http().post('/api/ai/assist').set(owner.auth).send({ action: 'nope', prompt: 'x' }).expect(400);
    await http().post('/api/ai/assist').set(owner.auth).send({ action: 'explain' }).expect(400);
  });

  it('answers and sends the document, selection and prompt to the LLM', async () => {
    const res = await http()
      .post('/api/ai/assist')
      .set(owner.auth)
      .send({ action: 'debug', documentId, errorLog: '! Undefined control sequence.', prompt: 'why?' })
      .expect(200);
    expect(res.body).toEqual({ action: 'debug', result: 'Fake assistant answer' });

    const sent = test.llmRequests.at(-1)!;
    expect(sent.system).toContain('Task: diagnose');
    expect(sent.messages[0].content).toContain('\\section{Intro}');
    expect(sent.messages[0].content).toContain('! Undefined control sequence.');
    expect(sent.messages[0].content).toContain('Request: why?');
  });

  it('does not expose documents the user cannot access', async () => {
    const before = test.llmRequests.length;
    await http()
      .post('/api/ai/assist')
      .set(stranger.auth)
      .send({ action: 'explain', documentId, prompt: 'what is this?' })
      .expect(404);
    expect(test.llmRequests).toHaveLength(before);
  });

  it('rate limits each user', async () => {
    const limited = await createUser(app, outbox, 'ailimited');
    const call = () =>
      http().post('/api/ai/assist').set(limited.auth).send({ action: 'generate', prompt: 'a table' });
    for (let i = 0; i < 10; i++) await call().expect(200);
    await call().expect(429);
    await app.get(DataSource).query('DELETE FROM users WHERE id = $1', [limited.id]);
  });
});
