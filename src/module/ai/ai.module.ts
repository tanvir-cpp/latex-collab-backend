import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module.js';
import { AiRateLimitGuard } from './ai-rate-limit.guard.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { AnthropicProvider } from './anthropic.provider.js';
import { LLM_PROVIDER } from './llm.provider.js';

@Module({
  imports: [DocumentsModule],
  controllers: [AiController],
  providers: [
    AiService,
    AiRateLimitGuard,
    // Swap this binding to use a different LLM vendor.
    { provide: LLM_PROVIDER, useClass: AnthropicProvider },
  ],
})
export class AiModule {}
