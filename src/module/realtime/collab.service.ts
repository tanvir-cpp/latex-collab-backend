import { Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import * as Y from 'yjs';
import { DocumentsService } from '../documents/documents.service.js';

/** Name of the shared text inside each Y.Doc. Clients must bind their editor to this key. */
export const YTEXT_KEY = 'content';
const PERSIST_DEBOUNCE_MS = 2000;

interface LiveDoc {
  ydoc: Y.Doc;
  /** Sockets currently joined. The doc is flushed and dropped when this reaches zero. */
  refs: number;
  dirty: boolean;
  timer?: NodeJS.Timeout;
}

/**
 * Keeps one Y.Doc in memory per open document, merges client updates into it and
 * persists the result. Single-instance only: running several server instances would
 * need a shared pub/sub layer (e.g. Redis) so they see each other's updates.
 */
@Injectable()
export class CollabService implements OnModuleDestroy {
  private readonly logger = new Logger(CollabService.name);
  private readonly docs = new Map<string, LiveDoc>();
  private readonly loading = new Map<string, Promise<LiveDoc>>();

  constructor(private readonly documents: DocumentsService) {}

  /** Registers one more socket on the document, loading it if needed. */
  async acquire(documentId: string): Promise<void> {
    const live = await this.getOrLoad(documentId);
    live.refs += 1;
  }

  async release(documentId: string): Promise<void> {
    const live = this.docs.get(documentId);
    if (!live) return;
    live.refs -= 1;
    if (live.refs > 0) return;
    // Remove first so a concurrent acquire reloads the freshly persisted state.
    this.docs.delete(documentId);
    await this.flush(documentId, live);
    live.ydoc.destroy();
  }

  /** Full state for a newly joined client. */
  encodeState(documentId: string): Uint8Array {
    return Y.encodeStateAsUpdate(this.require(documentId).ydoc);
  }

  /** Merges a client update. Throws if the bytes are not a valid Yjs update. */
  applyUpdate(documentId: string, update: Uint8Array): void {
    const live = this.require(documentId);
    Y.applyUpdate(live.ydoc, update);
    live.dirty = true;
    clearTimeout(live.timer);
    live.timer = setTimeout(() => void this.flush(documentId, live), PERSIST_DEBOUNCE_MS);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.docs].map(([id, live]) => this.flush(id, live)));
  }

  private require(documentId: string): LiveDoc {
    const live = this.docs.get(documentId);
    if (!live) throw new NotFoundException('Document is not open');
    return live;
  }

  private getOrLoad(documentId: string): Promise<LiveDoc> {
    const existing = this.docs.get(documentId);
    if (existing) return Promise.resolve(existing);
    // Concurrent joins share one load so the document isn't seeded twice.
    let pending = this.loading.get(documentId);
    if (!pending) {
      pending = this.load(documentId).finally(() => this.loading.delete(documentId));
      this.loading.set(documentId, pending);
    }
    return pending;
  }

  private async load(documentId: string): Promise<LiveDoc> {
    const row = await this.documents.loadForCollab(documentId);
    if (!row) throw new NotFoundException('Document not found');

    const ydoc = new Y.Doc();
    const live: LiveDoc = { ydoc, refs: 0, dirty: false };
    if (row.yjsState) {
      Y.applyUpdate(ydoc, new Uint8Array(row.yjsState));
    } else if (row.content) {
      // First open (or after a REST edit): seed from the plain text, then persist at once
      // so every later session starts from the same Yjs history instead of re-seeding.
      ydoc.getText(YTEXT_KEY).insert(0, row.content);
      live.dirty = true;
      await this.flush(documentId, live);
    }
    this.docs.set(documentId, live);
    return live;
  }

  private async flush(documentId: string, live: LiveDoc): Promise<void> {
    clearTimeout(live.timer);
    if (!live.dirty) return;
    live.dirty = false;
    try {
      await this.documents.saveCollabState(
        documentId,
        Buffer.from(Y.encodeStateAsUpdate(live.ydoc)),
        live.ydoc.getText(YTEXT_KEY).toJSON(),
      );
    } catch (error) {
      live.dirty = true;
      this.logger.error(
        `Failed to persist document ${documentId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
