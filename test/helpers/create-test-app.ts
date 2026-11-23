import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { LLM_PROVIDER, type LlmProvider, type LlmRequest } from '../../src/module/ai/llm.provider.js';
import { MailService } from '../../src/module/mail/mail.service.js';

export interface SentMail {
  to: string;
  subject: string;
  html: string;
}

export interface TestApp {
  app: INestApplication;
  outbox: SentMail[];
  /** Every request the AI module sent to the (fake) LLM. */
  llmRequests: LlmRequest[];
  /** Base URL of the listening server, for Socket.IO clients. */
  url: string;
}

/** Boots the full app on a random port with the mailer and the LLM replaced by in-memory fakes. */
export async function createTestApp(): Promise<TestApp> {
  const outbox: SentMail[] = [];
  const llmRequests: LlmRequest[] = [];
  const fakeLlm: LlmProvider = {
    complete: async (request) => {
      llmRequests.push(request);
      return 'Fake assistant answer';
    },
  };

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue({
      send: async (to: string, subject: string, html: string) => {
        outbox.push({ to, subject, html });
      },
    })
    .overrideProvider(LLM_PROVIDER)
    .useValue(fakeLlm)
    .compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.listen(0);
  const address = app.getHttpServer().address() as { port: number };
  return { app, outbox, llmRequests, url: `http://127.0.0.1:${address.port}` };
}

/** Pulls the `token` query value out of the link in an email. */
export function tokenFromMail(mail: SentMail): string {
  const match = /token=([0-9a-f]+)/.exec(mail.html);
  if (!match) throw new Error('No token link in email');
  return match[1];
}
