import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorName = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const errorResponse = res as Record<string, unknown>;
        message =
          (errorResponse.message as string | string[]) || exception.message;
        errorName = (errorResponse.error as string) || exception.name;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle known Prisma errors without leaking database internals
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'A record with this unique identifier already exists';
        errorName = 'Conflict';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Requested record was not found in the database';
        errorName = 'Not Found';
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = 'Database operation constraint violation';
        errorName = 'Database Error';
      }
    } else {
      this.logger.error(
        `Unhandled Exception on ${request.method} ${request.url}: ${
          exception instanceof Error ? exception.stack : String(exception)
        }`,
      );
    }

    response.status(status).json({
      statusCode: status,
      error: errorName,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
