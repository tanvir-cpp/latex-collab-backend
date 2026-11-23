import { BadRequestException, ForbiddenException, HttpException, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Namespace, Socket } from 'socket.io';
import { ChatService } from '../chat/chat.service.js';
import { DocumentsService } from '../documents/documents.service.js';
import { ProjectAccessService } from '../projects/project-access.service.js';
import { hasAtLeast, ProjectRole } from '../projects/project-role.enum.js';
import { CollabService } from './collab.service.js';
import { ChatSendDto, ChatTypingDto, DocRefDto, ProjectRefDto } from './dto/ws-payloads.dto.js';
import {
  chatRoom,
  docRoom,
  RealtimeBroadcaster,
  userRoom,
} from './realtime-broadcaster.service.js';
import { type SocketUser, WsAuthService } from './ws-auth.service.js';

const MAX_UPDATE_BYTES = 1_000_000;
const MAX_AWARENESS_BYTES = 64_000;
/** How long a role stays trusted before it is re-read, so removed members lose write access quickly. */
const ROLE_RECHECK_MS = 30_000;

interface OpenDoc {
  projectId: string;
  role: ProjectRole;
  checkedAt: number;
}

interface SocketData {
  user: SocketUser;
  docs: Map<string, OpenDoc>;
}

type Ack<T> = ({ ok: true } & T) | { ok: false; error: string };

const dataOf = (socket: Socket) => socket.data as SocketData;

async function parse<T extends object>(cls: new () => T, payload: unknown): Promise<T> {
  if (typeof payload !== 'object' || payload === null) {
    throw new BadRequestException('Payload must be an object');
  }
  const instance = plainToInstance(cls, payload);
  const errors = await validate(instance);
  if (errors.length > 0) {
    throw new BadRequestException(errors.flatMap((e) => Object.values(e.constraints ?? {})).join('; '));
  }
  return instance;
}

function toBytes(value: unknown, maxBytes: number): Uint8Array {
  const bytes =
    value instanceof Uint8Array ? value : value instanceof ArrayBuffer ? new Uint8Array(value) : null;
  if (!bytes) throw new BadRequestException('Binary payload expected');
  if (bytes.byteLength > maxBytes) throw new BadRequestException('Payload too large');
  return bytes;
}

/**
 * One Socket.IO namespace (`/ws`) for all realtime features. Clients connect with
 * `io(url + '/ws', { auth: { token: <access token> } })`.
 *
 * Every handler answers through the Socket.IO ack as `{ ok: true, ... }` or
 * `{ ok: false, error }`, and failures are also emitted as a `ws:error` event.
 */
