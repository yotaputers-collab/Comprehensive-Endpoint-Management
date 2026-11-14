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

Then open **http://localhost:3000/** in a browser for the console — service health, open vulnerabilities, the ISO 27001 score, agents and runtime configuration, refreshed every 15 seconds.

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
| `JWT_EXPIRES_IN` | `15m` | Access token lifetime |
| `JWT_REFRESH_TTL_DAYS` | `7` | Refresh token lifetime, in days |
| `RATE_LIMIT_MAX` | `300` | Requests per minute per IP on general routes |
| `RATE_LIMIT_AUTH_MAX` | `10` | Requests per minute per IP on `/auth/*` |
| `BCRYPT_ROUNDS` | `10` | Reserved — passwords are hashed with scrypt |
| `ADMIN_USERNAME` | `admin` | Username of the initial administrator |
| `ADMIN_INITIAL_PASSWORD` | *(generated)* | Password for that first administrator; used only when the users table is empty |
| `AGENT_ENROLL_TOKEN` | *(generated)* | Shared secret agents use to enrol; generated and logged per process if unset |
| `AGENT_ONLINE_WINDOW_MS` | `120000` | Silence after which a host is reported offline |
| `OSV_API_BASE` | `https://api.osv.dev` | Advisory source; point at a mirror for air-gapped installs |
| `OSV_TTL_HOURS` | `24` | How long a cached OSV answer is reused |
| `OSV_DETAIL_CONCURRENCY` | `4` | Parallel advisory fetches during a scan |
| `SCAN_INTERVAL_MINUTES` | `1440` | Automatic scan period; `0` disables the timer |
| `SCAN_STALE_AFTER_MINUTES` | interval | Age at which a host's scan counts as due |
| `SCAN_CONCURRENCY` | `2` | Hosts scanned in parallel within one pass |
| `SCAN_MAX_HOSTS_PER_RUN` | `50` | Upper bound on hosts per scan pass |
| `SCAN_WORKER_INTERVAL_MS` | `5000` | How often the queue worker polls for work |
| `SCAN_JOB_STALE_MS` | `300000` | A job running longer than this is requeued |
| `SCAN_JOB_MAX_ATTEMPTS` | `3` | Attempts before an abandoned job is failed |
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

Base URL `http://localhost:3000`. `/` serves the browser console; every other path returns JSON.

**Every endpoint requires an `Authorization: Bearer <token>` header** except `POST /auth/login`, `GET /health` and the console at `/`.

### Authentication

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/auth/login` | Exchange credentials for a token — `{ "username", "password" }` |
| `GET` | `/auth/me` | Claims carried by the presented token |
| `POST` | `/auth/refresh` | Exchange a refresh token for a new pair — the old one is revoked |
| `POST` | `/auth/logout` | Revoke one refresh token |
| `POST` | `/auth/logout-all` | Revoke every session for the caller, including live access tokens |
| `POST` | `/auth/password` | Change your own password — `{ "currentPassword", "newPassword" }` |
| `GET` | `/auth/users` | List accounts (admin) |
| `POST` | `/auth/users` | Create an account — `{ "username", "password", "role" }` (admin) |
| `PATCH` | `/auth/users/:id` | Change a role or the active flag — `{ "role", "active" }` (admin) |
| `DELETE` | `/auth/users/:id` | Deactivate an account (admin) |

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"admin","password":"your-password"}' | jq -r .accessToken)

curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/agents
```

**Roles:** `viewer` is read-only, `operator` may also record vulnerabilities and drive agent actions, `admin` may change configuration and manage accounts (and always passes every check).

**Sessions:** access tokens are short-lived (`JWT_EXPIRES_IN`) and are re-checked against the database on every request, so disabling an account or bumping its token version invalidates them immediately. Refresh tokens are stored only as SHA-256 hashes and rotate on every use; `/auth/login` returns both tokens. Five consecutive failed sign-ins lock an account for 15 minutes, and `/auth/*` is rate limited per IP (`RATE_LIMIT_AUTH_MAX`, 10/min). Demoting or deactivating an account revokes its live sessions at once.

On first start, when the users table is empty, an administrator is created. Set `ADMIN_INITIAL_PASSWORD` to choose the password; otherwise one is generated and printed **once** in the logs (`docker compose logs app | grep administrator`).

