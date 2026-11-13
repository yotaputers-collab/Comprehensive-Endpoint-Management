export const AGENT_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ERROR: 'error',
  UPDATING: 'updating',
} as const;

export const AGENT_PLATFORMS = {
  WINDOWS: 'windows',
  LINUX: 'linux',
} as const;

export const DEFAULT_AGENT_CONFIG = {
  scanInterval: 3600000, // 1 hour in milliseconds
  remediationEnabled: true,
  dlpsEnabled: true,
  collectLogs: true,
  autoPatch: true,
};

export const AGENT_CAPABILITIES = [
  'vulnerability_scan',
  'remediation',
  'dlp_monitoring',
  'system_configuration',
  'log_collection',
  'patch_management',
];