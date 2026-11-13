export interface Agent {
  id: string;
  name: string;
  platform: 'windows' | 'linux';
  version: string;
  description?: string;
  status: 'active' | 'inactive' | 'error' | 'updating';
  lastSeen: Date;
  capabilities: string[];
  configuration: AgentConfiguration;
  metadata: AgentMetadata;
}

export interface AgentConfiguration {
  scanInterval: number;
  remediationEnabled: boolean;
  dlpsEnabled: boolean;
  collectLogs: boolean;
  autoPatch: boolean;
}

export interface AgentMetadata {
  osVersion: string;
  installedSoftware: string[];
  networkInterfaces: NetworkInterface[];
  cpuInfo: CPUInfo;
  memoryInfo: MemoryInfo;
}

export interface NetworkInterface {
  name: string;
  address: string;
  netmask: string;
}

export interface CPUInfo {
  model: string;
  cores: number;
  architecture: string;
}

export interface MemoryInfo {
  total: number;
  used: number;
  free: number;
}