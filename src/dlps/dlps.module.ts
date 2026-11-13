import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DlpPolicy } from '../entities/dl-policy.entity';
import { DlpRule } from '../entities/dl-rule.entity';
import { DlpViolation } from '../entities/dl-violation.entity';
import { DlpPolicyRepository } from '../repositories/dlp-policy.repository';
import { DlpRuleRepository } from '../repositories/dlp-rule.repository';
import { DlpViolationRepository } from '../repositories/dlp-violation.repository';

@Module({
  imports: [],
  providers: [DlpPolicyRepository, DlpRuleRepository, DlpViolationRepository],
  exports: [DlpPolicyRepository, DlpRuleRepository, DlpViolationRepository],
})
export class DlpModule {}