# Endpoint Management Platform

A NestJS + PostgreSQL service for endpoint management, vulnerability assessment, DLP policy management and ISO 27001 compliance reporting.

> **Status:** the application builds and runs. Several feature modules (agents, DLP, compliance) are still backed by in-memory stubs or unused repositories rather than real business logic — see [Known gaps](#known-gaps).

## Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js 20 (Alpine in Docker) |
| Framework | NestJS 10 |
| Database | PostgreSQL 13 via TypeORM 0.3 |
| Realtime | Socket.IO gateway on port 3001 |
| Cache (optional) | Redis 7 |

## Quick start (Docker)

```bash
git clone https://github.com/yotaputers-collab/Comprehensive-Endpoint-Management.git
cd Comprehensive-Endpoint-Management

docker compose up --build
```

Then check it is up:

```bash
curl http://localhost:3000/health
# {"status":"ok","database":"up","uptime":5}
```

Compose starts three services:

| Service | Container | Port |
| --- | --- | --- |
| `app` | `endpoint-management` | 3000 (HTTP), 3001 (WebSocket) |
| `postgres` | `endpoint-postgres` | 5432 |
| `redis` | `endpoint-redis` | 6379 |

Postgres credentials come from shell variables with defaults, so no `.env` file is required:

```bash
DB_PASSWORD=my-secret JWT_SECRET=my-jwt-secret docker compose up --build
```

Stop with `docker compose down`; add `-v` to also drop the database volume.

## Quick start (local, no Docker)

Requires Node.js 18+ and a reachable PostgreSQL 13+ instance.

```bash
npm install
cp .env.example .env        # then edit the database values
npm run build
npm start
```

A `.env` file in the working directory is loaded automatically on startup, so `cp .env.example .env` and editing it is enough for local development. Variables set in the shell take precedence, which is handy for one-off runs:

```bash
DB_HOST=localhost DB_PASSWORD=postgres npm start
```

## Configuration

All settings are read from environment variables.

| Variable | Default | Purpose |
| --- | --- | --- |
| `APP_HOST` | `0.0.0.0` | HTTP bind address |
| `APP_PORT` | `3000` | HTTP port |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |
| `DB_DATABASE` | `endpoint_management` | Database name |
| `DB_SYNCHRONIZE` | `true` | Create/update tables from entities on boot |
| `DB_LOGGING` | `false` | Log every SQL statement |
| `JWT_SECRET` | `change-this-secret` | Token signing key — **change in production** |
| `JWT_EXPIRES_IN` | `1h` | Token lifetime |
| `BCRYPT_ROUNDS` | `10` | Password hashing cost |
| `DLp_RETENTION_PERIOD` | `90` | DLP violation retention (days) |
| `DLp_REAL_TIME_MONITORING` | `true` | Enable real-time DLP monitoring |
| `VULNERABILITY_SCAN_INTERVAL` | `3600000` | Scan interval (ms) |
| `VULNERABILITY_AUTO_REMEDIATION` | `false` | Auto-apply patches |
| `ISO27001_ENABLED` | `true` | Enable compliance reporting |
| `AUDIT_RETENTION_DAYS` | `365` | Audit log retention (days) |
| `REDIS_HOST` / `REDIS_PORT` | `redis` / `6379` | Optional cache |

### Database schema

There are no migrations in this repository. `DB_SYNCHRONIZE=true` lets TypeORM create the tables from the entity definitions on first boot, which is what makes a fresh container work. Once you introduce real data, switch to migrations and set `DB_SYNCHRONIZE=false`.

## API

Base URL `http://localhost:3000`. Requests and responses are JSON.

### Health

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness plus a database round-trip — `{"status":"ok","database":"up","uptime":5}` |

### Agents

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/agents` | List agents |
| `POST` | `/agents` | Create an agent — `{ name, platform: "windows" \| "linux", version?, description? }` |
| `GET` | `/agents/:id` | Get one agent |
| `POST` | `/agents/:id` | Update an agent |
| `POST` | `/agents/:id/deploy` | Deploy agent configuration |
| `POST` | `/agents/:id/collect-data` | Collect data from an agent |

### Vulnerabilities

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/vulnerabilities` | Paged list — `?severity=&type=&unpatched=&page=&limit=` |
| `POST` | `/vulnerabilities` | Create a vulnerability |
| `GET` | `/vulnerabilities/:id` | Get one vulnerability |
| `GET` | `/vulnerabilities/by-endpoint/:endpointId` | Vulnerabilities for an endpoint |
| `GET` | `/vulnerabilities/by-severity/:severity` | Filter by `low`/`medium`/`high`/`critical` |
| `POST` | `/vulnerabilities/:id/patche` | Mark as patched |
| `POST` | `/vulnerabilities/batch-patch` | Patch many — `{ ids: [] }` |

### Configuration

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/configuration` | Effective configuration (secrets excluded) |
| `GET` | `/configuration/:key` | Single setting |
| `PUT` | `/configuration/:key` | Override at runtime — `{ "value": ... }` |
| `POST` | `/configuration/backup` | Serialise the current configuration |
| `POST` | `/configuration/restore` | Restore from a backup payload — `{ backupData }` |

### Compliance

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/compliance/assessment` | ISO 27001 assessment report |
| `POST` | `/compliance/audit-log` | Record an audit event |

### WebSocket (SOC integration)

Connect to `ws://localhost:3001` (Socket.IO). Security events are broadcast on the `security-event` channel:

```js
io('http://localhost:3001').on('security-event', (event) => console.log(event));
```

## Project structure

```
src/
├── main.ts                  Bootstrap: validation pipe, port/host from env
├── app.module.ts            Root module: config, TypeORM, feature modules
├── health.controller.ts     GET /health
├── config/                  Config module, runtime settings, /configuration routes
├── entities/                TypeORM entities (endpoint, vulnerability, DLP)
├── repositories/            Endpoint and vulnerability data access
├── modules/
│   ├── agent/               Agent CRUD, DTOs, deployment/monitoring strategies
│   ├── vulnerability/       Vulnerability service, controller, DTOs
│   └── endpoint/            Endpoint module wiring
├── agents/                  Agent abstraction and Windows agent
├── auth/                    JWT service, guard, strategy (not yet wired)
├── compliance/              ISO 27001 assessment service and controller
├── dlps/                    DLP policy engine, entities' repositories
├── soc/                     Socket.IO gateway and incident handler
├── middleware/              Per-IP rate limiting
└── tests/                   Jest unit and e2e suites (excluded from the build)
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled application |
| `npm test` | Jest (`src/tests` is outside the production build) |

## Known gaps

- **Authentication is not wired up.** `src/auth` contains a JWT service, guard and strategy, but no module registers them, so the API is currently open. Do not expose it publicly as-is.
- `GET /vulnerabilities/unpatched` and `/vulnerabilities/critical` are shadowed by the earlier `/:id` route; use the `unpatched` query parameter on `/vulnerabilities` instead.
- Agent, DLP and parts of the compliance layer return stubbed data — the repositories exist but no controller or service drives them yet.
- The DLP tables are created but no `/dlp` routes are exposed.

## Troubleshooting

**`npm ci` fails with "Missing: ... from lock file"** — the committed lockfile was hand-edited. Regenerate it with `rm package-lock.json && npm install`.

**Compose fails with `not a directory` on `/app/.env`** — an older compose file bind-mounted a `.env` file that did not exist. The current file passes settings via `environment:`; make sure you are on the latest revision.

**Container exits with `Cannot find module '@nestjs/core'`** — the production stage skipped `npm ci`; the current Dockerfile installs production dependencies before copying `dist/`.

**`ECONNREFUSED` on startup** — the app retries the database 10 times over ~30 seconds, then exits. Confirm Postgres is reachable at `DB_HOST:DB_PORT` and that `DB_DATABASE` exists.

**`Docker Desktop is unable to start` on Windows** — this is a WSL2 backend problem, not an application problem. On this machine WSL returns `ERROR_LOGON_TYPE_NOT_GRANTED`. Enable the Virtual Machine Platform/Hyper-V features, run `wsl --update`, ensure the Secondary Logon service is running, and reboot. Docker Desktop may be installed under `%LOCALAPPDATA%\Programs\DockerDesktop` rather than `C:\Program Files\Docker`.

**Port already in use** — change the host side of the mapping, e.g. `"8080:3000"`, or stop the conflicting service. Ports 3000, 3001, 5432 and 6379 are all claimed by this stack.
