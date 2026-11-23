import { Injectable } from '@nestjs/common';
import type { Namespace } from 'socket.io';

/**
 * Lets other modules push events to connected clients without depending on the gateway.
 * The gateway registers the Socket.IO server here when it starts.
 */
@Injectable()
export class RealtimeBroadcaster {
  private server: Namespace | null = null;

  attach(server: Namespace): void {
    this.server = server;
  }

  /** Every socket of a user joins the `user:<id>` room on connect. */
  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(userRoom(userId)).emit(event, payload);
  }
}

export const userRoom = (userId: string) => `user:${userId}`;
export const docRoom = (documentId: string) => `doc:${documentId}`;
export const chatRoom = (projectId: string) => `chat:${projectId}`;
