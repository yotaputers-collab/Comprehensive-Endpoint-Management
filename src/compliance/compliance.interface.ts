export interface ComplianceStandard {
  id: string;
  name: string;
  description: string;
  requirements: ComplianceRequirement[];
  status: 'compliant' | 'non-compliant' | 'partial' | 'not-applicable';
  lastAssessed: Date;
  nextAssessment: Date;
}

export interface ComplianceRequirement {
  id: string;
  code: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'compliant' | 'non-compliant' | 'partial' | 'not-applicable';
  evidence?: string;
  lastVerified?: Date;
  nextVerification?: Date;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  eventType: string;
  user?: string;
  endpointId?: string;
  details: any;
  status: 'success' | 'failure';
  complianceRelevance?: string[];
}

export interface ComplianceReport {
  reportId: string;
  generatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  standards: ComplianceStandard[];
  summary: {
    totalRequirements: number;
    compliant: number;
    nonCompliant: number;
    partial: number;
    notApplicable: number;
    compliancePercentage: number;
  };
  findings: ComplianceFinding[];
}

export interface ComplianceFinding {
  id: string;
  requirementId: string;
  severity: string;
  description: string;
  remediation?: string;
  status: 'open' | 'in-progress' | 'resolved';
  estimatedResolutionDate?: Date;
}