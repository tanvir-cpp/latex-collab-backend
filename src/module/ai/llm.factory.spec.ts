import type { ConfigService } from '@nestjs/config';
import { AnthropicProvider } from './anthropic.provider.js';
import { GeminiProvider } from './gemini.provider.js';
import { createLlmProvider } from './llm.factory.js';
import { OpenAiProvider } from './openai.provider.js';

const configWith = (values: Record<string, string | undefined>) =>
  ({
    get: (key: string) => values[key],
    getOrThrow: (key: string) => {
      if (values[key] === undefined) throw new Error(`missing ${key}`);
      return values[key];
    },
  }) as unknown as ConfigService;

describe('createLlmProvider', () => {
  it('selects the vendor from LLM_PROVIDER', () => {
    expect(createLlmProvider(configWith({ LLM_PROVIDER: 'anthropic' }))).toBeInstanceOf(AnthropicProvider);
    expect(createLlmProvider(configWith({ LLM_PROVIDER: 'openai', LLM_MODEL: 'm' }))).toBeInstanceOf(OpenAiProvider);
    expect(createLlmProvider(configWith({ LLM_PROVIDER: 'gemini', LLM_MODEL: 'm' }))).toBeInstanceOf(GeminiProvider);
  });
});