### Inventory — agents and endpoints

Hosts appear by enrolling, not by being typed in. An agent posts once with the shared enrolment
token and receives its own credential, then heartbeats with it:

```bash
# 1. Enrol (token comes from AGENT_ENROLL_TOKEN; generated and logged if unset)
curl -s -X POST http://localhost:3000/agents/enroll \
  -H 'content-type: application/json' \
  -H "x-enroll-token: $AGENT_ENROLL_TOKEN" \
  -d '{"hostname":"web-01","platform":"linux","osVersion":"Ubuntu 22.04","architecture":"x64","agentVersion":"1.0.0","ipAddress":"10.0.0.5"}'
# -> { "endpointId": "...", "agentToken": "..." }

# 2. Heartbeat every minute (401 means the token or endpoint is gone)
curl -s -X POST http://localhost:3000/agents/$ENDPOINT_ID/heartbeat \
  -H 'content-type: application/json' \
  -H "x-agent-token: $AGENT_TOKEN" \
  -d '{"ipAddress":"10.0.0.5","agentVersion":"1.0.0"}'

# 3. Report installed packages (a full snapshot, replaces the previous report)
curl -s -X POST http://localhost:3000/agents/$ENDPOINT_ID/inventory \
  -H 'content-type: application/json' \
  -H "x-agent-token: $AGENT_TOKEN" \
  -d '{"packages":[{"name":"openssl","version":"3.0.2","vendor":"OpenSSL","source":"dpkg"}]}'
```

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/agents/enroll` | Enrol a host — `X-Enroll-Token` header, no user session |
| `POST` | `/agents/:id/heartbeat` | Liveness update — `X-Agent-Token` header, no user session |
| `POST` | `/agents/:id/inventory` | Software snapshot — `X-Agent-Token` header, answers `202` |
| `GET` | `/agents/:id/software` | Installed packages for one host |
| `POST` | `/agents/:id/scan` | Match this host's software against OSV (admin/operator) |
| `GET` | `/agents` | Active hosts, each with `status: online` or `offline` |
| `GET` | `/agents/:id` | One host |
| `POST` | `/agents` | Manual inventory entry (admin/operator) |
| `POST` | `/agents/:id` | Rename or re-version a host (admin/operator) |
| `DELETE` | `/agents/:id` | Decommission; its heartbeats stop being accepted (admin) |
| `POST` | `/agents/:id/deploy`, `/agents/:id/collect-data` | Not implemented — returns `501` |

A host is **online** while its last heartbeat is inside `AGENT_ONLINE_WINDOW_MS` (120 s by default),
so the console reflects reality without a separate status column. Agent tokens are stored only as
SHA-256 hashes and are dropped when the host is decommissioned.

Each inventory report is a **full snapshot**: that host's previous rows are deleted and the new list
inserted in a single transaction, so a failed upload cannot leave a host half-inventoried, and an
empty `packages` array is a valid way to clear it. Up to 5000 packages per report. On Debian/Ubuntu
`dpkg-query` and on RHEL `rpm -qa` give the raw list; turning it into the JSON above is the agent's job.
The console shows a host's packages when you click its name in the Agents panel.

### Vulnerability scanning

A scan asks OSV about the exact package versions a host reported, so version-range evaluation
and distro backports are handled by OSV rather than re-implemented here.

```bash
curl -s -X POST http://localhost:3000/agents/$ENDPOINT_ID/scan \
  -H "Authorization: Bearer $TOKEN"
