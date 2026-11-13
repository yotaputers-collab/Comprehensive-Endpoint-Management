export interface DlpPolicy {
  id: string;
  name: string;
  description: string;
  rules: DlpRule[];
  enabled: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DlpRule {
  id: string;
  name: string;
  type: 'content' | 'context' | 'metadata';
  operator: 'contains' | 'notContains' | 'regex' | 'exactMatch';
  pattern: string;
  action: 'block' | 'alert' | 'quarantine';
  severity: 'low' | 'medium' | 'high';
  enabled: boolean;
  description?: string;
}

export interface DlpViolation {
  id: string;
  policyId: string;
  ruleId: string;
  endpointId: string;
  user: string;
  timestamp: Date;
  matchedContent: string;
  ruleType: string;
  severity: string;
  actionTaken: 'blocked' | 'alerted' | 'quarantined';
  metadata: any;
}

export interface DlpMonitoringConfig {
  realTimeMonitoring: boolean;
  logViolations: boolean;
  alertOnViolation: boolean;
  retentionPeriod: number; // days
  notificationRecipients: string[];
}