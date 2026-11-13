export interface AgentInterface {
  id: string;
  name: string;
  platform: 'windows' | 'linux';
  version: string;
  status: 'active' | 'inactive' | 'error' | 'updating';
  lastSeen: Date;
  capabilities: AgentCapabilities;
  configuration: AgentConfiguration;
  metadata: AgentMetadata;
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

export interface AgentDeployment {
  agentId: string;
  status: 'deployed' | 'pending' | 'failed';
  deployedAt: Date;
  lastCheckIn: Date;
}