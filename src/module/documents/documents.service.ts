import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { basename } from 'node:path';
import { Repository } from 'typeorm';
import { ProjectAccessService } from '../projects/project-access.service.js';
import { ProjectRole } from '../projects/project-role.enum.js';
import { DOCUMENT_PATH_MESSAGE, DOCUMENT_PATH_REGEX, MAX_DOCUMENT_CHARS } from './document-limits.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { DocumentSummaryDto } from './dto/document-summary.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import type { UploadedTextFile } from './dto/upload-document.dto.js';
import { Document } from './entities/document.entity.js';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document) private readonly documents: Repository<Document>,
    private readonly access: ProjectAccessService,
  ) {}

  async create(projectId: string, userId: string, dto: CreateDocumentDto): Promise<Document> {
    await this.access.assertRole(projectId, userId, ProjectRole.Editor);
    return this.documents.save(
      this.documents.create({
        projectId,
        path: dto.path,
        content: dto.content ?? '',
        createdById: userId,
      }),
    );
  }

  async list(projectId: string, userId: string): Promise<DocumentSummaryDto[]> {
    await this.access.assertRole(projectId, userId, ProjectRole.Viewer);
    return this.documents.find({
      select: { id: true, path: true, createdAt: true, updatedAt: true },
      where: { projectId },
      order: { path: 'ASC' },
    });
  }

  async get(projectId: string, documentId: string, userId: string): Promise<Document> {
    await this.access.assertRole(projectId, userId, ProjectRole.Viewer);
    const document = await this.documents.findOneBy({ id: documentId, projectId });
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  async update(
    projectId: string,
    documentId: string,
    userId: string,
    dto: UpdateDocumentDto,
  ): Promise<Document> {
    await this.access.assertRole(projectId, userId, ProjectRole.Editor);
    if (Object.keys(dto).length > 0) {
      // A REST content edit replaces the text, so any stored Yjs history is stale and is dropped;
      // the realtime layer re-seeds from `content` the next time the document is opened.
      const result = await this.documents.update(
        { id: documentId, projectId },
        {
          ...(dto.path !== undefined ? { path: dto.path } : {}),
          ...(dto.content !== undefined ? { content: dto.content, yjsState: null } : {}),
        },
      );
      if (!result.affected) throw new NotFoundException('Document not found');
    }
    return this.get(projectId, documentId, userId);
  }

  async remove(projectId: string, documentId: string, userId: string): Promise<void> {
    await this.access.assertRole(projectId, userId, ProjectRole.Editor);
    const result = await this.documents.delete({ id: documentId, projectId });
    if (!result.affected) throw new NotFoundException('Document not found');
  }

  /** Creates a document from an uploaded text file. */
  async upload(projectId: string, userId: string, file: UploadedTextFile | undefined) {
    await this.access.assertRole(projectId, userId, ProjectRole.Editor);
    if (!file) throw new BadRequestException('A file is required (multipart field "file")');

    const path = basename(file.originalname);
    if (!DOCUMENT_PATH_REGEX.test(path)) throw new BadRequestException(DOCUMENT_PATH_MESSAGE);

    let content: string;
    try {
      content = new TextDecoder('utf-8', { fatal: true }).decode(file.buffer);
    } catch {
      throw new BadRequestException('The file must be UTF-8 text');
    }
    if (content.length > MAX_DOCUMENT_CHARS) throw new BadRequestException('The file is too large');

    return this.create(projectId, userId, { path, content });
  }

  /**
   * Loads a document by id and checks the caller's role in its project.
   * Used by the realtime and AI modules, which only know the document id.
   */
  async findOneForUser(
    documentId: string,
    userId: string,
    minimum: ProjectRole = ProjectRole.Viewer,
  ): Promise<Document> {
    const document = await this.documents.findOneBy({ id: documentId });
    if (!document) throw new NotFoundException('Document not found');
    await this.access.assertRole(document.projectId, userId, minimum);
    return document;
  }

  /** Loads the document including its Yjs state (hidden from normal queries). No permission check. */
  loadForCollab(documentId: string): Promise<Document | null> {
    return this.documents
      .createQueryBuilder('document')
      .addSelect('document.yjsState')
      .where('document.id = :documentId', { documentId })
      .getOne();
  }

  /** Persists the live Yjs state together with a plain-text snapshot. */
  async saveCollabState(documentId: string, state: Buffer, content: string): Promise<void> {
    await this.documents.update({ id: documentId }, { yjsState: state, content });
  }
}
