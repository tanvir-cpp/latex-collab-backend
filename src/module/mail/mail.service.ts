import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailer: MailerService) {}

  /** Sends an email; delivery failures are logged and rethrown to the caller. */
  async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.mailer.sendMail({ to, subject, html });
    } catch (error) {
      this.logger.error(`Failed to send "${subject}" email`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }
}
