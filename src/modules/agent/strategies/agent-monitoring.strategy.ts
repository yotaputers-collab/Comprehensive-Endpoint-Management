export interface AgentMonitoringStrategy {
  getStatus(agentId: string): Promise<AgentStatus>;
  collectMetrics(agentId: string): Promise<AgentMetrics>;
  collectLogs(agentId: string, filters?: LogFilters): Promise<LogEntry[]>;
}

export interface AgentStatus {
  agentId: string;
  status: 'active' | 'inactive' | 'error' | 'updating';
  lastHeartbeat: Date;
  version: string;
  uptime: number;
}

export interface AgentMetrics {
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  network: NetworkMetrics;
  processes: ProcessInfo[];
}

export interface CPUMetrics {
  usage: number;
  loadAverage: number[];
}

export interface MemoryMetrics {
  total: number;
  used: number;
  free: number;
  swap: number;
}

export interface DiskMetrics {
  total: number;
  used: number;
  free: number;
  mounts: MountPoint[];
}

export interface MountPoint {
  mount: string;
  total: number;
  used: number;
  available: number;
  usePercentage: number;
}

export interface NetworkMetrics {
  bytesReceived: number;
  bytesTransmitted: number;
  packetsReceived: number;
  packetsTransmitted: number;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  status: string;
}

export interface LogFilters {
  level?: string;
  source?: string;
  startTime?: Date;
  endTime?: Date;
  keywords?: string[];
}

export interface LogEntry {
  timestamp: Date;
  level: string;
  source: string;
  message: string;
  metadata?: any;
}