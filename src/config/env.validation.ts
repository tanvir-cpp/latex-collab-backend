import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/** Every environment variable the backend reads. Validated once at boot. */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT: number = 5432;

  @IsString()
  @IsNotEmpty()
  DB_USER: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DB_NAME: string;

  /** Authentication (member 1) */
  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRES_IN: string = '15m';

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  /** Mailer */
  @IsString()
  @IsNotEmpty()
  MAIL_HOST: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  MAIL_PORT: number = 587;

  @IsOptional()
  @IsString()
  MAIL_USER?: string;

  @IsOptional()
  @IsString()
  MAIL_PASSWORD?: string;

  @IsString()
  @IsNotEmpty()
  MAIL_FROM: string;

  /** Base URL of the Next.js frontend, used in email links and CORS. */
  @IsUrl({ require_tld: false })
  FRONTEND_URL: string;

  /** LLM provider (member 3). The key is optional so the app boots without AI. */
  @IsOptional()
  @IsString()
  LLM_API_KEY?: string;

  @IsUrl({ require_tld: false })
  LLM_BASE_URL: string = 'https://api.anthropic.com';

  @IsString()
  @IsNotEmpty()
  LLM_MODEL: string = 'claude-sonnet-5-5';
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors
      .map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return validated;
}
