import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The schema as it stands. Each table is created only when it is absent, so the
 * migration also runs against a database that synchronize kept in shape: those
 * tables are left alone and their data stays put. Columns added after the fact
 * are handled by later migrations, which check for themselves.
 */
export class InitialSchema1763072400000 implements MigrationInterface {
  name = 'InitialSchema1763072400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.create(queryRunner, 'endpoint', [
      `CREATE TABLE "endpoint" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "platform" character varying(50) NOT NULL, "version" character varying(100) NOT NULL, "description" character varying(255), "osVersion" character varying(100), "architecture" character varying(50), "ipAddress" character varying(64), "agentTokenHash" character varying(64), "lastSeenAt" TIMESTAMP, "active" boolean NOT NULL DEFAULT true, "configuration" jsonb, "capabilities" jsonb, "lastScannedAt" TIMESTAMP, "vulnerabilityCount" integer NOT NULL DEFAULT '0', "criticalVulnerabilities" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_7785c5c2cf24e6ab3abb7a2e89f" PRIMARY KEY ("id"))`,
      `CREATE UNIQUE INDEX "IDX_7c0ae79d819af12066918e900d" ON "endpoint" ("agentTokenHash")`,
    ]);
    await this.create(queryRunner, 'software_packages', [
      `CREATE TABLE "software_packages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "endpointId" uuid NOT NULL, "name" character varying(255) NOT NULL, "version" character varying(100) NOT NULL, "vendor" character varying(255), "source" character varying(50), "reportedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bfa84f3d62b19801c166d439232" PRIMARY KEY ("id"))`,
      `CREATE INDEX "IDX_25a911414e8c560ad69e08f289" ON "software_packages" ("endpointId")`,
      `CREATE INDEX "IDX_e1637a2363cb0c967fd4abf0ec" ON "software_packages" ("name")`,
    ]);
    await this.create(queryRunner, 'vulnerability', [
      `CREATE TABLE "vulnerability" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "cveId" character varying(255) NOT NULL, "severity" character varying(100) NOT NULL, "type" character varying(100) NOT NULL, "publisher" character varying(255), "installedVersion" character varying(255), "latestVersion" character varying(255), "isPatched" boolean NOT NULL DEFAULT false, "affectedSoftware" character varying(255), "detectionDetails" jsonb, "detectedAt" TIMESTAMP, "endpointId" uuid, "advisoryId" character varying(100), "packageName" character varying(255), "fixedVersion" character varying(100), "source" character varying(50), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_0d1b35aef20e00b7b907cca7358" PRIMARY KEY ("id"))`,
      `CREATE UNIQUE INDEX "IDX_b1ab1492dcf4b2b2dad067d0fb" ON "vulnerability" ("endpointId", "advisoryId", "packageName")`,
    ]);
    await this.create(queryRunner, 'osv_lookups', [
      `CREATE TABLE "osv_lookups" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ecosystem" character varying(100) NOT NULL, "packageName" character varying(255) NOT NULL, "version" character varying(100) NOT NULL, "findings" jsonb NOT NULL DEFAULT '[]', "fetchedAt" TIMESTAMP NOT NULL DEFAULT now(), "refreshedAt" TIMESTAMP NOT NULL, CONSTRAINT "PK_1ad54c6748141aaa68dfde61905" PRIMARY KEY ("id"))`,
      `CREATE UNIQUE INDEX "IDX_d7caac48abbf21d4db86eea226" ON "osv_lookups" ("ecosystem", "packageName", "version")`,
    ]);
    await this.create(queryRunner, 'dlp_policies', [
      `CREATE TABLE "dlp_policies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "description" text, "enabled" boolean NOT NULL DEFAULT true, "priority" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5b5709873c3ac50af59d3c3584f" PRIMARY KEY ("id"))`,
    ]);
    await this.create(queryRunner, 'dlp_rules', [
      `CREATE TABLE "dlp_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "policyId" uuid NOT NULL, "name" character varying(255) NOT NULL, "type" character varying(32) NOT NULL, "operator" character varying(32) NOT NULL, "pattern" text NOT NULL, "action" character varying(32) NOT NULL, "severity" character varying(16) NOT NULL, "enabled" boolean NOT NULL DEFAULT true, "description" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d41b9c1f2212b65943b5bdd4ade" PRIMARY KEY ("id"))`,
    ]);
    await this.create(queryRunner, 'dlp_violations', [
      `CREATE TABLE "dlp_violations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "policyId" uuid NOT NULL, "ruleId" uuid, "endpointId" character varying(255) NOT NULL, "user" character varying(255), "matchedContent" text, "ruleType" character varying(32), "severity" character varying(16), "actionTaken" character varying(32), "metadata" jsonb, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f58d7cb9e5df0edc7ec2769d879" PRIMARY KEY ("id"))`,
    ]);
    await this.create(queryRunner, 'users', [
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying(64) NOT NULL, "passwordHash" character varying(255) NOT NULL, "role" character varying(32) NOT NULL DEFAULT 'viewer', "active" boolean NOT NULL DEFAULT true, "tokenVersion" integer NOT NULL DEFAULT '0', "lastLoginAt" TIMESTAMP, "failedLoginAttempts" integer NOT NULL DEFAULT '0', "lockedUntil" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    ]);
    await this.create(queryRunner, 'refresh_tokens', [
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "tokenHash" character varying(64) NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "revokedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
      `CREATE INDEX "IDX_610102b60fea1455310ccd299d" ON "refresh_tokens" ("userId")`,
      `CREATE UNIQUE INDEX "IDX_c25bc63d248ca90e8dcc1d92d0" ON "refresh_tokens" ("tokenHash")`,
    ]);
    await this.create(queryRunner, 'scan_job', [
      `CREATE TABLE "scan_job" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "endpointId" character varying(255) NOT NULL, "force" boolean NOT NULL DEFAULT false, "startedAt" TIMESTAMP, "finishedAt" TIMESTAMP, "running" boolean NOT NULL DEFAULT false, "attempts" integer NOT NULL DEFAULT '0', "summary" json, "lastError" character varying(500), "retriedFromId" character varying(36), "createdAt" TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b136e9f9a8b433b3f7d90fd2af0" PRIMARY KEY ("id"))`,
    ]);
    await this.create(queryRunner, 'audit_events', [
      `CREATE TABLE "audit_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "eventType" character varying(255) NOT NULL, "user" character varying(255), "endpointId" uuid, "details" json, "complianceRelevance" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_910f64d901a5c3e9878f0d4a407" PRIMARY KEY ("id"))`,
      `CREATE INDEX "IDX_548f6bc664e40b1b0c6bd07dbb" ON "audit_events" ("eventType")`,
      `CREATE INDEX "IDX_7f51b93a1819ea59b9df7d9855" ON "audit_events" ("createdAt") `,
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "audit_events", "scan_job", "refresh_tokens", "users", "dlp_violations", "dlp_rules", "dlp_policies", "osv_lookups", "vulnerability", "software_packages", "endpoint"`,
    );
  }

  /** Creates a table and its indexes only when the table does not exist yet. */
  private async create(
    queryRunner: QueryRunner,
    table: string,
    statements: string[],
  ): Promise<void> {
    if (await queryRunner.hasTable(table)) {
      return;
    }
    for (const statement of statements) {
      await queryRunner.query(statement);
    }
  }
}
