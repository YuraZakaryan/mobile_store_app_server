import * as process from 'process';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import {NestExpressApplication} from "@nestjs/platform-express";
import {SwaggerModule, DocumentBuilder, OpenAPIObject} from '@nestjs/swagger';
import * as path from "path";
const PORT = process.env.PORT || 4000

const start = async (): Promise<void> => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  app.setGlobalPrefix('api');
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  const config: Omit<OpenAPIObject, 'paths'> = new DocumentBuilder()
      .setTitle('Mobile Store App')
      .setDescription('This app is build on NEST JS')
      .setVersion('0.0.1')
      .addBearerAuth()
      .addTag('by Zakaryan')
      .build();
  const document: OpenAPIObject = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/api/docs', app, document);

  await app.listen(PORT, '0.0.0.0', (): void => {
    console.log(`Server is started on ${PORT} port`);
  });
}
start()