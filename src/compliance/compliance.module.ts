import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceStandard } from '../entities/compliance-standard.entity';
import { ComplianceRequirement } from '../entities/compliance-requirement.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { ComplianceStandardRepository } from '../repositories/compliance-standard.repository';
import { ComplianceRequirementRepository } from '../repositories/compliance-requirement.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';

@Module({
  imports: [],
  providers: [ComplianceStandardRepository, ComplianceRequirementRepository, AuditLogRepository],
  exports: [ComplianceStandardRepository, ComplianceRequirementRepository, AuditLogRepository],
})
export class ComplianceModule {}