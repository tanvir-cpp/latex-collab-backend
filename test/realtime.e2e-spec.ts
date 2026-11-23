import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Socket } from 'socket.io-client';
import { DataSource } from 'typeorm';
import * as Y from 'yjs';
import { createUser, type TestUser } from './helpers/auth.js';
import { createTestApp, type SentMail, tokenFromMail } from './helpers/create-test-app.js';
import { connect, emitAck, nextEvent, openDocument, waitFor } from './helpers/realtime.js';

describe('Realtime collaboration, chat and notifications (e2e)', () => {
  let app: INestApplication;
  let url: string;
  let outbox: SentMail[];
  let owner: TestUser;
  let editor: TestUser;
  let viewer: TestUser;
  let stranger: TestUser;
  let projectId: string;
  let documentId: string;
  const sockets: Socket[] = [];

  const http = () => request(app.getHttpServer());
  const open = async (token: string) => {
    const socket = await connect(url, token);
    sockets.push(socket);
    return socket;
  };

  beforeAll(async () => {
    ({ app, outbox, url } = await createTestApp());
    [owner, editor, viewer, stranger] = [
      await createUser(app, outbox, 'owner'),
      await createUser(app, outbox, 'editor'),
      await createUser(app, outbox, 'viewer'),
      await createUser(app, outbox, 'stranger'),
    ];
    const project = await http().post('/api/projects').set(owner.auth).send({ name: 'Live' }).expect(201);
    projectId = project.body.id;
    const doc = await http()
      .post(`/api/projects/${projectId}/documents`)
      .set(owner.auth)
      .send({ path: 'main.tex', content: 'Hello' })
      .expect(201);
    documentId = doc.body.id;
    // Memberships are added directly; the invitation flow has its own e2e coverage.
    const db = app.get(DataSource);
    await db.query(
      `INSERT INTO project_members ("projectId", "userId", role) VALUES ($1,$2,'editor'),($1,$3,'viewer')`,
      [projectId, editor.id, viewer.id],
    );
  });

  afterAll(async () => {
    sockets.forEach((s) => s.close());
    await app
      .get(DataSource)
      .query('DELETE FROM users WHERE id = ANY($1)', [[owner.id, editor.id, viewer.id, stranger.id]]);
    await app.close();
  });

  describe('connection', () => {
    it('refuses sockets without a valid access token', async () => {
      await expect(connect(url, undefined)).rejects.toThrow(/Missing access token/);
      await expect(connect(url, 'not-a-jwt')).rejects.toThrow(/Invalid or expired/);
    });
  });

  describe('documents (Yjs)', () => {
    it('seeds a new document from its stored text and keeps collaborators in sync', async () => {
      const ownerSocket = await open(owner.token);
      const editorSocket = await open(editor.token);

      const a = await openDocument(ownerSocket, documentId);
      expect(a.joined).toMatchObject({ ok: true, role: 'owner' });
      expect(a.text.toJSON()).toBe('Hello');

      const presence = nextEvent<{ users: unknown[] }>(ownerSocket, 'doc:presence');
      const b = await openDocument(editorSocket, documentId);
      expect(b.joined).toMatchObject({ ok: true, role: 'editor' });
      expect(b.text.toJSON()).toBe('Hello');
      expect((await presence).users).toHaveLength(2);

      a.text.insert(5, ', world');
      await waitFor(() => b.text.toJSON() === 'Hello, world');
      b.text.insert(0, '>> ');
      await waitFor(() => a.text.toJSON() === '>> Hello, world');
    });

    it('persists the merged text once everyone has left', async () => {
      // Sockets from the previous test are still connected; closing them flushes the document.
      sockets.splice(0).forEach((s) => s.close());
      const db = app.get(DataSource);
      await waitFor(async () => {
        const [row] = await db.query('SELECT content, "yjsState" FROM documents WHERE id = $1', [documentId]);
        return row.content === '>> Hello, world' && row.yjsState !== null;
      });

      const reopened = await openDocument(await open(owner.token), documentId);
      expect(reopened.text.toJSON()).toBe('>> Hello, world');
    });

    it('lets viewers read but rejects their edits', async () => {
      const viewerSocket = await open(viewer.token);
      const v = await openDocument(viewerSocket, documentId);
      expect(v.joined).toMatchObject({ ok: true, role: 'viewer' });

      const rejected = nextEvent<{ message: string }>(viewerSocket, 'ws:error');
      const update = Y.encodeStateAsUpdate(
        (() => {
          const d = new Y.Doc();
          d.getText('content').insert(0, 'x');
          return d;
        })(),
      );
      const ack = await emitAck(viewerSocket, 'doc:update', { documentId, update });
      expect(ack).toMatchObject({ ok: false, error: expect.stringMatching(/Viewers cannot edit/) });
      expect((await rejected).message).toMatch(/Viewers cannot edit/);
    });

    it('rejects non-members, bad ids and invalid updates', async () => {
      const strangerSocket = await open(stranger.token);
      expect(await emitAck(strangerSocket, 'doc:join', { documentId })).toMatchObject({
        ok: false,
        error: 'Project not found',
      });
      expect(await emitAck(strangerSocket, 'doc:join', { documentId: 'nope' })).toMatchObject({ ok: false });

      const editorSocket = await open(editor.token);
      expect(await emitAck(editorSocket, 'doc:update', { documentId, update: new Uint8Array([1]) })).toMatchObject({
        ok: false,
        error: expect.stringMatching(/Join the document first/),
      });
      await openDocument(editorSocket, documentId);
      expect(
        await emitAck(editorSocket, 'doc:update', { documentId, update: new Uint8Array([255, 255, 255]) }),
      ).toMatchObject({ ok: false, error: 'Invalid Yjs update' });
    });
  });

  describe('chat', () => {
    it('delivers messages to project members and stores history', async () => {
      const ownerSocket = await open(owner.token);
      const editorSocket = await open(editor.token);
      expect(await emitAck(ownerSocket, 'chat:join', { projectId })).toMatchObject({ ok: true });
      expect(await emitAck(editorSocket, 'chat:join', { projectId })).toMatchObject({ ok: true });

      const received = nextEvent<{ content: string; sender: { id: string } }>(editorSocket, 'chat:message');
      const ack = await emitAck(ownerSocket, 'chat:send', { projectId, content: '  Hi team  ' });
      expect(ack).toMatchObject({ ok: true });
      expect(await received).toMatchObject({ content: 'Hi team', sender: { id: owner.id } });

      const typing = nextEvent<{ isTyping: boolean }>(ownerSocket, 'chat:typing');
      await emitAck(editorSocket, 'chat:typing', { projectId, isTyping: true });
      expect((await typing).isTyping).toBe(true);

      const history = await http().get(`/api/projects/${projectId}/chat`).set(viewer.auth).expect(200);
      expect(history.body[0]).toMatchObject({ content: 'Hi team', sender: { fullName: 'User owner' } });
    });

    it('keeps outsiders out and rejects empty or oversized messages', async () => {
      const strangerSocket = await open(stranger.token);
      expect(await emitAck(strangerSocket, 'chat:join', { projectId })).toMatchObject({ ok: false });
      expect(await emitAck(strangerSocket, 'chat:send', { projectId, content: 'hi' })).toMatchObject({
        ok: false,
      });
      await http().get(`/api/projects/${projectId}/chat`).set(stranger.auth).expect(404);

      const ownerSocket = await open(owner.token);
      expect(await emitAck(ownerSocket, 'chat:send', { projectId, content: '   ' })).toMatchObject({ ok: false });
      expect(
        await emitAck(ownerSocket, 'chat:send', { projectId, content: 'x'.repeat(4001) }),
      ).toMatchObject({ ok: false });
    });
  });

  describe('notifications', () => {
    it('pushes and stores a notification when someone is invited, and tracks read state', async () => {
      const viewerSocket = await open(stranger.token);
      const pushed = nextEvent<{ type: string; data: { projectId: string } }>(viewerSocket, 'notification:new');

      await http()
        .post(`/api/projects/${projectId}/invitations`)
        .set(owner.auth)
        .send({ email: stranger.email, role: 'viewer' })
        .expect(201);
      expect(await pushed).toMatchObject({ type: 'project_invitation', data: { projectId } });

      const count = await http().get('/api/notifications/unread-count').set(stranger.auth).expect(200);
      expect(count.body).toEqual({ count: 1 });
      const list = await http().get('/api/notifications').set(stranger.auth).expect(200);
      expect(list.body).toHaveLength(1);

      await http().post(`/api/notifications/${list.body[0].id}/read`).set(owner.auth).expect(404);
      await http().post(`/api/notifications/${list.body[0].id}/read`).set(stranger.auth).expect(204);
      expect((await http().get('/api/notifications/unread-count').set(stranger.auth)).body).toEqual({ count: 0 });
    });

    it('notifies the inviter when the invitation is accepted', async () => {
      const ownerSocket = await open(owner.token);
      const pushed = nextEvent<{ type: string; title: string }>(ownerSocket, 'notification:new');
      const invitation = outbox.findLast((m) => m.to === stranger.email)!;
      await http()
        .post('/api/invitations/accept')
        .set(stranger.auth)
        .send({ token: tokenFromMail(invitation) })
        .expect(200);
      expect(await pushed).toMatchObject({ type: 'invitation_accepted', title: expect.stringContaining('joined') });
    });

    it('requires authentication', () => http().get('/api/notifications').expect(401));
  });
});
