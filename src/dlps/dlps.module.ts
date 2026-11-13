import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DlpPolicy } from '../entities/dl-policy.entity';
import { DlpRule } from '../entities/dl-rule.entity';
import { DlpViolation } from '../entities/dl-violation.entity';
import { DlpPolicyRepository, DlpRuleRepository, DlpViolationRepository } from './dlp.manager';

@Module({
  imports: [TypeOrmModule.forFeature([DlpPolicy, DlpRule, DlpViolation])],
  providers: [DlpPolicyRepository, DlpRuleRepository, DlpViolationRepository],
  exports: [DlpPolicyRepository, DlpRuleRepository, DlpViolationRepository],
})
export class DlpModule {}
