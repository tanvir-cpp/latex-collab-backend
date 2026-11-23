import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

/** Gives every error the same JSON shape and hides internals on 500s. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message } = this.normalize(exception);
    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json({
      statusCode,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private normalize(exception: unknown): { statusCode: number; message: string | string[] } {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ?? exception.message);
      return { statusCode: exception.getStatus(), message };
    }
    if (exception instanceof QueryFailedError) {
      const code = (exception.driverError as { code?: string } | undefined)?.code;
      if (code === PG_UNIQUE_VIOLATION) {
        return { statusCode: HttpStatus.CONFLICT, message: 'Resource already exists' };
      }
      if (code === PG_FOREIGN_KEY_VIOLATION) {
        return { statusCode: HttpStatus.CONFLICT, message: 'Related resource conflict' };
      }
    }
    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }
}
