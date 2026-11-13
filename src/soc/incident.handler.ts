import { Injectable, Logger } from '@nestjs/common';
import { SocGateway } from './soc.gateway';

@Injectable()
export class IncidentHandler {
  private readonly logger: Logger = new Logger(IncidentHandler.name);

  constructor(private readonly socGateway: SocGateway) {}

  async handleVulnerabilityRemediation(
    endpointId: string,
    vulnerabilityId: string,
    remediationResult: 'success' | 'failed'
  ): Promise<void> {
    const event: any = {
      type: 'vulnerability-remediation',
      endpointId,
      vulnerabilityId,
      result: remediationResult,
      timestamp: new Date(),
      severity: remediationResult === 'success' ? 'info' : 'warning',
    };

    this.socGateway.handleSecurityEvent(event);
    this.logger.log(`Vulnerability remediation event: ${remediationResult} for ${vulnerabilityId}`);
  }

  async handleDlpViolation(
    endpointId: string,
    violation: any
  ): Promise<void> {
    const event: any = {
      type: 'dlp-violation',
      endpointId,
      violation,
      timestamp: new Date(),
      severity: violation.severity || 'medium',
    };

    this.socGateway.handleSecurityEvent(event);
    this.logger.log(`DLP violation event emitted for ${endpointId}`);
  }

  async handleConfigurationChange(
    endpointId: string,
    changes: any
  ): Promise<void> {
    const event: any = {
      type: 'configuration-change',
      endpointId,
      changes,
      timestamp: new Date(),
      severity: 'low',
    };

    this.socGateway.handleSecurityEvent(event);
    this.logger.log(`Configuration change event emitted for ${endpointId}`);
  }

  async reportSecurityMetric(
    metric: {
      name: string;
      value: number;
      endpointId?: string;
    }
  ): Promise<void> {
    const event: any = {
      type: 'security-metric',
      ...metric,
      timestamp: new Date(),
    };

    this.socGateway.handleSecurityEvent(event);
    this.logger.log(`Security metric reported: ${metric.name}=${metric.value}`);
  }
}