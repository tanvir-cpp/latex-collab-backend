import { MailerModule } from '@nestjs-modules/mailer';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service.js';

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const user = config.get<string>('MAIL_USER');
        const pass = config.get<string>('MAIL_PASSWORD');
        return {
          transport: {
            host: config.getOrThrow<string>('MAIL_HOST'),
            port: config.getOrThrow<number>('MAIL_PORT'),
            ...(user && pass ? { auth: { user, pass } } : {}),
          },
          defaults: { from: config.getOrThrow<string>('MAIL_FROM') },
        };
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
