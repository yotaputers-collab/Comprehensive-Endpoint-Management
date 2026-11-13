import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DlpPolicy, DlpRule, DlpViolation } from '../entities';

@EntityRepository(DlpPolicy)
export class DlpPolicyRepository extends Repository<DlpPolicy> {
  async findActive(): Promise<DlpPolicy[]> {
    return this.find({ where: { enabled: true } });
  }

  async findById(id: string): Promise<DlpPolicy | null> {
    return this.findOneBy({ id });
  }

  async createPolicy(policy: Partial<DlpPolicy>): Promise<DlpPolicy> {
    const newPolicy = this.create(policy);
    return this.save(newPolicy);
  }

  async updatePolicy(id: string, updates: Partial<DlpPolicy>): Promise<DlpPolicy | null> {
    await this.update(id, updates);
    return this.findOneBy({ id });
  }

  async deletePolicy(id: string): Promise<boolean> {
    const result = await this.delete(id);
    return result.affected > 0;
  }
}

@EntityRepository(DlpRule)
export class DlpRuleRepository extends Repository<DlpRule> {
  async findByPolicy(policyId: string): Promise<DlpRule[]> {
    return this.find({ where: { policy: { id: policyId } } });
  }

  async createRule(rule: Partial<DlpRule>): Promise<DlpRule> {
    const newRule = this.create(rule);
    return this.save(newRule);
  }

  async updateRule(id: string, updates: Partial<DlpRule>): Promise<DlpRule | null> {
    await this.update(id, updates);
    return this.findOneBy({ id });
  }

  async deleteRule(id: string): Promise<boolean> {
    const result = await this.delete(id);
    return result.affected > 0;
  }
}

@EntityRepository(DlpViolation)
export class DlpViolationRepository extends Repository<DlpViolation> {
  async createViolation(violation: Partial<DlpViolation>): Promise<DlpViolation> {
    const newViolation = this.create(violation);
    return this.save(newViolation);
  }

  async findByPolicy(policyId: string): Promise<DlpViolation[]> {
    return this.find({ where: { policyId } });
  }

  async findByEndpoint(endpointId: string): Promise<DlpViolation[]> {
    return this.find({ where: { endpointId } });
  }

  async findRecentViolations(hours: number): Promise<DlpViolation[]> {
    // In production: query with time filter
    return this.find();
  }
}