@WebSocketGateway({ namespace: '/ws' })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() private server: Namespace;
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly broadcaster: RealtimeBroadcaster,
    private readonly wsAuth: WsAuthService,
    private readonly collab: CollabService,
    private readonly documents: DocumentsService,
    private readonly access: ProjectAccessService,
    private readonly chat: ChatService,
  ) {}

  afterInit(server: Namespace): void {
    this.broadcaster.attach(server);
    // Reject unauthenticated sockets during the handshake, before any event can be sent.
    server.use((socket, next) => {
      this.wsAuth
        .authenticate(socket)
        .then((user) => {
          socket.data = { user, docs: new Map<string, OpenDoc>() } satisfies SocketData;
          next();
        })
        .catch((error: unknown) =>
          next(new Error(error instanceof HttpException ? error.message : 'Unauthorized')),
        );
    });
  }

  async handleConnection(socket: Socket): Promise<void> {
    await socket.join(userRoom(dataOf(socket).user.id));
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    const docIds = [...(dataOf(socket)?.docs.keys() ?? [])];
    for (const documentId of docIds) {
      await this.leaveDoc(socket, documentId);
    }
  }

  // ---- Documents (Yjs) -------------------------------------------------

  @SubscribeMessage('doc:join')
  docJoin(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown) {
    return this.run(socket, 'doc:join', async () => {
      const { documentId } = await parse(DocRefDto, body);
      const { user, docs } = dataOf(socket);

      const already = docs.get(documentId);
      if (already) return { role: already.role, state: Buffer.from(this.collab.encodeState(documentId)) };

      const doc = await this.documents.findOneForUser(documentId, user.id, ProjectRole.Viewer);
      const role = await this.access.assertRole(doc.projectId, user.id, ProjectRole.Viewer);
      await this.collab.acquire(documentId);
      if (socket.disconnected) {
        await this.collab.release(documentId);
        throw new ForbiddenException('Disconnected');
      }
      docs.set(documentId, { projectId: doc.projectId, role, checkedAt: Date.now() });
      await socket.join(docRoom(documentId));
      await this.broadcastPresence(documentId);
      return { role, state: Buffer.from(this.collab.encodeState(documentId)) };
    });
  }

  @SubscribeMessage('doc:update')
  docUpdate(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown) {
    return this.run(socket, 'doc:update', async () => {
      const { documentId } = await parse(DocRefDto, body);
      const open = this.requireOpen(socket, documentId);
      await this.ensureCanEdit(socket, documentId, open);

      const update = toBytes((body as { update?: unknown }).update, MAX_UPDATE_BYTES);
      try {
        this.collab.applyUpdate(documentId, update);
      } catch {
        throw new BadRequestException('Invalid Yjs update');
      }
      socket.to(docRoom(documentId)).emit('doc:update', { documentId, update: Buffer.from(update) });
      return {};
    });
  }

  /** Relays cursor/selection state (y-protocols awareness updates) without interpreting it. */
  @SubscribeMessage('doc:awareness')
  docAwareness(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown) {
    return this.run(socket, 'doc:awareness', async () => {
      const { documentId } = await parse(DocRefDto, body);
      this.requireOpen(socket, documentId);
      const update = toBytes((body as { update?: unknown }).update, MAX_AWARENESS_BYTES);
      socket.to(docRoom(documentId)).emit('doc:awareness', { documentId, update: Buffer.from(update) });
      return {};
    });
  }

  @SubscribeMessage('doc:leave')
  docLeave(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown) {
    return this.run(socket, 'doc:leave', async () => {
      const { documentId } = await parse(DocRefDto, body);
      await this.leaveDoc(socket, documentId);
      return {};
    });
  }

  // ---- Chat ------------------------------------------------------------

  @SubscribeMessage('chat:join')
  chatJoin(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown) {
    return this.run(socket, 'chat:join', async () => {
      const { projectId } = await parse(ProjectRefDto, body);
      await this.access.assertRole(projectId, dataOf(socket).user.id, ProjectRole.Viewer);
      await socket.join(chatRoom(projectId));
      return {};
    });
  }

  @SubscribeMessage('chat:leave')
  chatLeave(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown) {
    return this.run(socket, 'chat:leave', async () => {
      const { projectId } = await parse(ProjectRefDto, body);
      await socket.leave(chatRoom(projectId));
      return {};
    });
  }

  @SubscribeMessage('chat:send')
  chatSend(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown) {
    return this.run(socket, 'chat:send', async () => {
      const { projectId, content } = await parse(ChatSendDto, body);
      const message = await this.chat.send(projectId, dataOf(socket).user.id, content);
      this.server.to(chatRoom(projectId)).emit('chat:message', message);
      return { message };
    });
  }

  @SubscribeMessage('chat:typing')
  chatTyping(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown) {
    return this.run(socket, 'chat:typing', async () => {
      const { projectId, isTyping } = await parse(ChatTypingDto, body);
      const { user } = dataOf(socket);
      if (socket.rooms.has(chatRoom(projectId))) {
        socket.to(chatRoom(projectId)).emit('chat:typing', {
          projectId,
          userId: user.id,
          fullName: user.fullName,
          isTyping,
        });
      }
      return {};
    });
  }

  // ---- helpers ---------------------------------------------------------

  private requireOpen(socket: Socket, documentId: string): OpenDoc {
    const open = dataOf(socket).docs.get(documentId);
    if (!open) throw new BadRequestException('Join the document first');
    return open;
  }

  private async ensureCanEdit(socket: Socket, documentId: string, open: OpenDoc): Promise<void> {
    if (Date.now() - open.checkedAt > ROLE_RECHECK_MS) {
      const role = await this.access.getRole(open.projectId, dataOf(socket).user.id);
      if (!role) {
        await this.leaveDoc(socket, documentId);
        throw new ForbiddenException('Your access to this project was removed');
      }
      open.role = role;
      open.checkedAt = Date.now();
    }
    if (!hasAtLeast(open.role, ProjectRole.Editor)) {
      throw new ForbiddenException('Viewers cannot edit this document');
    }
  }

  private async leaveDoc(socket: Socket, documentId: string): Promise<void> {
    const { docs } = dataOf(socket);
    if (!docs.delete(documentId)) return;
    await socket.leave(docRoom(documentId));
    await this.collab.release(documentId);
    await this.broadcastPresence(documentId);
  }

  private async broadcastPresence(documentId: string): Promise<void> {
    const sockets = await this.server.in(docRoom(documentId)).fetchSockets();
    const users = new Map<string, { userId: string; fullName: string }>();
    for (const s of sockets) {
      const { user } = s.data as SocketData;
      users.set(user.id, { userId: user.id, fullName: user.fullName });
    }
    this.server.to(docRoom(documentId)).emit('doc:presence', { documentId, users: [...users.values()] });
  }

  private async run<T extends object>(
    socket: Socket,
    event: string,
    handler: () => Promise<T>,
  ): Promise<Ack<T>> {
    try {
      return { ok: true, ...(await handler()) };
    } catch (error) {
      const known = error instanceof HttpException;
      if (!known) {
        this.logger.error(`Unhandled error in ${event}`, error instanceof Error ? error.stack : String(error));
      }
      const message = known ? error.message : 'Internal server error';
      socket.emit('ws:error', { event, message });
      return { ok: false, error: message };
    }
  }
}
