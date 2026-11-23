export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
}

/** Seam between the AI feature and a concrete LLM vendor. Implementations return plain text. */
export interface LlmProvider {
  complete(request: LlmRequest): Promise<string>;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
