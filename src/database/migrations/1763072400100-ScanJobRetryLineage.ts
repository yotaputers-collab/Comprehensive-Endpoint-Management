import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A database kept by synchronize before retry lineage existed has a scan_job
 * table without this column. Adding it conditionally means the migration is a
 * no-op where the column is already there, whether it arrived with the initial
 * schema or from an earlier synchronize pass.
 */
export class ScanJobRetryLineage1763072400100 implements MigrationInterface {
  name = 'ScanJobRetryLineage1763072400100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('scan_job', 'retriedFromId'))) {
      await queryRunner.query(
        `ALTER TABLE "scan_job" ADD "retriedFromId" character varying(36)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('scan_job', 'retriedFromId')) {
      await queryRunner.query(`ALTER TABLE "scan_job" DROP COLUMN "retriedFromId"`);
    }
  }
}
