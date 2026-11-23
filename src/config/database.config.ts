import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function buildDatabaseOptions(config: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.getOrThrow<string>('DB_HOST'),
    port: config.getOrThrow<number>('DB_PORT'),
    username: config.getOrThrow<string>('DB_USER'),
    password: config.getOrThrow<string>('DB_PASSWORD'),
    database: config.getOrThrow<string>('DB_NAME'),
    autoLoadEntities: true,
    // Schema changes go through migrations (see README), never synchronize.
    synchronize: false,
    migrationsRun: false,
  };
}
