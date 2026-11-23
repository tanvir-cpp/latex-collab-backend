import { BadGatewayException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { GeminiProvider } from './gemini.provider.js';

const { generateContent, ApiError } = vi.hoisted(() => ({
  generateContent: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(public status: number) {
      super('api error');
    }
  },
}));

vi.mock('@google/genai', () => {
  class GoogleGenAI {
    models = { generateContent };
  }
  return { GoogleGenAI, ApiError, FinishReason: { SAFETY: 'SAFETY' } };
});

const configWith = (values: Record<string, string | undefined>) =>
  ({
    get: (key: string) => values[key],
    getOrThrow: (key: string) => values[key] as string,
  }) as unknown as ConfigService;
const configured = configWith({ LLM_API_KEY: 'k', LLM_MODEL: 'some-model' });
const request = {
  system: 'sys',
  messages: [
    { role: 'user' as const, content: 'hi' },
    { role: 'assistant' as const, content: 'hello' },
  ],
};

describe('GeminiProvider', () => {
  beforeEach(() => generateContent.mockReset());

  it('is unavailable without an API key', async () => {
    const provider = new GeminiProvider(configWith({ LLM_MODEL: 'm' }));
    await expect(provider.complete(request)).rejects.toThrow(ServiceUnavailableException);
  });

  it('passes the system instruction, maps roles and returns the text', async () => {
    generateContent.mockResolvedValue({ text: ' answer ', candidates: [{ finishReason: 'STOP' }] });
    await expect(new GeminiProvider(configured).complete(request)).resolves.toBe('answer');
    expect(generateContent.mock.calls[0][0]).toMatchObject({
      model: 'some-model',
      contents: [
        { role: 'user', parts: [{ text: 'hi' }] },
        { role: 'model', parts: [{ text: 'hello' }] },
      ],
      config: { systemInstruction: 'sys' },
    });
  });

  it('maps blocked prompts and safety stops to 422, empty output to 502', async () => {
    generateContent.mockResolvedValueOnce({ promptFeedback: { blockReason: 'SAFETY' } });
    await expect(new GeminiProvider(configured).complete(request)).rejects.toThrow(UnprocessableEntityException);
    generateContent.mockResolvedValueOnce({ text: 'partial', candidates: [{ finishReason: 'SAFETY' }] });
    await expect(new GeminiProvider(configured).complete(request)).rejects.toThrow(UnprocessableEntityException);
    generateContent.mockResolvedValueOnce({ text: undefined, candidates: [{ finishReason: 'STOP' }] });
    await expect(new GeminiProvider(configured).complete(request)).rejects.toThrow(BadGatewayException);
  });

  it('maps HTTP 429 to 429 and other failures to 502', async () => {
    generateContent.mockRejectedValueOnce(new ApiError(429));
    await expect(new GeminiProvider(configured).complete(request)).rejects.toMatchObject({ status: 429 });
    generateContent.mockRejectedValueOnce(new ApiError(500));
    await expect(new GeminiProvider(configured).complete(request)).rejects.toThrow(BadGatewayException);
  });
});
