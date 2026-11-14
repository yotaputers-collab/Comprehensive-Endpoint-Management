/**
 * Runs before every spec (jest `setupFiles`). The database itself is provided by
 * `test/pg-shim.ts`, which is mapped over the `pg` package in the jest config.
 *
 * Defaults are set here rather than in the specs because services such as
 * ScanScheduler and ScanService read their settings in their constructors, so a
 * spec that cares about a value must override it before creating the app.
 */
// Tests boot through the real migrations rather than synchronize, so the
// migration SQL is exercised by every suite instead of a separate one.
process.env.DB_SYNCHRONIZE = 'false';
process.env.DB_MIGRATIONS_RUN = 'true';
process.env.DB_LOGGING = 'false';
process.env.JWT_SECRET = 'test-secret';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_INITIAL_PASSWORD = 'admin-pass-1234';
process.env.AGENT_ENROLL_TOKEN = 'enroll-token';
process.env.OSV_API_BASE = 'http://127.0.0.1:9';
process.env.OSV_TTL_HOURS = '24';
process.env.SCAN_INTERVAL_MINUTES = '0';
process.env.SCAN_WORKER_INTERVAL_MS = '60000';
process.env.RATE_LIMIT_MAX = '100000';
process.env.RATE_LIMIT_AUTH_MAX = '100000';