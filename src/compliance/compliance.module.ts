import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Endpoint } from '../entities/endpoint.entity';
import { SoftwarePackage } from '../entities/software-package.entity';
import { Vulnerability } from '../entities/vulnerability.entity';
import { AuditEvent } from './audit-event.entity';
import { Iso27001Controller } from './compliance.controller';
import { Iso27001Service } from './iso27001.service';

@Module({
  imports: [TypeOrmModule.forFeature([Endpoint, SoftwarePackage, Vulnerability, AuditEvent])],
  controllers: [Iso27001Controller],
  providers: [Iso27001Service],
  exports: [Iso27001Service],
})
export class ComplianceModule {}
