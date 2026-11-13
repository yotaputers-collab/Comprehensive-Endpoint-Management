import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('dlp_rules')
export class DlpRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  policyId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 32 })
  type: 'content' | 'context' | 'metadata';

  @Column({ type: 'varchar', length: 32 })
  operator: 'contains' | 'notContains' | 'regex' | 'exactMatch';

  @Column({ type: 'text' })
  pattern: string;

  @Column({ type: 'varchar', length: 32 })
  action: 'block' | 'alert' | 'quarantine';

  @Column({ type: 'varchar', length: 16 })
  severity: 'low' | 'medium' | 'high';

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
