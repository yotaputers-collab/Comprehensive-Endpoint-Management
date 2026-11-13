import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('End-to-End Integration', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  test('should perform complete agent deployment workflow', async () => {
    // Test 1: Create a new agent
    const createResponse = await request(app.getHttpServer())
      .post('/agents')
      .send({ name: 'TestAgent-001', platform: 'windows' });
    
    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toHaveProperty('name', 'TestAgent-001');

    // Test 2: List all agents
    const listResponse = await request(app.getHttpServer())
      .get('/agents');
    
    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toBeDefined();

    // Test 3: Check agent status
    const statusResponse = await request(app.getHttpServer())
      .get(`/agents/${createResponse.body.id}/status`);
    
    expect(statusResponse.status).toBe(200);

    // Test 4: Deploy agent
    const deployResponse = await request(app.getHttpServer())
      .post(`/agents/${createResponse.body.id}/deploy`);
    
    expect(deployResponse.status).toBe(200);

    // Test 5: Collect data from agent
    const collectResponse = await request(app.getHttpServer())
      .post(`/agents/${createResponse.body.id}/collect-data`);
    
    expect(collectResponse.status).toBe(200);
  });

  test('should perform complete vulnerability assessment workflow', async () => {
    // Test 1: Create a vulnerability
    const createVulnResponse = await request(app.getHttpServer())
      .post('/vulnerabilities')
      .send({
        name: 'Test Vulnerability',
        cveId: 'CVE-TEST-001',
        severity: 'high',
        type: 'os',
      });
    
    expect(createVulnResponse.status).toBe(201);
    expect(createVulnResponse.body).toHaveProperty('name', 'Test Vulnerability');

    // Test 2: List vulnerabilities
    const listVulnResponse = await request(app.getHttpServer())
      .get('/vulnerabilities');
    
    expect(listVulnResponse.status).toBe(200);
    expect(listVulnResponse.body).toBeDefined();

    // Test 3: Find unpatched vulnerabilities
    const unpatchedResponse = await request(app.getHttpServer())
      .get('/vulnerabilities/unpatched');
    
    expect(unpatchedResponse.status).toBe(200);

    // Test 4: Patch a vulnerability
    const patchResponse = await request(app.getHttpServer())
      .post(`/vulnerabilities/${createVulnResponse.body.id}/patche`);
    
    expect(patchResponse.status).toBe(200);

    // Test 5: Check critical vulnerabilities
    const criticalResponse = await request(app.getHttpServer())
      .get('/vulnerabilities/critical');
    
    expect(criticalResponse.status).toBe(200);
  });

  test('should perform authentication and authorization workflow', async () => {
    // Test 1: Get authentication token
    const authResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    
    expect(authResponse.status).toBe(200);
    expect(authResponse.body).toHaveProperty('accessToken');

    // Test 2: Access protected endpoint without token
    const unprotectedResponse = await request(app.getHttpServer())
      .get('/agents');
    
    // Should fail without authentication
    expect(unprotectedResponse.status).not.toBe(200);

    // Test 3: Access protected endpoint with token
    const protectedResponse = await request(app.getHttpServer())
      .get('/agents')
      .set('Authorization', `Bearer ${authResponse.body.accessToken}`);
    
    expect(protectedResponse.status).toBe(200);
  });

  test('should perform configuration management workflow', async () => {
    // Test 1: Get all configurations
    const configResponse = await request(app.getHttpServer())
      .get('/configuration');
    
    expect(configResponse.status).toBe(200);
    expect(configResponse.body).toBeDefined();

    // Test 2: Update configuration
    const updateResponse = await request(app.getHttpServer())
      .put('/configuration/test-key')
      .send({ value: 'test-value' });
    
    expect(updateResponse.status).toBe(200);

    // Test 3: Create configuration backup
    const backupResponse = await request(app.getHttpServer())
      .post('/configuration/backup');
    
    expect(backupResponse.status).toBe(200);

    // Test 4: Restore configuration
    const restoreResponse = await request(app.getHttpServer())
      .post('/configuration/restore')
      .send({ backupData: '{}' });
    
    expect(restoreResponse.status).toBe(200);
  });

  test('should perform ISO 27001 compliance assessment workflow', async () => {
    // Test 1: Get compliance assessment
    const assessmentResponse = await request(app.getHttpServer())
      .get('/compliance/assessment');
    
    expect(assessmentResponse.status).toBe(200);
    expect(assessmentResponse.body).toHaveProperty('reportId');

    // Test 2: Create audit log
    const auditResponse = await request(app.getHttpServer())
      .post('/compliance/audit-log')
      .send({
        eventType: 'test-event',
        details: { test: true },
      });
    
    expect(auditResponse.status).toBe(200);
    expect(auditResponse.body).toHaveProperty('logId');
  });

  test('should perform complete DLP policy workflow', async () => {
    // Test 1: Create DLP policy
    const policyResponse = await request(app.getHttpServer())
      .post('/dlp/policies')
      .send({
        name: 'Test DLP Policy',
        description: 'Test policy for DLP functionality',
        rules: [
          {
            name: 'Test Rule',
            type: 'content',
            operator: 'contains',
            pattern: 'confidential',
            action: 'alert',
            severity: 'medium',
          },
        ],
        enabled: true,
      });
    
    expect(policyResponse.status).toBe(201);
    expect(policyResponse.body).toHaveProperty('name', 'Test DLP Policy');

    // Test 2: List DLP policies
    const listPolicyResponse = await request(app.getHttpServer())
      .get('/dlp/policies');
    
    expect(listPolicyResponse.status).toBe(200);
    expect(listPolicyResponse.body).toBeDefined();

    // Test 3: Create DLP violation
    const violationResponse = await request(app.getHttpServer())
      .post('/dlp/violations')
      .send({
        policyId: policyResponse.body.id,
        endpointId: 'test-endpoint-001',
        user: 'test-user',
        matchedContent: 'confidential data',
        ruleType: 'content',
        severity: 'medium',
      });
    
    expect(violationResponse.status).toBe(201);

    // Test 4: Find violations by policy
    const policyViolationsResponse = await request(app.getHttpServer())
      .get(`/dlp/violations/policy/${policyResponse.body.id}`);
    
    expect(policyViolationsResponse.status).toBe(200);
  });
});