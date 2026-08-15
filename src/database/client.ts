import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import { config } from '../config/index.js';
import type { Database } from './schema/index.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.DATABASE_URL || undefined,
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  ssl: config.DB_SSL ? { rejectUnauthorized: false } : false,
  max: config.DB_MAX_CONNECTIONS,
});

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool,
  }),
});
