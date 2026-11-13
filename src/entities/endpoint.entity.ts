import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';

@Entity()
export class Endpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  platform: 'windows' | 'linux';

  @Column({ type: 'varchar', length: 100 })
  version: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastSeen?: string;

  @Column({ type: 'jsonb', nullable: true })
  configuration?: any;

  @Column({ type: 'jsonb', nullable: true })
  capabilities?: any[];

  @Column({ type: 'timestamp', nullable: true })
  lastScannedAt?: Date;

  @Column({ type: 'integer', default: 0 })
  vulnerabilityCount?: number;

  @Column({ type: 'integer', default: 0 })
  criticalVulnerabilities?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}