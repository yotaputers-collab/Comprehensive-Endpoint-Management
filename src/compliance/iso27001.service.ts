import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { Endpoint } from '../entities/endpoint.entity';
import { SoftwarePackage } from '../entities/software-package.entity';
import { Vulnerability } from '../entities/vulnerability.entity';
import { AuditEvent } from './audit-event.entity';
import {
  ComplianceFinding,
  ComplianceReport,
  ComplianceRequirement,
  ComplianceStandard,
} from './compliance.interface';

type RequirementStatus = ComplianceRequirement['status'];
type RequirementSeverity = ComplianceRequirement['severity'];

/** Outcome of checking one control against the database. */
interface ControlResult {
  status: RequirementStatus;
  evidence: string;
  remediation?: string;
}

const PERIOD_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class Iso27001Service {
  private readonly logger = new Logger(Iso27001Service.name);

  constructor(
    @InjectRepository(Endpoint) private readonly endpoints: Repository<Endpoint>,
    @InjectRepository(SoftwarePackage) private readonly software: Repository<SoftwarePackage>,
    @InjectRepository(Vulnerability) private readonly vulnerabilities: Repository<Vulnerability>,
    @InjectRepository(AuditEvent) private readonly auditEvents: Repository<AuditEvent>,
  ) {}

  /** Records an audit event so later assessments have real history to cite. */
  async recordAuditEvent(event: {
    eventType: string;
    user?: string;
    endpointId?: string;
    details?: any;
    complianceRelevance?: string[];
  }) {
    const saved = await this.auditEvents.save(
      this.auditEvents.create({
        eventType: event.eventType,
        user: event.user ?? null,
        endpointId: event.endpointId ?? null,
        details: event.details ?? null,
        complianceRelevance: event.complianceRelevance ?? null,
      }),
    );

    return {
      message: 'Audit log created successfully',
      logId: saved.id,
      eventType: saved.eventType,
      createdAt: saved.createdAt,
    };
  }

  async assessCompliance(): Promise<ComplianceReport> {
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - PERIOD_DAYS * DAY_MS);

    const hosts = await this.endpoints.find({ where: { active: true } });
    const hostIds = hosts.map((host) => host.id);

    const packages = hostIds.length
      ? await this.software.find({ where: { endpointId: In(hostIds) } })
      : [];
    const findings = hostIds.length
      ? await this.vulnerabilities.find({ where: { endpointId: In(hostIds) } })
      : [];
    const auditCount = await this.auditEvents.count({
      where: { createdAt: MoreThanOrEqual(periodStart) },
    });

    const hostsWithSoftware = new Set(packages.map((pkg) => pkg.endpointId)).size;
    const hostsScanned = hosts.filter(
      (host) => host.lastScannedAt && new Date(host.lastScannedAt) >= periodStart,
    ).length;
    const openFindings = findings.filter((finding) => !finding.isPatched);
    const openCritical = openFindings.filter((finding) => finding.severity === 'critical');

    const standards: ComplianceStandard[] = [
      this.buildStandard(
        'iso27001-assets',
        'Asset management',
        'Know which hosts and software are present',
        periodEnd,
        [
          {
            id: 'req-asset-inventory',
            code: 'A.8.1',
            description: 'Inventory of information assets is maintained',
            category: 'Asset management',
            severity: 'low',
            result: this.assetInventory(hosts.length),
          },
          {
            id: 'req-software-inventory',
            code: 'A.8.2',
            description: 'Software installed on assets is inventoried',
            category: 'Asset management',
            severity: 'medium',
            result: this.softwareInventory(hostsWithSoftware, hosts.length),
          },
        ],
      ),
      this.buildStandard(
        'iso27001-vulnerabilities',
        'Technical vulnerability management',
        'Find and remediate weaknesses in good time',
        periodEnd,
        [
          {
            id: 'req-scan-coverage',
            code: 'A.8.8',
            description: 'Assets are scanned for vulnerabilities each period',
            category: 'Vulnerability management',
            severity: 'high',
            result: this.scanCoverage(hostsScanned, hosts.length),
          },
          {
            id: 'req-critical-remediation',
            code: 'A.8.8',
            description: 'Critical vulnerabilities are remediated',
            category: 'Vulnerability management',
            severity: 'high',
            result: this.criticalRemediation(openFindings.length, openCritical.length, hosts.length),
          },
        ],
      ),
      this.buildStandard(
        'iso27001-logging',
        'Logging and monitoring',
        'Security events are recorded and reviewable',
        periodEnd,
        [
          {
            id: 'req-audit-logging',
            code: 'A.12.4',
            description: 'Security events are logged',
            category: 'Logging',
            severity: 'medium',
            result: this.auditLogging(auditCount),
          },
        ],
      ),
    ];

    const report: ComplianceReport = {
      reportId: `ISO27001-${Date.now()}`,
      generatedAt: periodEnd,
      periodStart,
      periodEnd,
      standards,
      summary: {
        totalRequirements: 0,
        compliant: 0,
        nonCompliant: 0,
        partial: 0,
        notApplicable: 0,
        compliancePercentage: 0,
      },
      findings: [],
    };

    for (const standard of standards) {
      for (const requirement of standard.requirements) {
        report.summary.totalRequirements += 1;

        if (requirement.status === 'compliant') {
          report.summary.compliant += 1;
        } else if (requirement.status === 'non-compliant') {
          report.summary.nonCompliant += 1;
        } else if (requirement.status === 'partial') {
          report.summary.partial += 1;
        } else {
          report.summary.notApplicable += 1;
        }

        if (requirement.status === 'non-compliant' || requirement.status === 'partial') {
          report.findings.push(this.toFinding(requirement));
        }
      }
    }

    report.summary.compliancePercentage =
      report.summary.totalRequirements > 0
        ? Math.round((report.summary.compliant / report.summary.totalRequirements) * 100)
        : 0;

    this.logger.log(
      `ISO 27001 assessment: ${report.summary.compliant}/${report.summary.totalRequirements} ` +
        `compliant (${report.summary.compliancePercentage}%)`,
    );

    return report;
  }

  private buildStandard(
    id: string,
    name: string,
    description: string,
    assessedAt: Date,
    controls: Array<{
      id: string;
      code: string;
      description: string;
      category: string;
      severity: RequirementSeverity;
      result: ControlResult;
    }>,
  ): ComplianceStandard {
    const requirements: ComplianceRequirement[] = controls.map((control) => ({
      id: control.id,
      code: control.code,
      description: control.description,
      category: control.category,
      severity: control.severity,
      status: control.result.status,
      evidence: control.result.evidence,
      lastVerified: assessedAt,
    }));

    const meaningful = requirements.filter((item) => item.status !== 'not-applicable');
    let status: ComplianceStandard['status'] = 'compliant';

    if (meaningful.some((item) => item.status === 'non-compliant')) {
      status = 'non-compliant';
    } else if (meaningful.some((item) => item.status === 'partial')) {
      status = 'partial';
    } else if (meaningful.length === 0) {
      status = 'not-applicable';
    }

    return {
      id,
      name,
      description,
      requirements,
      status,
      lastAssessed: assessedAt,
      nextAssessment: new Date(assessedAt.getTime() + 365 * DAY_MS),
    };
  }

  private toFinding(requirement: ComplianceRequirement): ComplianceFinding {
    return {
      id: `finding-${requirement.id}`,
      requirementId: requirement.id,
      severity: requirement.severity,
      description: `${requirement.code} ${requirement.description}: ${requirement.evidence}`,
      remediation: this.remediationFor(requirement.id),
      status: requirement.status === 'partial' ? 'in-progress' : 'open',
    };
  }

  private remediationFor(requirementId: string): string {
    switch (requirementId) {
      case 'req-asset-inventory':
        return 'Enrol the remaining hosts so the asset inventory reflects the estate.';
      case 'req-software-inventory':
        return 'Have agents submit a software inventory for every enrolled host.';
      case 'req-scan-coverage':
        return 'Run a vulnerability scan against hosts that have not been scanned this period.';
      case 'req-critical-remediation':
        return 'Patch or otherwise mitigate the open critical findings.';
      case 'req-audit-logging':
        return 'Record audit events for security-relevant activity.';
      default:
        return 'Review the control and address the gap.';
    }
  }

  private coverageStatus(covered: number, total: number): RequirementStatus {
    if (total === 0) {
      return 'not-applicable';
    }
    const ratio = covered / total;
    if (ratio >= 0.9) {
      return 'compliant';
    }
    return ratio >= 0.5 ? 'partial' : 'non-compliant';
  }

  private percent(covered: number, total: number): number {
    return total === 0 ? 0 : Math.round((covered / total) * 100);
  }

  private assetInventory(hostCount: number): ControlResult {
    if (hostCount === 0) {
      return { status: 'not-applicable', evidence: 'No active hosts are enrolled.' };
    }
    return {
      status: 'compliant',
      evidence: `${hostCount} active host(s) are enrolled and tracked.`,
    };
  }

  private softwareInventory(hostsWithSoftware: number, hostCount: number): ControlResult {
    const status = this.coverageStatus(hostsWithSoftware, hostCount);
    return {
      status,
      evidence:
        hostCount === 0
          ? 'No active hosts are enrolled.'
          : `${hostsWithSoftware} of ${hostCount} active host(s) reported installed software ` +
            `(${this.percent(hostsWithSoftware, hostCount)}%).`,
    };
  }

  private scanCoverage(scanned: number, hostCount: number): ControlResult {
    const status = this.coverageStatus(scanned, hostCount);
    return {
      status,
      evidence:
        hostCount === 0
          ? 'No active hosts are enrolled.'
          : `${scanned} of ${hostCount} active host(s) were scanned in the last ${PERIOD_DAYS} days ` +
            `(${this.percent(scanned, hostCount)}%).`,
    };
  }

  private criticalRemediation(
    openFindings: number,
    openCritical: number,
    hostCount: number,
  ): ControlResult {
    if (hostCount === 0) {
      return { status: 'not-applicable', evidence: 'No active hosts are enrolled.' };
    }

    if (openCritical === 0) {
      return {
        status: 'compliant',
        evidence:
          openFindings === 0
            ? 'No open vulnerability findings on enrolled hosts.'
            : `${openFindings} open finding(s), none of them critical.`,
      };
    }

    return {
      status: 'non-compliant',
      evidence: `${openCritical} of ${openFindings} open finding(s) are critical and unresolved.`,
    };
  }

  private auditLogging(auditCount: number): ControlResult {
    if (auditCount === 0) {
      return {
        status: 'non-compliant',
        evidence: `No audit events recorded in the last ${PERIOD_DAYS} days.`,
      };
    }
    return {
      status: 'compliant',
      evidence: `${auditCount} audit event(s) recorded in the last ${PERIOD_DAYS} days.`,
    };
  }
}