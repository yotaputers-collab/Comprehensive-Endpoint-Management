import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { createTestApp, seedHost } from '../test/app';
import { AuditEvent } from './audit-event.entity';
import { Endpoint } from '../entities/endpoint.entity';
import { SoftwarePackage } from '../entities/software-package.entity';
import { Vulnerability } from '../entities/vulnerability.entity';

interface AssessmentBody {
  reportId: string;
  standards: Array<{
    id: string;
    status: string;
    requirements: Array<{ id: string; code: string; status: string; evidence?: string }>;
  }>;
  summary: {
    totalRequirements: number;
    compliant: number;
    nonCompliant: number;
    partial: number;
    notApplicable: number;
    compliancePercentage: number;
  };
  findings: Array<{ requirementId: string; severity: string; status: string; remediation?: string }>;
}

describe('Compliance assessment', () => {
  let app: INestApplication;
  let http: unknown;
  let admin: string;
  let viewer: string;
  let operator: string;

  const signIn = async (username: string, password: string): Promise<string> => {
    const response = await request(http as never).post('/auth/login').send({ username, password });
    return response.body.accessToken as string;
  };

  const assess = async (): Promise<AssessmentBody> => {
    const response = await request(http as never)
      .get('/compliance/assessment')
      .set('authorization', `Bearer ${admin}`);
    expect(response.status).toBe(200);
    return response.body as AssessmentBody;
  };

  const requirement = (body: AssessmentBody, id: string) => {
    for (const standard of body.standards) {
      const match = standard.requirements.find((item) => item.id === id);
      if (match) {
        return match;
      }
    }
    throw new Error(`requirement ${id} not in report`);
  };

  const addFinding = async (endpointId: string, severity: string, isPatched = false) => {
    const repo = app.get(DataSource).getRepository(Vulnerability);
    return repo.save(
      repo.create({
        endpointId,
        severity: severity as Vulnerability['severity'],
        isPatched,
        name: 'example finding',
        cveId: 'CVE-2024-0001',
        type: 'os',
        advisoryId: `USN-${Math.random().toString(16).slice(2)}`,
        packageName: 'openssl',
      }),
    );
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

  beforeEach(async () => {
    const ds = app.get(DataSource);
    await ds.getRepository(Vulnerability).clear();
    await ds.getRepository(SoftwarePackage).clear();
    await ds.getRepository(Endpoint).clear();
    await ds.getRepository(AuditEvent).clear();
  });

  describe('access', () => {
    it('requires a session but serves any authenticated role', async () => {
      await request(http as never).get('/compliance/assessment').expect(401);

      for (const token of [viewer, operator]) {
        await request(http as never)
          .get('/compliance/assessment')
          .set('authorization', `Bearer ${token}`)
          .expect(200);
      }
    });

    it('reports three standards covering five controls', async () => {
      const body = await assess();

      expect(body.standards.map((standard) => standard.id)).toEqual([
        'iso27001-assets',
        'iso27001-vulnerabilities',
        'iso27001-logging',
      ]);
      expect(body.summary.totalRequirements).toBe(5);
      expect(String(body.reportId)).toMatch(/^ISO27001-\d+$/);
    });
  });

  describe('with an empty estate', () => {
    it('marks the asset controls not applicable instead of passing them', async () => {
      const body = await assess();

      for (const id of [
        'req-asset-inventory',
        'req-software-inventory',
        'req-scan-coverage',
        'req-critical-remediation',
      ]) {
        expect(requirement(body, id).status).toBe('not-applicable');
      }

      expect(body.summary.notApplicable).toBe(4);
      expect(body.summary.compliant).toBe(0);
      expect(body.summary.compliancePercentage).toBe(0);
    });

    it('fails logging because nothing has been recorded', async () => {
      const body = await assess();

      expect(requirement(body, 'req-audit-logging').status).toBe('non-compliant');
      expect(String(requirement(body, 'req-audit-logging').evidence)).toMatch(/no audit events/i);
      expect(body.findings.map((finding) => finding.requirementId)).toEqual(['req-audit-logging']);
    });
  });

  describe('with a healthy estate', () => {
    it('passes every control when hosts report, scan and log', async () => {
      await seedHost(app, {
        name: 'healthy-01',
        packages: [{ name: 'openssl', version: '3.0.5' }],
        lastScannedAt: new Date(),
      });
      await seedHost(app, {
        name: 'healthy-02',
        packages: [{ name: 'curl', version: '7.88.1' }],
        lastScannedAt: new Date(),
      });

      await request(http as never)
        .post('/compliance/audit-log')
        .set('authorization', `Bearer ${admin}`)
        .send({ eventType: 'policy-review', details: { ok: true } })
        .expect(201);

      const body = await assess();

      expect(body.summary.compliant).toBe(5);
      expect(body.summary.compliancePercentage).toBe(100);
      expect(body.findings).toHaveLength(0);
      expect(body.standards.map((standard) => standard.status)).toEqual([
        'compliant',
        'compliant',
        'compliant',
      ]);
      expect(String(requirement(body, 'req-software-inventory').evidence)).toMatch(/2 of 2/);
      expect(String(requirement(body, 'req-scan-coverage').evidence)).toMatch(/2 of 2/);
      expect(String(requirement(body, 'req-audit-logging').evidence)).toMatch(/1 audit event/);
    });
  });

  describe('with partial coverage', () => {
    it('reports partial controls with evidence and in-progress findings', async () => {
      await seedHost(app, {
        name: 'covered-01',
        packages: [{ name: 'openssl', version: '3.0.5' }],
        lastScannedAt: new Date(),
      });
      await seedHost(app, {
        name: 'covered-02',
        packages: [{ name: 'curl', version: '7.88.1' }],
        lastScannedAt: new Date(),
      });
      await seedHost(app, { name: 'silent-03' }); // no inventory, never scanned

      const body = await assess();

      expect(requirement(body, 'req-software-inventory').status).toBe('partial');
      expect(requirement(body, 'req-scan-coverage').status).toBe('partial');
      expect(String(requirement(body, 'req-software-inventory').evidence)).toMatch(/2 of 3/);
      expect(String(requirement(body, 'req-scan-coverage').evidence)).toMatch(/67%/);

      const progress = body.findings.filter((finding) => finding.status === 'in-progress');
      expect(progress.map((finding) => finding.requirementId).sort()).toEqual([
        'req-scan-coverage',
        'req-software-inventory',
      ]);
      expect(body.summary.partial).toBe(2);
      expect(body.summary.compliancePercentage).toBe(40); // assets + criticals of five
    });

    it('fails the asset control when the estate is unknown', async () => {
      const body = await assess();
      const inventory = body.standards.find((standard) => standard.id === 'iso27001-assets');

      expect(inventory!.requirements[0].status).toBe('not-applicable');
    });
  });

  describe('vulnerability controls', () => {
    it('fails critical remediation while an open critical finding exists', async () => {
      const host = await seedHost(app, {
        name: 'critical-01',
        packages: [{ name: 'openssl', version: '3.0.2' }],
        lastScannedAt: new Date(),
      });
      await addFinding(host.id, 'critical');

      const body = await assess();
      const control = requirement(body, 'req-critical-remediation');

      expect(control.status).toBe('non-compliant');
      expect(String(control.evidence)).toMatch(/1 of 1 open finding/i);

      const finding = body.findings.find((item) => item.requirementId === 'req-critical-remediation');
      expect(finding).toMatchObject({ severity: 'high', status: 'open' });
      expect(String(finding!.remediation)).toMatch(/patch/i);
    });

    it('passes once the critical finding is marked patched', async () => {
      const host = await seedHost(app, {
        name: 'critical-02',
        packages: [{ name: 'openssl', version: '3.0.2' }],
        lastScannedAt: new Date(),
      });
      await addFinding(host.id, 'critical', true);

      const body = await assess();

      expect(requirement(body, 'req-critical-remediation').status).toBe('compliant');
      // A patched finding is closed, so there are no open findings left to report.
      expect(String(requirement(body, 'req-critical-remediation').evidence)).toMatch(
        /no open vulnerability findings/i,
      );
    });

    it('ignores non-critical findings for the critical control', async () => {
      const host = await seedHost(app, {
        name: 'medium-01',
        packages: [{ name: 'openssl', version: '3.0.2' }],
        lastScannedAt: new Date(),
      });
      await addFinding(host.id, 'medium');

      const body = await assess();

      expect(requirement(body, 'req-critical-remediation').status).toBe('compliant');
      expect(String(requirement(body, 'req-critical-remediation').evidence)).toMatch(/1 open finding/i);
    });
  });

  describe('audit logging', () => {
    it('records the event and cites it in the next assessment', async () => {
      const created = await request(http as never)
        .post('/compliance/audit-log')
        .set('authorization', `Bearer ${operator}`)
        .send({
          eventType: 'access-review',
          user: 'compliance-operator',
          details: { scope: 'all' },
          complianceRelevance: ['A.12.4'],
        });

      expect(created.status).toBe(201);
      expect(String(created.body.logId)).toMatch(/^[0-9a-f-]{36}$/);

      const stored = await app.get(DataSource).getRepository(AuditEvent).find();
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({ eventType: 'access-review', user: 'compliance-operator' });

      const body = await assess();
      expect(requirement(body, 'req-audit-logging').status).toBe('compliant');
    });

    it('refuses viewers', async () => {
      await request(http as never)
        .post('/compliance/audit-log')
        .set('authorization', `Bearer ${viewer}`)
        .send({ eventType: 'nope', details: {} })
        .expect(403);
    });
  });

  describe('report consistency', () => {
    it('keeps the summary and findings consistent with the controls', async () => {
      await seedHost(app, { name: 'mixed-01', packages: [{ name: 'openssl', version: '3.0.2' }] });

      const body = await assess();
      const { summary } = body;

      expect(summary.totalRequirements).toBe(
        summary.compliant + summary.nonCompliant + summary.partial + summary.notApplicable,
      );
      expect(summary.compliancePercentage).toBe(
        Math.round((summary.compliant / summary.totalRequirements) * 100),
      );
      expect(body.findings).toHaveLength(summary.nonCompliant + summary.partial);

      for (const requirementItem of body.standards.flatMap((standard) => standard.requirements)) {
        expect(requirementItem.code).toBeTruthy();
        expect(['compliant', 'non-compliant', 'partial', 'not-applicable']).toContain(
          requirementItem.status,
        );
        if (requirementItem.status !== 'not-applicable') {
          expect(requirementItem.evidence).toBeTruthy();
        }
      }
    });
  });
});