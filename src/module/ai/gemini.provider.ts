import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiError, FinishReason, GoogleGenAI } from '@google/genai';
import type { LlmProvider, LlmRequest } from './llm.provider.js';

const MAX_OUTPUT_TOKENS = 16_000;

/** Google Gemini through the official `@google/genai` SDK (Gemini Developer API key). */
export class GeminiProvider implements LlmProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly client: GoogleGenAI | null;
  private readonly model: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('LLM_API_KEY');
    this.model = config.getOrThrow<string>('LLM_MODEL');
    const baseUrl = config.get<string>('LLM_BASE_URL') || undefined;
    this.client = apiKey
      ? new GoogleGenAI({ apiKey, ...(baseUrl ? { httpOptions: { baseUrl } } : {}) })
      : null;
  }

  async complete({ system, messages }: LlmRequest): Promise<string> {
    if (!this.client) throw new ServiceUnavailableException('The AI assistant is not configured');

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        // Gemini calls the assistant role "model".
        contents: messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        config: { systemInstruction: system, maxOutputTokens: MAX_OUTPUT_TOKENS },
      });
      if (
        response.promptFeedback?.blockReason ||
        response.candidates?.[0]?.finishReason === FinishReason.SAFETY
      ) {
        throw new UnprocessableEntityException('The assistant declined to answer this request');
      }
      const text = response.text?.trim();
      if (!text) throw new BadGatewayException('The AI assistant returned an empty response');
      return text;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof ApiError && error.status === HttpStatus.TOO_MANY_REQUESTS) {
        throw new HttpException('The AI assistant is busy, try again shortly', HttpStatus.TOO_MANY_REQUESTS);
      }
      this.logger.error(`LLM request failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadGatewayException('The AI assistant is temporarily unavailable');
    }
  }
}
