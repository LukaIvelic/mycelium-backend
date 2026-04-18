import {
  ClassSerializerInterceptor,
  ValidationPipe,
  INestApplication,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

export function configure(app: INestApplication) {
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Mycelium Swagger')
    .setDescription('Backend API documentation for Mycelium')
    .setVersion('1.0.0')
    .addOAuth2({
      type: 'oauth2',
      flows: {
        password: {
          tokenUrl: '/api/authentication/token',
          scopes: {},
        },
      },
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      initOAuth: { clientId: '' },
    },
  });
}
