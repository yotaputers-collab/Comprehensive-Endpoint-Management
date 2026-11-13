export type SecurityEventType =
  | 'vulnerability-remediation'
  | 'dlp-violation'
  | 'configuration-change'
  | 'security-metric';

export interface SecurityEvent {
  type: SecurityEventType;
  endpointId?: string;
  timestamp: Date;
  severity?: string;
  [key: string]: any;
}
