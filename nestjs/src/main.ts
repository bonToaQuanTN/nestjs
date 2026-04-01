import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder} from '@nestjs/swagger'
import * as dotenv from 'dotenv';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

async function bootstrap() {

  dotenv.config();
  console.log('JWT_SECRET:', process.env.JWT_SECRET);

  const config = new DocumentBuilder()
  .setTitle('My API')
  .setDescription('API documentation for my project')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

  const logger = WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level}] ${message}`;
          }),
        ),
      }),

      // ghi tất cả log
      new winston.transports.File({
        filename: 'logs/combined.log',
        level: 'info',
      }),

      // ghi riêng lỗi
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
      }),
    ],
  }); 
  
  const app = await NestFactory.create(AppModule,{ logger });
  const document = SwaggerModule.createDocument(app, config);
  


  SwaggerModule.setup('api', app, document);
  app.useGlobalPipes(new ValidationPipe({transform: true,}),
  );
  await app.listen(3000);
  
}
bootstrap();
