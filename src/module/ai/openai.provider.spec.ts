import { BadGatewayException, HttpException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { OpenAiProvider } from './openai.provider.js';

const { create, RateLimitError } = vi.hoisted(() => ({
  create: vi.fn(),
  RateLimitError: class RateLimitError extends Error {},
}));

vi.mock('openai', () => {
  class OpenAI {
    static RateLimitError = RateLimitError;
    chat = { completions: { create } };
  }
  return { default: OpenAI };
});

const configWith = (values: Record<string, string | undefined>) =>
  ({
    get: (key: string) => values[key],
    getOrThrow: (key: string) => values[key] as string,
  }) as unknown as ConfigService;
const configured = configWith({ LLM_API_KEY: 'k', LLM_MODEL: 'some-model' });
const request = { system: 'sys', messages: [{ role: 'user' as const, content: 'hi' }] };

describe('OpenAiProvider', () => {
  beforeEach(() => create.mockReset());

  it('is unavailable without an API key', async () => {
    const provider = new OpenAiProvider(configWith({ LLM_MODEL: 'm' }));
    await expect(provider.complete(request)).rejects.toThrow(ServiceUnavailableException);
  });

  it('sends the system prompt first and returns the trimmed text', async () => {
    create.mockResolvedValue({ choices: [{ message: { content: ' answer \n' }, finish_reason: 'stop' }] });
    await expect(new OpenAiProvider(configured).complete(request)).resolves.toBe('answer');
    expect(create.mock.calls[0][0]).toMatchObject({
      model: 'some-model',
      messages: [{ role: 'system', content: 'sys' }, { role: 'user', content: 'hi' }],
    });
  });

  it('maps refusals to 422 and empty output to 502', async () => {
    create.mockResolvedValueOnce({ choices: [{ message: { content: null, refusal: 'no' }, finish_reason: 'stop' }] });
    await expect(new OpenAiProvider(configured).complete(request)).rejects.toThrow(UnprocessableEntityException);
    create.mockResolvedValueOnce({ choices: [{ message: { content: '  ' }, finish_reason: 'stop' }] });
    await expect(new OpenAiProvider(configured).complete(request)).rejects.toThrow(BadGatewayException);
  });

  it('maps rate limits to 429 and hides other vendor errors', async () => {
    create.mockRejectedValueOnce(new RateLimitError('slow down'));
    await expect(new OpenAiProvider(configured).complete(request)).rejects.toMatchObject({ status: 429 });

    create.mockRejectedValueOnce(new Error('secret account detail'));
    const failure = await new OpenAiProvider(configured).complete(request).catch((e: HttpException) => e);
    expect(failure).toBeInstanceOf(BadGatewayException);
    expect((failure as HttpException).message).not.toContain('secret');
  });
});
