import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, HttpStatus, BadRequestException, ValidationError } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      exceptionFactory: (errors: ValidationError[]) => {
        const formatted: Record<string, string[]> = {};
        errors.forEach((err) => {
          const messages = err.constraints ? Object.values(err.constraints) : [];
          if (messages.length) {
            formatted[err.property] = messages;
          }
        });
        return new BadRequestException({
          message: 'Validation failed',
          errors: formatted,
        });
      },
    }),
  );
  app.enableCors({
    origin: ['http://localhost:5173'],
    credentials: true,
    methods: ['*'],
    allowedHeaders: ['*'],
  });
  await app.listen(process.env.PORT ?? 3005);
}
bootstrap();
