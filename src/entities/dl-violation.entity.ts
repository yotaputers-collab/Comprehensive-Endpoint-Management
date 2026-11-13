import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('dlp_violations')
export class DlpViolation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  policyId: string;

  @Column({ type: 'uuid', nullable: true })
  ruleId?: string;

  @Column({ type: 'varchar', length: 255 })
  endpointId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  user?: string;

  @Column({ type: 'text', nullable: true })
  matchedContent?: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  ruleType?: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  severity?: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  actionTaken?: 'blocked' | 'alerted' | 'quarantined';

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @CreateDateColumn()
  timestamp: Date;
}
