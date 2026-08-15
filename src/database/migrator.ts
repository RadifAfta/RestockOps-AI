import * as path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { Migrator, FileMigrationProvider } from 'kysely';
import { db, pool } from './client.js';
import { logger } from '../core/logger/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(direction: 'latest' | 'down' = 'latest') {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, 'migrations'),
    }),
  });

  logger.info(`Running migrations [${direction}]...`);

  const { error, results } = direction === 'latest' ? await migrator.migrateToLatest() : await migrator.migrateDown();

  results?.forEach((it) => {
    if (it.status === 'Success') {
      logger.info(`Migration "${it.migrationName}" executed successfully.`);
    } else if (it.status === 'Error') {
      logger.error(`Migration "${it.migrationName}" failed.`);
    }
  });

  if (error) {
    logger.error({ err: error }, 'Migration process encountered an error');
    process.exitCode = 1;
  }

  await db.destroy();
  await pool.end();
}

const action = process.argv[2] === 'down' ? 'down' : 'latest';
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runMigrations(action).catch((err) => {
    logger.error({ err }, 'Fatal error during migration');
    process.exit(1);
  });
}
