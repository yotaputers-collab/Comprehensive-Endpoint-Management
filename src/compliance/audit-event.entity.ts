import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** An audit event recorded through POST /compliance/audit-log. */
@Entity('audit_events')
export class AuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  eventType: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  user?: string | null;

  @Column({ type: 'uuid', nullable: true })
  endpointId?: string | null;

  @Column({ type: 'json', nullable: true })
  details?: any;

  @Column({ type: 'json', nullable: true })
  complianceRelevance?: string[] | null;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}