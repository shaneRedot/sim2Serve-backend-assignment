import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  console.log('⏳ Please wait while the application is starting...');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security and performance middleware
  app.use(helmet());
  app.use(compression());

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger documentation
  const swaggerServer = process.env.SWAGGER_SERVER || `http://localhost:${process.env.PORT || 3001}`;
  const config = new DocumentBuilder()
    .setTitle('User Service API')
    .setDescription('User authentication and management microservice')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer(swaggerServer)
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`User Service is running on port ${port}`);
  console.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
}
bootstrap();
