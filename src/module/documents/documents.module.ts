import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsModule } from '../projects/projects.module.js';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';
import { Document } from './entities/document.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Document]), ProjectsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  // Exported for the realtime and AI modules (permission-checked document loading).
  exports: [DocumentsService, TypeOrmModule],
})
export class DocumentsModule {}
