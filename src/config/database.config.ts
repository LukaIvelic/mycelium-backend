import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('database', (): TypeOrmModuleOptions => {
  const url = new URL(process.env.DATABASE_URL as string);
  url.searchParams.delete('sslmode');

  const isProduction = process.env.NODE_ENV === 'production';

  return {
    type: process.env.DB_TYPE as any,
    url: url.toString(),
    ssl: { rejectUnauthorized: false },
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: !isProduction,
    migrationsRun: isProduction,
    logging: !isProduction,
  } as TypeOrmModuleOptions;
});