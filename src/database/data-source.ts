import { DataSource, DataSourceOptions } from 'typeorm';
import { ENTITIES } from './entities';
import { MIGRATIONS } from './migrations';

type ReadEnv = (key: string) => string | undefined;

const fromProcess: ReadEnv = (key) => process.env[key];

/**
 * The database settings, shared by the application and the migration CLI so the
 * two cannot disagree about which entities or migrations exist.
 *
 * `synchronize` is off by default: the schema is owned by the migrations, and a
 * deployment that silently altered tables was how columns appeared before this
 * existed. `migrationsRun` is on by default so a deploy applies what is pending
 * before serving traffic.
 */
export function databaseOptions(read: ReadEnv = fromProcess): DataSourceOptions {
  return {
    type: 'postgres',
    host: read('DB_HOST') ?? 'localhost',
    port: Number(read('DB_PORT') ?? 5432),
    username: read('DB_USERNAME') ?? 'postgres',
    password: read('DB_PASSWORD') ?? 'postgres',
    database: read('DB_DATABASE') ?? 'endpoint_management',
    entities: ENTITIES,
    migrations: MIGRATIONS,
    migrationsTableName: 'migrations',
    synchronize: read('DB_SYNCHRONIZE') === 'true',
    migrationsRun: (read('DB_MIGRATIONS_RUN') ?? 'true') !== 'false',
    logging: read('DB_LOGGING') === 'true',
  };
}

/** Used by the CLI only; the application builds its own options from ConfigService. */
export const AppDataSource = new DataSource(databaseOptions());
