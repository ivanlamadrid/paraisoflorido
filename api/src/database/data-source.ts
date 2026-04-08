import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm.config';

loadEnv({ path: '.env' });

const port = Number(process.env.DB_PORT ?? 5432);

const dataSource = new DataSource(
  buildTypeOrmOptions({
    nodeEnv: process.env.NODE_ENV ?? 'development',
    host: process.env.DB_HOST ?? '',
    port,
    username: process.env.DB_USER ?? '',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? '',
  }),
);

export default dataSource;
