import { Vulnerability } from '../entities/vulnerability.entity';

export interface AgentCapabilities {
  vulnerabilityScan: boolean;
  remediation: boolean;
  dlpMonitoring: boolean;
  systemConfiguration: boolean;
  logCollection: boolean;
  patchManagement: boolean;
}

export interface AgentConfiguration {
  scanInterval: number;
  remediationEnabled: boolean;
  dlpsEnabled: boolean;
  collectLogs: boolean;
  autoPatch: boolean;
}

export interface AgentStatus {
  agentId: string;
  status: 'active' | 'inactive' | 'error' | 'updating';
  lastHeartbeat: Date;
  version: string;
  uptime: number;
}

export interface ScanResults {
  endpointId: string;
  timestamp: Date;
  vulnerabilities: Partial<Vulnerability>[];
  systemInfo: SystemInfo;
}

export interface SystemInfo {
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

export abstract class AgentBase {
  constructor(public readonly agentId: string) {}

  abstract scanSystem(): Promise<ScanResults>;

  abstract getStatus(): Promise<AgentStatus>;

  abstract collectLogs(filters?: Record<string, unknown>): Promise<unknown[]>;
}
