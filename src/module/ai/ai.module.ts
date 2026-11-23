import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentsModule } from '../documents/documents.module.js';
import { AiRateLimitGuard } from './ai-rate-limit.guard.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { createLlmProvider } from './llm.factory.js';
import { LLM_PROVIDER } from './llm.provider.js';

@Module({
  imports: [DocumentsModule],
  controllers: [AiController],
  providers: [
    AiService,
    AiRateLimitGuard,
    // The vendor is selected by LLM_PROVIDER (anthropic | openai | gemini).
    { provide: LLM_PROVIDER, inject: [ConfigService], useFactory: createLlmProvider },
  ],
})
export class AiModule {}
