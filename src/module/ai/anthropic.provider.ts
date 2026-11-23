import Anthropic from '@anthropic-ai/sdk';
import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LlmProvider, LlmRequest } from './llm.provider.js';

const MAX_OUTPUT_TOKENS = 16_000;

/** Claude via the official Anthropic SDK. Credentials and model come from the environment. */
@Injectable()
export class AnthropicProvider implements LlmProvider {
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly client: Anthropic | null;
  private readonly model: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('LLM_API_KEY');
    this.model = config.getOrThrow<string>('LLM_MODEL');
    this.client = apiKey
      ? new Anthropic({ apiKey, baseURL: config.getOrThrow<string>('LLM_BASE_URL') })
      : null;
  }

  async complete({ system, messages }: LlmRequest): Promise<string> {
    if (!this.client) throw new ServiceUnavailableException('The AI assistant is not configured');

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: MAX_OUTPUT_TOKENS,
        system,
        messages,
      });
      if (response.stop_reason === 'refusal') {
        throw new UnprocessableEntityException('The assistant declined to answer this request');
      }
      const text = response.content
        .flatMap((block) => (block.type === 'text' ? [block.text] : []))
        .join('\n')
        .trim();
      if (!text) throw new BadGatewayException('The AI assistant returned an empty response');
      return text;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof Anthropic.RateLimitError) {
        throw new HttpException('The AI assistant is busy, try again shortly', HttpStatus.TOO_MANY_REQUESTS);
      }
      // Log the provider detail server-side; never forward it (it can include account info).
      this.logger.error(
        `LLM request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadGatewayException('The AI assistant is temporarily unavailable');
    }
  }
}
