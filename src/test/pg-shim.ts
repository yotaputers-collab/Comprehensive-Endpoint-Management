/**
 * Mapped over the `pg` package for tests (see jest.moduleNameMapper), so the real
 * TypeORM entities and queries run against an in-memory Postgres instead of a
 * live server. Each test file gets its own fresh database.
 *
 * This has to be a module mapping rather than a require.cache patch: jest loads
 * modules through its own registry, which ignores require.cache.
 */
import { DataType, newDb } from 'pg-mem';

const db = newDb();

db.public.registerFunction({
  name: 'version',
  returns: DataType.text,
  implementation: () => 'PostgreSQL 13.0 (pg-mem)',
});
db.public.registerFunction({
  name: 'current_database',
  returns: DataType.text,
  implementation: () => 'endpoint_management_test',
});
db.public.registerFunction({
  name: 'current_schema',
  returns: DataType.text,
  implementation: () => 'public',
});
db.public.registerFunction({
  name: 'uuid_generate_v4',
  returns: DataType.uuid,
  impure: true,
  implementation: () => require('crypto').randomUUID(),
});

module.exports = db.adapters.createPg();