```

- **Ecosystem** comes from the host's reported OS — `Ubuntu 22.04` becomes `Ubuntu:22.04`, `Debian 12`
  becomes `Debian:12`, `Alpine 3.18` becomes `Alpine:v3.18` — or from the package source when it is a
  language ecosystem (`pypi` to `PyPI`, plus `npm`, `cargo`, `go`, `maven`, `rubygems`). A host with no
  recognisable OS version has its distro packages **skipped** rather than guessed.
- **Cached** per `(ecosystem, package, version)` for `OSV_TTL_HOURS` (24 by default), so rescans cost
  nothing. `OSV_API_BASE` can point at a mirror for air-gapped installations.
- **Degrades safely**: if OSV is unreachable the scan still answers `200` with `"degraded": true`,
  using cached answers only.
- **Reconciled**: new advisories are inserted, existing rows updated, and findings for software that is
  no longer installed are removed. A finding an operator marked patched stays patched.
- **Severity** uses the advisory's `database_specific` or `ecosystem_specific` label when present;
  otherwise it is derived from the CVSS v3 vector (`CVSS:3.1/...`) with the published base-score
  formula. Only when both are missing does it stay `unknown`.
- Each row records package, installed version and fixed version, so the UI shows the upgrade needed.

### Scheduled scans

A scan loop runs in-process and rescans hosts whose last scan is older than the staleness threshold, so
findings do not age silently. Scans run one pass at a time, `SCAN_CONCURRENCY` hosts in parallel, and at
most `SCAN_MAX_HOSTS_PER_RUN` hosts per pass; hosts with no software report are skipped rather than
marked as scanned.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/scan/status` | Scheduler settings and the outcome of the last run (admin) |
| `POST` | `/scan/run` | Sweep due hosts now; `?force=true` rescans even fresh ones (admin/operator) |

Set `SCAN_INTERVAL_MINUTES=0` to switch the timer off — manual runs still honour
`SCAN_STALE_AFTER_MINUTES` (which defaults to the interval). Advisory bodies are fetched with bounded
parallelism (`OSV_DETAIL_CONCURRENCY`), which keeps the first scan of a large fleet from serialising
hundreds of round trips.

Queued scans are processed by an in-process worker that polls every `SCAN_WORKER_INTERVAL_MS`.
Each job is claimed with a conditional update, so replicas sharing one database never run the same
job twice. A job whose replica dies mid-scan is requeued once it has been running longer than
`SCAN_JOB_STALE_MS`, and is failed after `SCAN_JOB_MAX_ATTEMPTS` attempts instead of retrying forever.

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
| `GET` | `/compliance/assessment` | ISO 27001 assessment report, generated by `Iso27001Service` |

The assessment is derived from the estate rather than hard-coded. Each control reports the evidence it
used, and requirements with nothing to assess are `not-applicable` instead of silently passing:

| Control | Requirement | Measured from |
| --- | --- | --- |
| A.8.1 | Asset inventory maintained | Active endpoints enrolled |
| A.8.2 | Software inventoried | Active hosts that reported a package list (90% compliant, 50% partial) |
| A.8.8 | Scanned each period | Active hosts scanned in the last 30 days (same thresholds) |
| A.8.8 | Critical findings remediated | Unpatched `critical` findings on enrolled hosts |
| A.12.4 | Security events logged | Audit events stored in the last 30 days |

`POST /compliance/audit-log` persists the event, which is what the logging control counts.
| `POST` | `/compliance/audit-log` | Record an audit event |

### WebSocket (SOC integration)

Connect to `ws://localhost:3001` (Socket.IO). Security events are broadcast on the `security-event` channel:

```js
io('http://localhost:3001').on('security-event', (event) => console.log(event));
```

## Project structure

