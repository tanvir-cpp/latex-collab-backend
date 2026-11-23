import { ConfigService } from '@nestjs/config';
import { LlmProviderName } from '../../config/env.validation.js';
import { AnthropicProvider } from './anthropic.provider.js';
import { GeminiProvider } from './gemini.provider.js';
import type { LlmProvider } from './llm.provider.js';
import { OpenAiProvider } from './openai.provider.js';

/** Chooses the LLM vendor from `LLM_PROVIDER`. To support another vendor, add a case here. */
export function createLlmProvider(config: ConfigService): LlmProvider {
  switch (config.getOrThrow<LlmProviderName>('LLM_PROVIDER')) {
    case LlmProviderName.OpenAI:
      return new OpenAiProvider(config);
    case LlmProviderName.Gemini:
      return new GeminiProvider(config);
    case LlmProviderName.Anthropic:
      return new AnthropicProvider(config);
  }
}
