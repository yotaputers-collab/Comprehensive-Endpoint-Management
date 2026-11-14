import { MigrationInterface } from 'typeorm';
import { InitialSchema1763072400000 } from './1763072400000-InitialSchema';
import { ScanJobRetryLineage1763072400100 } from './1763072400100-ScanJobRetryLineage';

/** Every migration in order. Registered with both the app and the CLI. */
export const MIGRATIONS: Array<new () => MigrationInterface> = [
  InitialSchema1763072400000,
  ScanJobRetryLineage1763072400100,
];
