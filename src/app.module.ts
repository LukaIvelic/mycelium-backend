import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ApiKeyModule } from './modules/api-key/api-key.module';
import { AuthModule } from './modules/auth/auth.module';
import { LogModule } from './modules/log/log.module';
import { LogDetailModule } from './modules/log-detail/log-detail.module';
import { ProjectModule } from './modules/project/project.module';
import { UserModule } from './modules/user/user.module';

const redisModule = RedisModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'single' as const,
    url: config.get<string>('REDIS_URL'),
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
    ProjectModule,
    LogModule,
    LogDetailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
