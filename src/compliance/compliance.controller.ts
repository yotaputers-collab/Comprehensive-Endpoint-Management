import { Controller, Get, Post, Body } from '@nestjs/common';
import { Iso27001Service } from './iso27001.service';
import { ComplianceReport } from './compliance.interface';
import { Roles } from '../auth/roles.decorator';

@Controller('compliance')
export class Iso27001Controller {
  constructor(private readonly iso27001Service: Iso27001Service) {}

  @Get('assessment')
  getComplianceAssessment(): Promise<ComplianceReport> {
    return this.iso27001Service.assessCompliance();
  }

  @Roles('admin', 'operator')
  @Post('audit-log')
  createAuditLog(@Body() body: {
    eventType: string;
    user?: string;
    endpointId?: string;
    details: any;
    complianceRelevance?: string[];
  }) {
    return this.iso27001Service.recordAuditEvent(body);
  }
}
