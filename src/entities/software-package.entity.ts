import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * One installed package on one endpoint. Agents report a full snapshot, so the
 * rows for an endpoint are replaced on every report rather than diffed.
 */
@Entity('software_packages')
export class SoftwarePackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  endpointId: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  version: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  vendor?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  source?: string;

  @CreateDateColumn()
  reportedAt: Date;
}
