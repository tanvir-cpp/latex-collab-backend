import { DataSource } from 'typeorm';

/** Used only by the TypeORM CLI (`pnpm migration:*`), which runs against the compiled `dist/` output. Reads the same env vars as the app. */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migrations/*.js'],
});
