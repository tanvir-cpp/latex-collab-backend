import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createUser, type TestUser } from './helpers/auth.js';
import { createTestApp, tokenFromMail, type SentMail } from './helpers/create-test-app.js';

describe('Workspaces, projects and documents (e2e)', () => {
  let app: INestApplication;
  let outbox: SentMail[];
  let owner: TestUser;
  let collaborator: TestUser;
  let stranger: TestUser;
  let projectId: string;
  let documentId: string;

  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, outbox } = await createTestApp());
    owner = await createUser(app, outbox, 'owner');
    collaborator = await createUser(app, outbox, 'collab');
    stranger = await createUser(app, outbox, 'stranger');
  });

  afterAll(async () => {
    // Deleting users cascades to their projects, memberships and documents.
    await app
      .get(DataSource)
      .query('DELETE FROM users WHERE id = ANY($1)', [[owner.id, collaborator.id, stranger.id]]);
    await app.close();
  });

  describe('workspaces', () => {
    it('creates, lists, updates and deletes only the owner\'s workspaces', async () => {
      const created = await http()
        .post('/api/workspaces')
        .set(owner.auth)
        .send({ name: 'Thesis' })
        .expect(201);
      const id = created.body.id;

      const list = await http().get('/api/workspaces').set(owner.auth).expect(200);
      expect(list.body.map((w: { id: string }) => w.id)).toContain(id);
      expect((await http().get('/api/workspaces').set(stranger.auth)).body).toEqual([]);

      await http().get(`/api/workspaces/${id}`).set(stranger.auth).expect(404);
      await http().patch(`/api/workspaces/${id}`).set(owner.auth).send({ name: 'Renamed' }).expect(200);
      await http().patch(`/api/workspaces/${id}`).set(owner.auth).send({ name: null }).expect(400);
      await http().delete(`/api/workspaces/${id}`).set(owner.auth).expect(204);
    });

    it('requires authentication', () => http().get('/api/workspaces').expect(401));
  });

  describe('projects', () => {
    it('creates a project in one of my workspaces and rejects someone else\'s', async () => {
      const ws = await http().post('/api/workspaces').set(owner.auth).send({ name: 'WS' }).expect(201);
      const ok = await http()
        .post('/api/projects')
        .set(owner.auth)
        .send({ name: 'Paper', workspaceId: ws.body.id })
        .expect(201);
      expect(ok.body).toMatchObject({ name: 'Paper', myRole: 'owner', workspaceId: ws.body.id });
      projectId = ok.body.id;

      await http()
        .post('/api/projects')
        .set(stranger.auth)
        .send({ name: 'Sneaky', workspaceId: ws.body.id })
        .expect(404);
    });

    it('lists my projects and hides them from non-members', async () => {
      const mine = await http().get('/api/projects').set(owner.auth).expect(200);
      expect(mine.body.map((p: { id: string }) => p.id)).toContain(projectId);
      expect((await http().get('/api/projects').set(stranger.auth)).body).toEqual([]);
      await http().get(`/api/projects/${projectId}`).set(stranger.auth).expect(404);
    });

    it('only lets the owner update the project', async () => {
      await http().patch(`/api/projects/${projectId}`).set(owner.auth).send({ name: 'Paper v2' }).expect(200);
      await http().patch(`/api/projects/${projectId}`).set(stranger.auth).send({ name: 'x' }).expect(404);
    });
  });

  describe('invitations and members', () => {
    let invitationToken: string;

    it('lets only the owner invite, and emails the invitee', async () => {
      await http()
        .post(`/api/projects/${projectId}/invitations`)
        .set(stranger.auth)
        .send({ email: collaborator.email, role: 'editor' })
        .expect(404);
      await http()
        .post(`/api/projects/${projectId}/invitations`)
        .set(owner.auth)
        .send({ email: collaborator.email, role: 'owner' })
        .expect(400);

      const res = await http()
        .post(`/api/projects/${projectId}/invitations`)
        .set(owner.auth)
        .send({ email: collaborator.email, role: 'editor' })
        .expect(201);
      expect(res.body.tokenHash).toBeUndefined();
      const mail = outbox.at(-1)!;
      expect(mail.to).toBe(collaborator.email);
      invitationToken = tokenFromMail(mail);

      const pending = await http().get(`/api/projects/${projectId}/invitations`).set(owner.auth).expect(200);
      expect(pending.body).toHaveLength(1);
    });

    it('refuses acceptance by a different account, then accepts for the invitee once', async () => {
      await http().post('/api/invitations/accept').set(stranger.auth).send({ token: invitationToken }).expect(403);
      await http().post('/api/invitations/accept').set(collaborator.auth).send({ token: 'bogus' }).expect(400);

      const accepted = await http()
        .post('/api/invitations/accept')
        .set(collaborator.auth)
        .send({ token: invitationToken })
        .expect(200);
      expect(accepted.body).toMatchObject({ id: projectId, myRole: 'editor' });
      await http().post('/api/invitations/accept').set(collaborator.auth).send({ token: invitationToken }).expect(400);
    });

    it('lists members and blocks inviting an existing member', async () => {
      const members = await http().get(`/api/projects/${projectId}/members`).set(collaborator.auth).expect(200);
      expect(members.body.map((m: { role: string }) => m.role).sort()).toEqual(['editor', 'owner']);
      await http()
        .post(`/api/projects/${projectId}/invitations`)
        .set(owner.auth)
        .send({ email: collaborator.email, role: 'viewer' })
        .expect(409);
    });
  });

  describe('documents', () => {
    const base = () => `/api/projects/${projectId}/documents`;

    it('lets an editor create documents and rejects bad paths and duplicates', async () => {
      const res = await http()
        .post(base())
        .set(collaborator.auth)
        .send({ path: 'main.tex', content: '\\documentclass{article}' })
        .expect(201);
      documentId = res.body.id;
      expect(res.body.yjsState).toBeUndefined();

      await http().post(base()).set(owner.auth).send({ path: 'main.tex' }).expect(409);
      await http().post(base()).set(owner.auth).send({ path: '../etc/passwd.tex' }).expect(400);
      await http().post(base()).set(owner.auth).send({ path: 'image.png' }).expect(400);
      await http().post(base()).set(stranger.auth).send({ path: 'x.tex' }).expect(404);
    });

    it('lists without content and returns content on read', async () => {
      const list = await http().get(base()).set(owner.auth).expect(200);
      expect(list.body[0]).toMatchObject({ path: 'main.tex' });
      expect(list.body[0].content).toBeUndefined();

      const doc = await http().get(`${base()}/${documentId}`).set(owner.auth).expect(200);
      expect(doc.body.content).toBe('\\documentclass{article}');
      await http().get(`${base()}/${documentId}`).set(stranger.auth).expect(404);
    });

    it('updates content and renames', async () => {
      const res = await http()
        .patch(`${base()}/${documentId}`)
        .set(collaborator.auth)
        .send({ content: 'Hello', path: 'chapters/intro.tex' })
        .expect(200);
      expect(res.body).toMatchObject({ content: 'Hello', path: 'chapters/intro.tex' });
      await http().patch(`${base()}/${documentId}`).set(owner.auth).send({ content: null }).expect(400);
    });

    it('downloads the raw file with a filename', async () => {
      const res = await http().get(`${base()}/${documentId}/download`).set(owner.auth).expect(200);
      expect(res.text).toBe('Hello');
      expect(res.headers['content-disposition']).toContain("filename*=UTF-8''intro.tex");
    });

    it('uploads a text file and refuses binary or wrong types', async () => {
      const ok = await http()
        .post(`${base()}/upload`)
        .set(owner.auth)
        .attach('file', Buffer.from('@book{a,title={T}}'), 'refs.bib')
        .expect(201);
      expect(ok.body).toMatchObject({ path: 'refs.bib', content: '@book{a,title={T}}' });

      await http()
        .post(`${base()}/upload`)
        .set(owner.auth)
        .attach('file', Buffer.from([0xff, 0xfe, 0x00, 0x80]), 'bad.tex')
        .expect(400);
      await http()
        .post(`${base()}/upload`)
        .set(owner.auth)
        .attach('file', Buffer.from('x'), 'virus.exe')
        .expect(400);
      await http().post(`${base()}/upload`).set(owner.auth).expect(400);
    });

    it('enforces roles: viewers read but cannot write', async () => {
      await http()
        .patch(`/api/projects/${projectId}/members/${collaborator.id}`)
        .set(owner.auth)
        .send({ role: 'viewer' })
        .expect(204);
      await http().get(`${base()}/${documentId}`).set(collaborator.auth).expect(200);
      await http().post(base()).set(collaborator.auth).send({ path: 'new.tex' }).expect(403);
      await http().delete(`${base()}/${documentId}`).set(collaborator.auth).expect(403);
      await http()
        .patch(`/api/projects/${projectId}/members/${collaborator.id}`)
        .set(owner.auth)
        .send({ role: 'editor' })
        .expect(204);
    });

    it('lets an editor delete a document', async () => {
      await http().delete(`${base()}/${documentId}`).set(collaborator.auth).expect(204);
      await http().get(`${base()}/${documentId}`).set(owner.auth).expect(404);
    });
  });

  describe('membership lifecycle', () => {
    it('stops the owner leaving, lets a member leave, and cascades project deletion', async () => {
      await http().delete(`/api/projects/${projectId}/members/${owner.id}`).set(owner.auth).expect(400);
      await http().delete(`/api/projects/${projectId}/members/${collaborator.id}`).set(collaborator.auth).expect(204);
      await http().get(`/api/projects/${projectId}`).set(collaborator.auth).expect(404);

      await http().delete(`/api/projects/${projectId}`).set(stranger.auth).expect(404);
      await http().delete(`/api/projects/${projectId}`).set(owner.auth).expect(204);
      await http().get(`/api/projects/${projectId}`).set(owner.auth).expect(404);
      const rows = await app
        .get(DataSource)
        .query('SELECT 1 FROM documents WHERE "projectId" = $1', [projectId]);
      expect(rows).toHaveLength(0);
    });
  });
});
