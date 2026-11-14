import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../test/app';

describe('Configuration', () => {
  let app: INestApplication;
  let http: unknown;
  let admin: string;
  let viewer: string;

  const signIn = async (username: string, password: string): Promise<string> => {
    const response = await request(http as never)
      .post('/auth/login')
      .send({ username, password });
    return response.body.accessToken as string;
  };

  const read = (key: string) =>
    request(http as never)
      .get(`/configuration/${key}`)
      .set('authorization', `Bearer ${admin}`);

  const readAll = () =>
    request(http as never)
      .get('/configuration')
      .set('authorization', `Bearer ${admin}`);

  beforeAll(async () => {
    app = await createTestApp({
      DB_HOST: 'db.internal',
      VULNERABILITY_SCAN_INTERVAL: '120000',
      ISO27001_ENABLED: 'true',
    });
    http = app.getHttpServer();
    admin = await signIn('admin', 'admin-pass-1234');

    await request(http as never)
      .post('/auth/users')
      .set('authorization', `Bearer ${admin}`)
      .send({ username: 'config-viewer', password: 'config-viewer-pass-1', role: 'viewer' })
      .expect(201);

    viewer = await signIn('config-viewer', 'config-viewer-pass-1');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('reading', () => {
    it('requires a session', async () => {
      await request(http as never).get('/configuration').expect(401);
    });

    it('groups the effective settings for any authenticated role', async () => {
      const response = await request(http as never)
        .get('/configuration')
        .set('authorization', `Bearer ${viewer}`);

      expect(response.status).toBe(200);
      expect(Object.keys(response.body).sort()).toEqual([
        'compliance',
        'database',
        'dlp',
        'security',
        'server',
        'vulnerability',
      ]);
      expect(response.body.database.host).toBe('db.internal');
      expect(response.body.vulnerability.scanInterval).toBe('120000');
    });

    it('does not expose secrets through the settings endpoint', async () => {
      const response = await readAll();
      const serialised = JSON.stringify(response.body);

      expect(serialised).not.toContain('test-secret'); // JWT_SECRET
      expect(serialised).not.toContain('admin-pass-1234'); // ADMIN_INITIAL_PASSWORD
      expect(serialised).not.toContain('enroll-token'); // AGENT_ENROLL_TOKEN
      expect(response.body.security.jwtSecret).toBeUndefined();
    });

    it('returns a single key, and nothing for a key that is not set', async () => {
      const known = await read('DB_HOST');
      expect(known.status).toBe(200);
      expect(known.text).toContain('db.internal');

      const unknown = await read('NOT_A_REAL_SETTING');
      expect(unknown.status).toBe(200);
      expect(unknown.text).toBe('');
    });
  });

  describe('updating', () => {
    it('keeps writes to admins', async () => {
      await request(http as never)
        .put('/configuration/VULNERABILITY_SCAN_INTERVAL')
        .set('authorization', `Bearer ${viewer}`)
        .send({ value: 5000 })
        .expect(403);
    });

    it('rejects a write without a value', async () => {
      await request(http as never)
        .put('/configuration/VULNERABILITY_SCAN_INTERVAL')
        .set('authorization', `Bearer ${admin}`)
        .send({})
        .expect(400);
    });

    it('applies an override immediately and reports it in the grouped view', async () => {
      const updated = await request(http as never)
        .put('/configuration/VULNERABILITY_SCAN_INTERVAL')
        .set('authorization', `Bearer ${admin}`)
        .send({ value: 5000 });

      expect(updated.status).toBe(200); // body is a bare boolean, not JSON
      expect(updated.text).toContain('true');

      const grouped = await readAll();
      expect(grouped.body.vulnerability.scanInterval).toBe(5000);
      expect((await read('VULNERABILITY_SCAN_INTERVAL')).text).toContain('5000');
    });
  });

  describe('backup and restore', () => {
    it('keeps the backup and restore endpoints to admins', async () => {
      await request(http as never)
        .post('/configuration/backup')
        .set('authorization', `Bearer ${viewer}`)
        .expect(403);

      await request(http as never)
        .post('/configuration/restore')
        .set('authorization', `Bearer ${viewer}`)
        .send({ backupData: '{}' })
        .expect(403);
    });

    it('round-trips configuration through a backup', async () => {
      await request(http as never)
        .put('/configuration/VULNERABILITY_SCAN_INTERVAL')
        .set('authorization', `Bearer ${admin}`)
        .send({ value: 9000 })
        .expect(200);

      const backup = await request(http as never)
        .post('/configuration/backup')
        .set('authorization', `Bearer ${admin}`);
      expect(backup.status).toBe(201);
      expect(typeof backup.body.backupData).toBe('string');

      const parsed = JSON.parse(backup.body.backupData);
      expect(parsed.vulnerability.scanInterval).toBe(9000);

      // Change the value, then restore the snapshot and expect the old one back.
      await request(http as never)
        .put('/configuration/VULNERABILITY_SCAN_INTERVAL')
        .set('authorization', `Bearer ${admin}`)
        .send({ value: 1 })
        .expect(200);
      expect((await readAll()).body.vulnerability.scanInterval).toBe(1);

      const restored = await request(http as never)
        .post('/configuration/restore')
        .set('authorization', `Bearer ${admin}`)
        .send({ backupData: backup.body.backupData });

      expect(restored.status).toBe(201);
      expect(restored.body.success).toBe(true);
      expect((await readAll()).body.vulnerability.scanInterval).toBe(9000);
    });

    it('refuses a snapshot it cannot parse instead of throwing', async () => {
      for (const backupData of ['not json at all', 'null', '123', '"a string"']) {
        const response = await request(http as never)
          .post('/configuration/restore')
          .set('authorization', `Bearer ${admin}`)
          .send({ backupData });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(false);
      }
    });
  });
});