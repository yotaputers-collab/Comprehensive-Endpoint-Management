import { existsSync, readFileSync } from 'fs';
import { AppDataSource } from './data-source';

/**
 * Minimal .env loader: the CLI has to work outside Nest, and the project has no
 * dotenv dependency of its own. Existing environment variables win, so a
 * container's real settings are never overwritten by a stale file.
 */
function loadEnvFile(path = process.env.ENV_FILE ?? '.env'): void {
  if (!existsSync(path)) {
    return;
  }

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const entry = line.trim();
    if (!entry || entry.startsWith('#')) {
      continue;
    }
    const split = entry.indexOf('=');
    if (split < 1) {
      continue;
    }
    const key = entry.slice(0, split).trim();
    if (process.env[key] === undefined) {
      process.env[key] = entry.slice(split + 1).trim().replace(/^["']|["']$/g, '');
    }
  }
}

async function main(): Promise<void> {
  loadEnvFile();

  const command = (process.argv[2] ?? 'show').toLowerCase();
  if (process.env.DB_SYNCHRONIZE === 'true') {
    console.warn(
      'DB_SYNCHRONIZE=true: synchronize is also rewriting the schema. Set it to false when using migrations.',
    );
  }

  const dataSource = await AppDataSource.initialize();

  try {
    switch (command) {
      case 'run': {
        const applied = await dataSource.runMigrations({ transaction: 'each' });
        console.log(
          applied.length
            ? `Applied ${applied.length} migration(s): ${applied.map((m) => m.name).join(', ')}`
            : 'Already up to date.',
        );
        break;
      }
      case 'revert': {
        await dataSource.undoLastMigration({ transaction: 'each' });
        console.log('Reverted the last migration.');
        break;
      }
      case 'show': {
        const pending = await dataSource.showMigrations();
        console.log(
          pending
            ? 'There are pending migrations. Run `npm run migration:run`.'
            : 'The schema is up to date.',
        );
        break;
      }
      default:
        throw new Error(`Unknown command "${command}". Use run, revert or show.`);
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
