import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schemas';

export const DRIZZLE = Symbol('DRIZZLE');

const returnDrizzle = (config: ConfigService) => {
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  const pool = new Pool({
    connectionString: config.get('DATABASE_URL'),
    ssl: isProduction ? { rejectUnauthorized: true } : false,
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
