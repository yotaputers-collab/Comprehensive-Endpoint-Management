import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../test/app';

const ENROLL_TOKEN = 'enroll-token';

interface Enrolled {
  endpointId: string;
  agentToken: string;
  endpoint: { id: string; name: string; status: string; agentVersion: string };
}

describe('Agent enrolment and inventory', () => {
  let app: INestApplication;
  let http: unknown;
  let admin: string;

  const enroll = (body: Record<string, unknown>, token?: string | null) => {
    const call = request(http as never).post('/agents/enroll').send(body);
    return token === null ? call : call.set('x-enroll-token', token ?? ENROLL_TOKEN);
  };

  const agent = async (hostname: string): Promise<Enrolled> => {
    const response = await enroll({
      hostname,
      platform: 'linux',
      osVersion: 'Ubuntu 22.04',
      agentVersion: '1.2.3',
      architecture: 'x86_64',
    });
    expect(response.status).toBe(201);
    return response.body as Enrolled;
  };

  beforeAll(async () => {
    app = await createTestApp();
    http = app.getHttpServer();

    const session = await request(http as never)
      .post('/auth/login')
      .send({ username: 'admin', password: 'admin-pass-1234' });
    admin = session.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('enrolment', () => {
    it('requires the shared enrolment token', async () => {
      await enroll({ hostname: 'no-token', platform: 'linux' }, null).expect(401);
      await enroll({ hostname: 'wrong-token', platform: 'linux' }, 'wrong').expect(401);
    });

    it('issues a per-agent credential and returns the host as online', async () => {
      const created = await agent('enrol-01');

      expect(created.endpointId).toBe(created.endpoint.id);
      expect(created.agentToken).toMatch(/^[A-Za-z0-9_-]{20,}$/);
      expect(created.endpoint).toMatchObject({ name: 'enrol-01', status: 'online' });
      expect(created.endpoint.agentVersion).toBe('1.2.3');
    });

    it('never returns the credential again through the inventory API', async () => {
      const created = await agent('enrol-02');
      const response = await request(http as never)
        .get(`/agents/${created.endpointId}`)
        .set('authorization', `Bearer ${admin}`);

      expect(response.status).toBe(200);
      expect(JSON.stringify(response.body)).not.toContain(created.agentToken);
      expect(response.body.agentTokenHash).toBeUndefined();
    });

    it('rejects an unsupported platform', async () => {
      await enroll({ hostname: 'solaris-01', platform: 'solaris' }).expect(400);
    });
  });

  describe('heartbeat', () => {
    it('accepts the agent token and refreshes the reported details', async () => {
      const created = await agent('beat-01');

      const response = await request(http as never)
        .post(`/agents/${created.endpointId}/heartbeat`)
        .set('x-agent-token', created.agentToken)
        .send({ ipAddress: '10.0.0.42', agentVersion: '1.2.4' });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.endpoint).toMatchObject({
        ipAddress: '10.0.0.42',
        agentVersion: '1.2.4',
        status: 'online',
      });
    });

    it('refuses another agent token and unknown hosts', async () => {
      const first = await agent('beat-02');
      const second = await agent('beat-03');

      await request(http as never)
        .post(`/agents/${first.endpointId}/heartbeat`)
        .set('x-agent-token', second.agentToken)
        .send({})
        .expect(401);

      await request(http as never)
        .post(`/agents/${first.endpointId}/heartbeat`)
        .send({})
        .expect(401);

      await request(http as never)
        .post('/agents/00000000-0000-0000-0000-000000000000/heartbeat')
        .set('x-agent-token', first.agentToken)
        .send({})
        .expect(401);
    });
  });

  describe('inventory', () => {
    it('replaces the previous report rather than appending to it', async () => {
      const created = await agent('inventory-01');
      const path = `/agents/${created.endpointId}/inventory`;

      const first = await request(http as never)
        .post(path)
        .set('x-agent-token', created.agentToken)
        .send({
          packages: [
            { name: 'openssl', version: '3.0.2', source: 'dpkg', vendor: 'Debian' },
            { name: 'curl', version: '7.81.0', source: 'dpkg' },
          ],
        });
      expect(first.status).toBe(202);
      expect(first.body.accepted).toBe(2);

      const second = await request(http as never)
        .post(path)
        .set('x-agent-token', created.agentToken)
        .send({ packages: [{ name: 'openssl', version: '3.0.5', source: 'dpkg' }] });
      expect(second.status).toBe(202);

      const listed = await request(http as never)
        .get(`/agents/${created.endpointId}/software`)
        .set('authorization', `Bearer ${admin}`);

      expect(listed.status).toBe(200);
      expect(listed.body.count).toBe(1);
      expect(listed.body.packages[0]).toMatchObject({ name: 'openssl', version: '3.0.5' });
    });

    it('orders reported packages by name', async () => {
      const created = await agent('inventory-02');

      await request(http as never)
        .post(`/agents/${created.endpointId}/inventory`)
        .set('x-agent-token', created.agentToken)
        .send({
          packages: [
            { name: 'zsh', version: '5.8' },
            { name: 'bash', version: '5.1' },
            { name: 'curl', version: '7.81.0' },
          ],
        })
        .expect(202);

      const listed = await request(http as never)
        .get(`/agents/${created.endpointId}/software`)
        .set('authorization', `Bearer ${admin}`);

      expect(listed.body.packages.map((item: { name: string }) => item.name)).toEqual([
        'bash',
        'curl',
        'zsh',
      ]);
    });

    it('requires the agent token', async () => {
      const created = await agent('inventory-03');

      await request(http as never)
        .post(`/agents/${created.endpointId}/inventory`)
        .send({ packages: [{ name: 'openssl', version: '3.0.2' }] })
        .expect(401);
    });
  });

  describe('lifecycle', () => {
    it('stops accepting heartbeats once a host is decommissioned', async () => {
      const created = await agent('retire-01');

      await request(http as never)
        .delete(`/agents/${created.endpointId}`)
        .set('authorization', `Bearer ${admin}`)
        .expect(200);

      await request(http as never)
        .post(`/agents/${created.endpointId}/heartbeat`)
        .set('x-agent-token', created.agentToken)
        .send({})
        .expect(401);

      const listed = await request(http as never)
        .get('/agents')
        .set('authorization', `Bearer ${admin}`);

      expect(listed.body.map((item: { id: string }) => item.id)).not.toContain(
        created.endpointId,
      );
    });

    it('keeps decommissioning to admins', async () => {
      const created = await agent('retire-02');
      const operator = await request(http as never)
        .post('/auth/users')
        .set('authorization', `Bearer ${admin}`)
        .send({ username: 'agent-operator', password: 'operator-pass-1', role: 'operator' });
      expect(operator.status).toBe(201);

      const session = await request(http as never)
        .post('/auth/login')
        .send({ username: 'agent-operator', password: 'operator-pass-1' });

      await request(http as never)
        .delete(`/agents/${created.endpointId}`)
        .set('authorization', `Bearer ${session.body.accessToken}`)
        .expect(403);

      await request(http as never)
        .delete(`/agents/${created.endpointId}`)
        .set('authorization', `Bearer ${admin}`)
        .expect(200);
    });

    it('refuses the commands that have no implementation instead of pretending', async () => {
      const created = await agent('no-channel');

      await request(http as never)
        .post(`/agents/${created.endpointId}/deploy`)
        .set('authorization', `Bearer ${admin}`)
        .expect(501);

      await request(http as never)
        .post(`/agents/${created.endpointId}/collect-data`)
        .set('authorization', `Bearer ${admin}`)
        .expect(501);
    });
  });
});