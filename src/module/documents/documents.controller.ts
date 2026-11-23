import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { MAX_UPLOAD_BYTES } from './document-limits.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { DocumentResponseDto } from './dto/document-response.dto.js';
import { DocumentSummaryDto } from './dto/document-summary.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { UploadDocumentDto, type UploadedTextFile } from './dto/upload-document.dto.js';
import { DocumentsService } from './documents.service.js';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('projects/:projectId/documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a document (editor)' })
  create(
    @CurrentUser('id') userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateDocumentDto,
  ): Promise<DocumentResponseDto> {
    return this.documents.create(projectId, userId, dto).then((d) => DocumentResponseDto.from(d));
  }

  @Post('upload')
  @ApiOperation({ summary: 'Create a document from an uploaded text file (editor)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadDocumentDto })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  upload(
    @CurrentUser('id') userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @UploadedFile() file: UploadedTextFile | undefined,
  ): Promise<DocumentResponseDto> {
    return this.documents.upload(projectId, userId, file).then((d) => DocumentResponseDto.from(d));
  }

  @Get()
  @ApiOperation({ summary: 'List documents in a project (without content)' })
  list(
    @CurrentUser('id') userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<DocumentSummaryDto[]> {
    return this.documents.list(projectId, userId);
  }

  @Get(':documentId')
  @ApiOperation({ summary: 'Get a document with its content' })
  get(
    @CurrentUser('id') userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<DocumentResponseDto> {
    return this.documents.get(projectId, documentId, userId).then((d) => DocumentResponseDto.from(d));
  }

  @Get(':documentId/download')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @ApiOperation({ summary: 'Download the raw file' })
  async download(
    @CurrentUser('id') userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const document = await this.documents.get(projectId, documentId, userId);
    const filename = encodeURIComponent(document.path.split('/').pop() ?? 'document.tex');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    return document.content;
  }

  @Patch(':documentId')
  @ApiOperation({ summary: 'Rename or edit a document (editor)' })
  update(
    @CurrentUser('id') userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: UpdateDocumentDto,
  ): Promise<DocumentResponseDto> {
    return this.documents.update(projectId, documentId, userId, dto).then((d) => DocumentResponseDto.from(d));
  }

  @Delete(':documentId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a document (editor)' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<void> {
    return this.documents.remove(projectId, documentId, userId);
  }
}
