import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DlpPolicy } from '../entities/dl-policy.entity';
import { DlpRule } from '../entities/dl-rule.entity';
import { DlpViolation } from '../entities/dl-violation.entity';

@Injectable()
export class DlpPolicyRepository {
  constructor(
    @InjectRepository(DlpPolicy) private readonly repository: Repository<DlpPolicy>,
  ) {}

  findActive(): Promise<DlpPolicy[]> {
    return this.repository.find({ where: { enabled: true } });
  }

  findById(id: string): Promise<DlpPolicy | null> {
    return this.repository.findOneBy({ id });
  }

  createPolicy(policy: Partial<DlpPolicy>): Promise<DlpPolicy> {
    return this.repository.save(this.repository.create(policy));
  }

  async updatePolicy(id: string, updates: Partial<DlpPolicy>): Promise<DlpPolicy | null> {
    await this.repository.update(id, updates);
    return this.repository.findOneBy({ id });
  }

  async deletePolicy(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}

@Injectable()
export class DlpRuleRepository {
  constructor(
    @InjectRepository(DlpRule) private readonly repository: Repository<DlpRule>,
  ) {}

  findByPolicy(policyId: string): Promise<DlpRule[]> {
    return this.repository.find({ where: { policyId } });
  }

  createRule(rule: Partial<DlpRule>): Promise<DlpRule> {
    return this.repository.save(this.repository.create(rule));
  }

  async updateRule(id: string, updates: Partial<DlpRule>): Promise<DlpRule | null> {
    await this.repository.update(id, updates);
    return this.repository.findOneBy({ id });
  }

  async deleteRule(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}

@Injectable()
export class DlpViolationRepository {
  constructor(
    @InjectRepository(DlpViolation) private readonly repository: Repository<DlpViolation>,
  ) {}

  createViolation(violation: Partial<DlpViolation>): Promise<DlpViolation> {
    return this.repository.save(this.repository.create(violation));
  }

  findByPolicy(policyId: string): Promise<DlpViolation[]> {
    return this.repository.find({ where: { policyId } });
  }

  findByEndpoint(endpointId: string): Promise<DlpViolation[]> {
    return this.repository.find({ where: { endpointId } });
  }

  findRecentViolations(hours: number): Promise<DlpViolation[]> {
    return this.repository
      .createQueryBuilder('violation')
      .where("violation.timestamp >= NOW() - (:hours || ' hours')::interval", { hours })
      .getMany();
  }
}
