import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schemas';

export const DRIZZLE = Symbol('DRIZZLE');

const DATABASE_POOL_MAX = 5;
const DATABASE_CONNECTION_TIMEOUT_MS = 10_000;
const DATABASE_IDLE_TIMEOUT_MS = 30_000;

const returnDrizzle = (config: ConfigService) => {
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  const pool = new Pool({
    connectionString: config.get('DATABASE_URL'),
    ssl: isProduction ? { rejectUnauthorized: true } : false,
    max: DATABASE_POOL_MAX,
    connectionTimeoutMillis: DATABASE_CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: DATABASE_IDLE_TIMEOUT_MS,
  });
  return drizzle(pool, { schema });
};

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: returnDrizzle,
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
