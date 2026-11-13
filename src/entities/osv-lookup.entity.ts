import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Cached OSV answer for one (ecosystem, package, version) triple. OSV resolves
 * version ranges — including distro backports — so we store its verdict rather
 * than re-implementing package version comparison.
 */
@Entity('osv_lookups')
@Index(['ecosystem', 'packageName', 'version'], { unique: true })
export class OsvLookup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  ecosystem: string;

  @Column({ type: 'varchar', length: 255 })
  packageName: string;

  @Column({ type: 'varchar', length: 100 })
  version: string;

  /** Normalised findings: advisoryId, cveIds, summary, severity, fixedVersion. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  findings: OsvFinding[];

  @CreateDateColumn()
  fetchedAt: Date;

  /** Set by the scanning service; drives the cache TTL. */
  @Column({ type: 'timestamp' })
  refreshedAt: Date;
}

export interface OsvFinding {
  advisoryId: string;
  cveIds: string[];
  summary: string;
  severity: string;
  fixedVersion: string | null;
}
