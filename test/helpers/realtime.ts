import { io, type Socket } from 'socket.io-client';
import * as Y from 'yjs';

export interface Ack {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

export function connect(url: string, token: string | undefined): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(`${url}/ws`, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      reconnection: false,
    });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', (err) => {
      socket.close();
      reject(err);
    });
  });
}

export const emitAck = (socket: Socket, event: string, payload: unknown): Promise<Ack> =>
  socket.timeout(3000).emitWithAck(event, payload);

export function nextEvent<T = unknown>(socket: Socket, event: string, timeoutMs = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for "${event}"`)), timeoutMs);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

/** A client-side Yjs document wired to a document room, like the real frontend binding. */
export async function openDocument(socket: Socket, documentId: string) {
  const ydoc = new Y.Doc();
  const joined = await emitAck(socket, 'doc:join', { documentId });
  if (joined.ok) Y.applyUpdate(ydoc, new Uint8Array(joined.state as ArrayBuffer));

  socket.on('doc:update', (msg: { documentId: string; update: ArrayBuffer }) => {
    if (msg.documentId === documentId) Y.applyUpdate(ydoc, new Uint8Array(msg.update), 'remote');
  });
  ydoc.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin !== 'remote') void emitAck(socket, 'doc:update', { documentId, update });
  });
  return { ydoc, text: ydoc.getText('content'), joined };
}

export async function waitFor(check: () => Promise<boolean> | boolean, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('Condition not met in time');
}
