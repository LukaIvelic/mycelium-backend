import {
  ClassSerializerInterceptor,
  type INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { MyceliumInformation } from './lib/constants/mycelium-app-information';
import { HttpMethod } from './lib/enumerations/http-methods';

/** Applies all global middleware, pipes, and Swagger to the app. */
export function configure(app: INestApplication) {
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));
  app.setGlobalPrefix(MyceliumInformation.globalPrefix);
  enableCors(app);
  useGlobalPipes(app);
  if (MyceliumInformation.swaggerEnabled) {
    setupSwagger(app);
  }
}

/** Enables CORS for configured origins and allowed HTTP methods. */
function enableCors(app: INestApplication) {
  app.enableCors({
    origin: MyceliumInformation.allowedOrigins,
    credentials: true,
    methods: [
      HttpMethod.GET,
      HttpMethod.POST,
      HttpMethod.PUT,
      HttpMethod.PATCH,
      HttpMethod.DELETE,
      HttpMethod.OPTIONS,
    ],
  });
}

/** Registers a strict validation pipe that strips unknown properties. */
function useGlobalPipes(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}

/** Builds the OpenAPI document builder with OAuth2 and API key auth. */
function generateDocumentBuilder() {
  return new DocumentBuilder()
    .setTitle(MyceliumInformation.title)
    .setDescription(MyceliumInformation.description)
    .setVersion(MyceliumInformation.version)
    .addOAuth2({
      type: 'oauth2',
      flows: {
        password: {
          tokenUrl: MyceliumInformation.oAuthTokenUrl,
          scopes: {},
        },
      },
    })
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
      },
      'x-api-key',
    );
}

/** Mounts the Swagger UI at the configured path. */
function setupSwagger(app: INestApplication) {
  const config = generateDocumentBuilder().build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(MyceliumInformation.swaggerPath, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
    },
  });
}
