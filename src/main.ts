import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { MyceliumInformation } from './lib/constants/mycelium-app-information';
import { configure } from './main.config';

/** Creates the Fastify app, applies config, and starts listening. */
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>(
    'PORT',
    MyceliumInformation.defaultPort,
  );

  configure(app);

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
