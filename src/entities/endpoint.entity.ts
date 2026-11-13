import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type EndpointPlatform = 'windows' | 'linux' | 'macos';

@Entity()
export class Endpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Hostname reported by the agent. */
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  platform: EndpointPlatform;

  /** Agent version, reported at enrolment and refreshed on heartbeat. */
  @Column({ type: 'varchar', length: 100 })
  version: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  osVersion?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  architecture?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress?: string;

  /** SHA-256 of the agent's bearer token; the token itself is never stored. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, nullable: true })
  agentTokenHash?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt?: Date | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

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
