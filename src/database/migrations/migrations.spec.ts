import { DataSource } from 'typeorm';
import { DataType, IMemoryDb, newDb } from 'pg-mem';
import { ENTITIES } from '../entities';
import { MIGRATIONS } from './index';

/**
 * The migrations run against an in-memory Postgres, over the same entities the
 * application uses. These specs cover what a live server would tell us and a
 * unit test otherwise cannot: the DDL is valid, it is complete enough for the
 * app's queries, and it is safe to run on a database synchronize already built.
 */
describe('schema migrations', () => {
  const databases: IMemoryDb[] = [];

  const memoryDb = (): IMemoryDb => {
    const db = newDb();
    db.public.registerFunction({
      name: 'version',
      returns: DataType.text,
      implementation: () => 'PostgreSQL 13.0 (pg-mem)',
    });
    db.public.registerFunction({
      name: 'current_database',
      returns: DataType.text,
      implementation: () => 'migrations_test',
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
    databases.push(db);
    return db;
  };

  const dataSourceFor = (db: IMemoryDb, synchronize: boolean): Promise<DataSource> =>
    db.adapters.createTypeormDataSource({
      type: 'postgres',
      entities: ENTITIES,
      migrations: MIGRATIONS,
      migrationsTableName: 'migrations',
      synchronize,
      migrationsRun: false,
    });

  const hasColumn = async (source: DataSource, table: string, column: string) => {
    const runner = source.createQueryRunner();
    try {
      return await runner.hasColumn(table, column);
    } finally {
      await runner.release();
    }
  };

  afterEach(async () => {
    databases.length = 0;
  });

  it('creates the whole schema on an empty database', async () => {
    const source = await dataSourceFor(memoryDb(), false);
    await source.initialize();

    const applied = await source.runMigrations({ transaction: 'each' });
    expect(applied.map((migration) => migration.name)).toEqual([
      'InitialSchema1763072400000',
      'ScanJobRetryLineage1763072400100',
    ]);
    expect(await source.showMigrations()).toBe(false);

    const tables = await source.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    const names = tables.map((row: { table_name: string }) => row.table_name);
    for (const expected of [
      'endpoint',
      'software_packages',
      'vulnerability',
      'osv_lookups',
      'scan_job',
      'audit_events',
      'dlp_policies',
      'dlp_rules',
      'dlp_violations',
      'users',
      'refresh_tokens',
    ]) {
      expect(names).toContain(expected);
    }

    // The retry column exists, so the queue view can select it.
    expect(await hasColumn(source, 'scan_job', 'retriedFromId')).toBe(true);

    await source.destroy();
  });

  it('is a no-op the second time it runs', async () => {
    const db = memoryDb();
    const first = await dataSourceFor(db, false);
    await first.initialize();
    await first.runMigrations({ transaction: 'each' });

    const again = await first.runMigrations({ transaction: 'each' });
    expect(again).toHaveLength(0);

    await first.destroy();

    // A fresh process against the same database applies nothing either.
    const second = await dataSourceFor(db, false);
    await second.initialize();
    expect(await second.showMigrations()).toBe(false);
    await second.destroy();
  });

  it('adopts a database that synchronize already built, keeping its rows', async () => {
    const db = memoryDb();
    const synced = await dataSourceFor(db, true);
    await synced.initialize();
    await synced.query(
      `INSERT INTO "users" ("username", "passwordHash") VALUES ('existing', 'scrypt$salt$key')`,
    );
    await synced.destroy();

    const migrated = await dataSourceFor(db, false);
    await migrated.initialize();

    const applied = await migrated.runMigrations({ transaction: 'each' });
    expect(applied).toHaveLength(2);

    const rows = await migrated.query(`SELECT "username" FROM "users"`);
    expect(rows).toEqual([{ username: 'existing' }]);

    await migrated.destroy();
  });

  it('repairs a schema that predates the retry column', async () => {
    const db = memoryDb();
    const synced = await dataSourceFor(db, true);
    await synced.initialize();
    await synced.query(`ALTER TABLE "scan_job" DROP COLUMN "retriedFromId"`);
    await synced.destroy();

    const migrated = await dataSourceFor(db, false);
    await migrated.initialize();
    await migrated.runMigrations({ transaction: 'each' });

    expect(await hasColumn(migrated, 'scan_job', 'retriedFromId')).toBe(true);

    await migrated.destroy();
  });

  it('reverts cleanly', async () => {
    const source = await dataSourceFor(memoryDb(), false);
    await source.initialize();
    await source.runMigrations({ transaction: 'each' });

    await source.undoLastMigration({ transaction: 'each' });
    expect(await hasColumn(source, 'scan_job', 'retriedFromId')).toBe(false);

    await source.undoLastMigration({ transaction: 'each' });
    const tables = await source.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'endpoint'`,
    );
    expect(tables).toHaveLength(0);

    await source.destroy();
  });
});
