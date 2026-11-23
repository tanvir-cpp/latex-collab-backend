import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { MailService } from '../../src/module/mail/mail.service.js';

export interface SentMail {
  to: string;
  subject: string;
  html: string;
}

/** Boots the full app with the mailer replaced by an in-memory outbox. */
export async function createTestApp(): Promise<{ app: INestApplication; outbox: SentMail[] }> {
  const outbox: SentMail[] = [];
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue({
      send: async (to: string, subject: string, html: string) => {
        outbox.push({ to, subject, html });
      },
    })
    .compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return { app, outbox };
}

/** Pulls the `token` query value out of the link in an email. */
export function tokenFromMail(mail: SentMail): string {
  const match = /token=([0-9a-f]+)/.exec(mail.html);
  if (!match) throw new Error('No token link in email');
  return match[1];
}
