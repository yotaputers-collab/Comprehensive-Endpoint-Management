import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../test/app';
import { Iso27001Service } from './iso27001.service';

describe('Compliance assessment', () => {
  let app: INestApplication;
  let http: unknown;
  let admin: string;
  let viewer: string;
  let operator: string;

  const signIn = async (username: string, password: string): Promise<string> => {
    const response = await request(http as never)
      .post('/auth/login')
      .send({ username, password });
    return response.body.accessToken as string;
  };

  beforeAll(async () => {
    app = await createTestApp();
    http = app.getHttpServer();
    admin = await signIn('admin', 'admin-pass-1234');

    for (const [username, role] of [
      ['compliance-viewer', 'viewer'],
      ['compliance-operator', 'operator'],
    ] as const) {
      await request(http as never)
        .post('/auth/users')
        .set('authorization', `Bearer ${admin}`)
        .send({ username, password: `${username}-pass-1`, role })
        .expect(201);
    }

    viewer = await signIn('compliance-viewer', 'compliance-viewer-pass-1');
    operator = await signIn('compliance-operator', 'compliance-operator-pass-1');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /compliance/assessment', () => {
    it('requires a session', async () => {
      await request(http as never).get('/compliance/assessment').expect(401);
    });

    it('is readable by any authenticated role', async () => {
      const response = await request(http as never)
        .get('/compliance/assessment')
        .set('authorization', `Bearer ${viewer}`);

      expect(response.status).toBe(200);
      // The service generates the id; the old hard-coded report used a fixed one.
      expect(String(response.body.reportId)).toMatch(/^ISO27001-\d+$/);
      expect(response.body.generatedAt).toBeDefined();
      expect(response.body.periodStart).toBeDefined();
      expect(response.body.periodEnd).toBeDefined();
    });

    it('reports a summary whose counts agree with the findings', async () => {
      const response = await request(http as never)
        .get('/compliance/assessment')
        .set('authorization', `Bearer ${operator}`);

      const { summary, findings, standards } = response.body;

      expect(standards).toHaveLength(2);
      expect(
        standards.every((standard: { requirements: unknown[] }) => standard.requirements.length === 2),
      ).toBe(true);
      expect(summary.totalRequirements).toBe(
        summary.compliant + summary.nonCompliant + summary.partial + summary.notApplicable,
      );
      expect(summary.compliancePercentage).toBe(
        Math.round((summary.compliant / summary.totalRequirements) * 100),
      );

      // Every requirement that is not compliant must produce a finding.
      expect(findings).toHaveLength(summary.nonCompliant + summary.partial);
      expect(findings[0]).toMatchObject({
        requirementId: 'req-2',
        severity: 'medium',
        status: 'open',
      });
      expect(typeof findings[0].remediation).toBe('string');
    });
  });

  describe('POST /compliance/audit-log', () => {
    it('refuses viewers', async () => {
      await request(http as never)
        .post('/compliance/audit-log')
        .set('authorization', `Bearer ${viewer}`)
        .send({ eventType: 'login', details: {} })
        .expect(403);
    });

    it('accepts an operator or admin event', async () => {
      for (const token of [operator, admin]) {
        const response = await request(http as never)
          .post('/compliance/audit-log')
          .set('authorization', `Bearer ${token}`)
          .send({ eventType: 'policy-review', user: 'compliance-operator', details: { note: 'ok' } });

        expect(response.status).toBe(201);
        expect(String(response.body.logId)).toMatch(/^log-\d+$/);
        expect(response.body.message).toMatch(/audit log created/i);
      }
    });
  });

  describe('Iso27001Service', () => {
    it('assesses every standard and derives the percentage from the counts', async () => {
      const report = await app.get(Iso27001Service).assessCompliance();

      expect(report.standards).toHaveLength(2);
      expect(report.standards.every((standard) => standard.requirements.length > 0)).toBe(true);

      const requirementCount = report.standards.reduce(
        (total, standard) => total + standard.requirements.length,
        0,
      );

      expect(report.summary.totalRequirements).toBe(requirementCount);
      expect(report.summary.compliant).toBe(2);
      expect(report.summary.nonCompliant).toBe(2);
      expect(report.summary.compliancePercentage).toBe(50);
      expect(report.findings).toHaveLength(2);
      expect(report.reportId).toMatch(/^ISO27001-\d+$/);
      expect(report.periodStart.getTime()).toBeLessThan(report.periodEnd.getTime());
    });

    it('flags each non-compliant requirement with a remediation', async () => {
      const report = await app.get(Iso27001Service).assessCompliance();

      for (const finding of report.findings) {
        expect(finding.status).toBe('open');
        expect(finding.severity).toBeTruthy();
        expect(String(finding.remediation)).toMatch(/^Remediate /);
      }
    });
  });
});