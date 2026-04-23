import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './config/database.config';
import { typeOrmAsyncConfig } from './config/typeorm.config';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { ApiKeyModule } from './modules/api-key/api-key.module';
import { ProjectModule } from './modules/project/project.module';
import { LogModule } from './modules/log/log.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig] }),
    TypeOrmModule.forRootAsync(typeOrmAsyncConfig),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'single',
        url: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
      }),
    }),
    UserModule,
    AuthModule,
    ApiKeyModule,
    ProjectModule,
    LogModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
