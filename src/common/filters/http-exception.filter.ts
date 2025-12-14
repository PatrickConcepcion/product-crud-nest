import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

type ErrorPayload = {
  success: false;
  message: string;
  status: number;
  errors?: Record<string, string[]>;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let payload: ErrorPayload = {
      success: false,
      message: 'Internal server error',
      status,
    };

    // Handle Prisma errors
    if (exception && typeof exception === 'object' && 'code' in exception) {
      const prismaError = exception as { code: string };
      if (prismaError.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        payload = {
          success: false,
          status,
          message: 'Unique constraint failed',
        };
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      
      if (typeof res === 'string') {
        payload = {
          success: false,
          status,
          message: res,
        };
      } else {
        const body = res as Record<string, any>;
        
        // Check if response has both message and errors (from ValidationPipe)
        if (body.message && body.errors) {
          payload = {
            success: false,
            status,
            message: typeof body.message === 'string' ? body.message : 'Validation failed',
            errors: body.errors,
          };
        }
        // Check if response is just field errors (e.g., {email: [...]})
        else if (!body.message && !body.error && !body.statusCode) {
          const defaultMessage = status === HttpStatus.UNAUTHORIZED ? 'Unauthorized' : 'Validation failed';
          payload = {
            success: false,
            status,
            message: defaultMessage,
            errors: body as Record<string, string[]>,
          };
        }
        // Handle standard NestJS error response
        else {
          const message = body.message 
            ? (Array.isArray(body.message) ? body.message.join(', ') : body.message)
            : exception.message || 'Error';
          
          payload = {
            success: false,
            status,
            message,
          };
        }
      }
    }

    response.status(status).json(payload);
  }
}
