import { Test, TestingModule } from '@nestjs/testing';
import { WindowsAgent } from '../../../src/agents/windows-agent';
import { AgentBase } from '../../../src/agents/agent.base';

describe('Windows Agent', () => {
  let agent: WindowsAgent;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WindowsAgent],
    }).compile();
    agent = module.get<WindowsAgent>(WindowsAgent);
  });

  test('should be defined', () => {
    expect(agent).toBeDefined();
  });

  test('should scan system', async () => {
    const result = await agent.scanSystem();
    expect(result).toBeDefined();
    expect(result.endpointId).toBeDefined();
    expect(result.timestamp).toBeDefined();
    expect(result.vulnerabilities).toBeDefined();
    expect(result.systemInfo).toBeDefined();
  });

  test('should get agent status', async () => {
    const result = await agent.getStatus();
    expect(result).toBeDefined();
    expect(result.agentId).toBeDefined();
    expect(result.status).toBeDefined();
    expect(result.version).toBeDefined();
    expect(result.uptime).toBeDefined();
  });
});