```
public/
└── index.html               Read-only console (served at /)
src/
├── main.ts                  Bootstrap: validation pipe, port/host from env
├── app.module.ts            Root module: config, TypeORM, feature modules
├── health.controller.ts     GET /health
├── config/                  Config module, runtime settings, /configuration routes
├── entities/                TypeORM entities (endpoint, vulnerability, DLP)
├── repositories/            Endpoint and vulnerability data access
├── modules/
│   ├── agent/               Agent CRUD, DTOs, deployment/monitoring strategies
│   ├── vulnerability/       Vulnerability records, OSV lookup and scanning
│   └── endpoint/            Endpoint module wiring
├── agents/                  Agent abstraction and Windows agent
├── auth/                    Login, global JWT guard, scrypt hashing, admin seeding
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
| `npm test` | Jest specs (`src/**/*.spec.ts`); `src/tests` holds legacy stubs that are excluded |

## Tests

`npm test` runs the committed specs; no database or network access is needed.

| Spec | Covers |
| --- | --- |
| `src/auth/auth.spec.ts` | Sign-in, lockout after five failures, refresh rotation and reuse, logout revocation, role enforcement, password change |
| `src/middleware/rate-limit.spec.ts` | Per-IP budgets, separate auth and general buckets, window expiry, `Retry-After`, limits over HTTP |
| `src/compliance/compliance.spec.ts` | Assessment endpoint shape and role access, summary/finding arithmetic, `Iso27001Service` report |
| `src/config/configuration.spec.ts` | Grouped settings, single keys, secret redaction, admin-only writes, backup/restore round trip |
| `src/modules/agent/agent.spec.ts` | Enrolment token, per-agent credentials, heartbeat auth, inventory replacement, decommissioning, unimplemented commands |
| `src/modules/vulnerability/cvss.spec.ts` | CVSS v3 base scores, severity labels, refusing vectors it cannot score |
| `src/modules/vulnerability/scan.service.spec.ts` | OSV reconciliation: create, update, resolve, patched rows kept, degraded mode, counters |
| `src/modules/vulnerability/scan.queue.spec.ts` | Queue claiming under concurrent replicas, orphan recovery, attempt budget, worker shutdown |
| `src/modules/vulnerability/scan.scheduler.spec.ts` | Scheduler status, due-host selection, `force`, hosts without inventory, decommissioned hosts |

The specs run the real entities and queries against an in-memory Postgres: `src/test/pg-shim.ts`
replaces the `pg` package through jest's `moduleNameMapper` (a `require.cache` patch would not work,
because jest has its own module registry). `src/test/app.ts` boots the application on that database
and seeds hosts, so specs exercise the same code paths as production without a live server.

## Known gaps

- Accounts are deactivated, never deleted, so the users table keeps its audit trail.
- Rate-limit counters are in memory and per process: running more than one replica means each keeps its own budget (use Redis or an ingress limiter to share it).
- `GET /vulnerabilities/unpatched` and `/vulnerabilities/critical` are shadowed by the earlier `/:id` route; use the `unpatched` query parameter on `/vulnerabilities` instead.
- The scheduled sweep still runs per replica: with several replicas each selects its own due hosts, so a host can be swept twice. Queue jobs are claimed atomically, so `POST /scan/enqueue` is safe from any replica; when scaling out, enqueue instead of sweeping directly or run a single scheduler.
- Coverage stops where OSV stops: Ubuntu, Debian, Alpine and language packages are matched, while RHEL/CentOS/SUSE distro packages are skipped.
- `/agents/:id/deploy` and `/collect-data` answer `501`: there is no command channel, so nothing can be run on a host.
- DLP still returns stubbed data and no `/dlp` routes exist. The ISO 27001 assessment measures five controls against live data, but the thresholds (90% compliant, 50% partial) and the 30-day window are fixed in code, and audit events are plain rows with no tamper-evidence or retention policy.
- The DLP tables are created but no `/dlp` routes are exposed.
- Configuration overrides live in memory and are per process: a restart, or another replica, will not see them.
- The console at `/` cannot create or edit anything: it lists hosts (with a detail sheet where admin/operator can trigger a scan), vulnerabilities, compliance and configuration.

## Troubleshooting

**`npm ci` fails with "Missing: ... from lock file"** — the committed lockfile was hand-edited. Regenerate it with `rm package-lock.json && npm install`.

**Compose fails with `not a directory` on `/app/.env`** — an older compose file bind-mounted a `.env` file that did not exist. The current file passes settings via `environment:`; make sure you are on the latest revision.

**Container exits with `Cannot find module '@nestjs/core'`** — the production stage skipped `npm ci`; the current Dockerfile installs production dependencies before copying `dist/`.

**`ECONNREFUSED` on startup** — the app retries the database 10 times over ~30 seconds, then exits. Confirm Postgres is reachable at `DB_HOST:DB_PORT` and that `DB_DATABASE` exists.

**`Docker Desktop is unable to start` on Windows** — this is a WSL2 backend problem, not an application problem. On this machine WSL returns `ERROR_LOGON_TYPE_NOT_GRANTED`. Enable the Virtual Machine Platform/Hyper-V features, run `wsl --update`, ensure the Secondary Logon service is running, and reboot. Docker Desktop may be installed under `%LOCALAPPDATA%\Programs\DockerDesktop` rather than `C:\Program Files\Docker`.

**Port already in use** — change the host side of the mapping, e.g. `"8080:3000"`, or stop the conflicting service. Ports 3000, 3001, 5432 and 6379 are all claimed by this stack.
