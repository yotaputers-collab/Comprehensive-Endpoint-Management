export interface AgentDeploymentStrategy {
  deploy(agentId: string, configuration: any): Promise<void>;
  update(agentId: string, configuration: any): Promise<void>;
  remove(agentId: string): Promise<void>;
}

export class WindowsAgentDeploymentStrategy implements AgentDeploymentStrategy {
  async deploy(agentId: string, configuration: any): Promise<void> {
    // Implementation for Windows agent deployment
    console.log(`Deploying Windows agent ${agentId} with configuration:`, configuration);
    // In real implementation: deploy via WMI, PowerShell, etc.
  }

  async update(agentId: string, configuration: any): Promise<void> {
    console.log(`Updating Windows agent ${agentId} configuration:`, configuration);
    // Implementation for Windows agent updates
  }

  async remove(agentId: string): Promise<void> {
    console.log(`Removing Windows agent ${agentId}`);
    // Implementation for Windows agent removal
  }
}

export class LinuxAgentDeploymentStrategy implements AgentDeploymentStrategy {
  async deploy(agentId: string, configuration: any): Promise<void> {
    console.log(`Deploying Linux agent ${agentId} with configuration:`, configuration);
    // Implementation for Linux agent deployment
  }

  async update(agentId: string, configuration: any): Promise<void> {
    console.log(`Updating Linux agent ${agentId} configuration:`, configuration);
    // Implementation for Linux agent updates
  }

  async remove(agentId: string): Promise<void> {
    console.log(`Removing Linux agent ${agentId}`);
    // Implementation for Linux agent removal
  }
}