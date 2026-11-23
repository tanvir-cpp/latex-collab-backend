import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { LlmProvider, LlmRequest } from './llm.provider.js';

const MAX_OUTPUT_TOKENS = 16_000;

/** OpenAI (or any OpenAI-compatible server via `LLM_BASE_URL`) through the official SDK. */
export class OpenAiProvider implements LlmProvider {
  private readonly logger = new Logger(OpenAiProvider.name);
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('LLM_API_KEY');
    this.model = config.getOrThrow<string>('LLM_MODEL');
    const baseURL = config.get<string>('LLM_BASE_URL') || undefined;
    this.client = apiKey ? new OpenAI({ apiKey, baseURL }) : null;
  }

  async complete({ system, messages }: LlmRequest): Promise<string> {
    if (!this.client) throw new ServiceUnavailableException('The AI assistant is not configured');

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_completion_tokens: MAX_OUTPUT_TOKENS,
        messages: [{ role: 'system', content: system }, ...messages],
      });
      const choice = response.choices[0];
      if (choice?.message.refusal || choice?.finish_reason === 'content_filter') {
        throw new UnprocessableEntityException('The assistant declined to answer this request');
      }
      const text = choice?.message.content?.trim();
      if (!text) throw new BadGatewayException('The AI assistant returned an empty response');
      return text;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof OpenAI.RateLimitError) {
        throw new HttpException('The AI assistant is busy, try again shortly', HttpStatus.TOO_MANY_REQUESTS);
      }
      this.logger.error(`LLM request failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadGatewayException('The AI assistant is temporarily unavailable');
    }
  }
}
