import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ApiKeyModule } from './modules/api-key/api-key.module';
import { ApiKeyStatsModule } from './modules/api-key-stats/api-key-stats.module';
import { AuthModule } from './modules/auth/auth.module';
import { FlowModule } from './modules/flow/flow.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { LogModule } from './modules/log/log.module';
import { LogDetailModule } from './modules/log-detail/log-detail.module';
import { ProjectModule } from './modules/project/project.module';
import { UserModule } from './modules/user/user.module';

const redisModule = RedisModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'single' as const,
    options: {
      host: config.get<string>('REDISHOST'),
      port: config.get<number>('REDISPORT'),
      username: config.get<string>('REDISUSER'),
      password: config.get<string>('REDISPASSWORD'),
      connectTimeout: 10000,
      commandTimeout: 5000,
      retryStrategy: (times: number) => Math.min(times * 200, 2000),
    },
  }),
});

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    redisModule,
    UserModule,
    AuthModule,
    ApiKeyModule,
    ApiKeyStatsModule,
    ProjectModule,
    FlowModule,
    IntegrationModule,
    LogModule,
    LogDetailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
