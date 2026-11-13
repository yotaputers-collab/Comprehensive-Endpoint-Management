import { Module } from '@nestjs/common';
import { Iso27001Controller } from './compliance.controller';
import { Iso27001Service } from './iso27001.service';

@Module({
  controllers: [Iso27001Controller],
  providers: [Iso27001Service],
  exports: [Iso27001Service],
})
export class ComplianceModule {}
