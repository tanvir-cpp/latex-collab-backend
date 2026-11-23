import pg from 'pg';
import { DataSource } from 'typeorm';
import { loadEnv } from 'vite';

// Loaded through Vite because Node cannot import the TypeScript migration files itself.
const migrationModules = import.meta.glob<Record<string, new () => object>>(
  '../src/migrations/*.ts',
  { eager: true },
);
const migrations = Object.values(migrationModules).flatMap((m) => Object.values(m));

/** Creates the e2e database if needed and applies all migrations to it. */
export default async function setup() {
  const env = loadEnv('test', process.cwd(), '');
  const database = env.DB_NAME_TEST ?? `${env.DB_NAME}_test`;
  const connection = {
    host: env.DB_HOST,
    port: Number(env.DB_PORT ?? 5432),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  };

  const admin = new pg.Client({ ...connection, database: 'postgres' });
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
  if (exists.rowCount === 0) await admin.query(`CREATE DATABASE "${database}"`);
  await admin.end();

  const dataSource = new DataSource({
    type: 'postgres',
    ...connection,
    username: connection.user,
    database,
    migrations,
  });
  await dataSource.initialize();
  await dataSource.runMigrations();
  await dataSource.destroy();
}
