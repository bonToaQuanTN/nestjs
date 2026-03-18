import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder} from '@nestjs/swagger'
import * as dotenv from 'dotenv';

async function bootstrap() {

  const app = await NestFactory.create(AppModule);

  dotenv.config();
  console.log('JWT_SECRET:', process.env.JWT_SECRET);

  const config = new DocumentBuilder()
  .setTitle('My API')
  .setDescription('API documentation for my project')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document);
  app.useGlobalPipes(new ValidationPipe({transform: true,}),
  );
  await app.listen(4500);
  
}
bootstrap();
