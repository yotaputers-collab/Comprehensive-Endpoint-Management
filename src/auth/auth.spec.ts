import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../test/app';
import { DataSource } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../entities/user.entity';

const ADMIN = { username: 'admin', password: 'admin-pass-1234' };

describe('Authentication', () => {
  let app: INestApplication;
  let http: unknown;

  const login = (username: string, password: string) =>
    request(http as never).post('/auth/login').send({ username, password });

  const adminToken = async (): Promise<string> => {
    const response = await login(ADMIN.username, ADMIN.password);
    return response.body.accessToken as string;
  };

  const createUser = async (username: string, password: string, role: string) => {
    const token = await adminToken();
    const response = await request(http as never)
      .post('/auth/users')
      .set('authorization', `Bearer ${token}`)
      .send({ username, password, role });
    expect(response.status).toBe(201);
    return response.body as { id: string; username: string; role: string };
  };

  beforeAll(async () => {
    app = await createTestApp();
    http = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('sign-in', () => {
    it('signs the seeded administrator in and returns a token pair', async () => {
      const response = await login(ADMIN.username, ADMIN.password);

      expect(response.status).toBe(200);
      expect(response.body.tokenType).toBe('Bearer');
      expect(typeof response.body.accessToken).toBe('string');
      expect(typeof response.body.refreshToken).toBe('string');
      expect(response.body.user).toMatchObject({ username: 'admin', role: 'admin' });
      expect(response.body.user.passwordHash).toBeUndefined();
    });

    it('rejects a wrong password without revealing whether the account exists', async () => {
      const wrongPassword = await login(ADMIN.username, 'definitely-not-it');
      const unknownUser = await login('no-such-account', 'definitely-not-it');

      expect(wrongPassword.status).toBe(401);
      expect(unknownUser.status).toBe(401);
      expect(wrongPassword.body.message).toBe(unknownUser.body.message);
    });

    it('locks an account after five failed attempts and keeps it locked', async () => {
      await createUser('lockout-target', 'lockout-pass-1', 'viewer');

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const failed = await login('lockout-target', 'wrong-password');
        expect(failed.status).toBe(401);
      }

      // The correct password still fails: the lock is checked before the hash.
      const locked = await login('lockout-target', 'lockout-pass-1');
      expect(locked.status).toBe(429);
      expect(String(locked.body.message)).toMatch(/locked/i);
    });

    it('rejects a disabled account', async () => {
      const user = await createUser('disabled-target', 'disabled-pass-1', 'viewer');
      const token = await adminToken();

      await request(http as never)
        .delete(`/auth/users/${user.id}`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const response = await login('disabled-target', 'disabled-pass-1');
      expect(response.status).toBe(401);
    });
  });

  describe('refresh rotation', () => {
    it('issues a new pair and refuses to reuse the presented token', async () => {
      const first = await login(ADMIN.username, ADMIN.password);

      const rotated = await request(http as never)
        .post('/auth/refresh')
        .send({ refreshToken: first.body.refreshToken });

      expect(rotated.status).toBe(200);
      expect(rotated.body.refreshToken).not.toBe(first.body.refreshToken);

      const replay = await request(http as never)
        .post('/auth/refresh')
        .send({ refreshToken: first.body.refreshToken });

      expect(replay.status).toBe(401);
      expect(String(replay.body.message)).toMatch(/already been used|invalid or expired/i);
    });

    it('rejects an unknown refresh token', async () => {
      const response = await request(http as never)
        .post('/auth/refresh')
        .send({ refreshToken: 'not-a-real-token' });

      expect(response.status).toBe(401);
    });

    it('revokes the refresh token on logout', async () => {
      const session = await login(ADMIN.username, ADMIN.password);

      const loggedOut = await request(http as never)
        .post('/auth/logout')
        .send({ refreshToken: session.body.refreshToken });
      expect(loggedOut.status).toBe(200);
      expect(loggedOut.body.revoked).toBe(true);

      const afterLogout = await request(http as never)
        .post('/auth/refresh')
        .send({ refreshToken: session.body.refreshToken });
      expect(afterLogout.status).toBe(401);
    });

    it('hashes refresh tokens at rest instead of storing them', async () => {
      const session = await login(ADMIN.username, ADMIN.password);
      const stored = await app.get(DataSource).getRepository(RefreshToken).find();

      expect(stored.length).toBeGreaterThan(0);
      expect(stored.map((row) => row.tokenHash)).not.toContain(session.body.refreshToken);
      expect(stored[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('sessions', () => {
    it('logs out every session and invalidates the live access token', async () => {
      const user = await createUser('session-target', 'session-pass-1', 'viewer');
      const session = await login('session-target', 'session-pass-1');

      await request(http as never)
        .post('/auth/logout-all')
        .set('authorization', `Bearer ${session.body.accessToken}`)
        .expect(200);

      await request(http as never)
        .get('/auth/me')
        .set('authorization', `Bearer ${session.body.accessToken}`)
        .expect(401);

      // The account itself still exists and can sign in again.
      const again = await login('session-target', 'session-pass-1');
      expect(again.status).toBe(200);
      expect(again.body.user.id).toBe(user.id);
    });

    it('rejects a disabled account even with a previously valid token', async () => {
      const user = await createUser('revoked-target', 'revoked-pass-1', 'operator');
      const session = await login('revoked-target', 'revoked-pass-1');
      const admin = await adminToken();

      await request(http as never)
        .delete(`/auth/users/${user.id}`)
        .set('authorization', `Bearer ${admin}`)
        .expect(200);

      await request(http as never)
        .get('/auth/me')
        .set('authorization', `Bearer ${session.body.accessToken}`)
        .expect(401);
    });

    it('refuses unauthenticated and malformed tokens', async () => {
      await request(http as never).get('/agents').expect(401);
      await request(http as never).get('/auth/me').set('authorization', 'Bearer nonsense').expect(401);
      await request(http as never).get('/auth/me').set('authorization', 'Basic abc').expect(401);
    });

    it('reports the caller from the token', async () => {
      const token = await adminToken();
      const response = await request(http as never)
        .get('/auth/me')
        .set('authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ username: 'admin', role: 'admin' });
    });
  });

  describe('password change', () => {
    it('rejects a wrong current password and accepts the right one', async () => {
      await createUser('password-target', 'original-pass-1', 'viewer');
      const session = await login('password-target', 'original-pass-1');
      const bearer = `Bearer ${session.body.accessToken}`;

      await request(http as never)
        .post('/auth/password')
        .set('authorization', bearer)
        .send({ currentPassword: 'not-the-password', newPassword: 'replacement-pass-1' })
        .expect(401);

      await request(http as never)
        .post('/auth/password')
        .set('authorization', bearer)
        .send({ currentPassword: 'original-pass-1', newPassword: 'replacement-pass-1' })
        .expect(200);

      expect((await login('password-target', 'original-pass-1')).status).toBe(401);
      expect((await login('password-target', 'replacement-pass-1')).status).toBe(200);
    });

    it('signs out other sessions when the password changes', async () => {
      await createUser('rotate-target', 'rotate-pass-1', 'viewer');
      const session = await login('rotate-target', 'rotate-pass-1');

      // Non-admin accounts change their own password through /auth/password.
      await request(http as never)
        .post('/auth/password')
        .set('authorization', `Bearer ${session.body.accessToken}`)
        .send({ currentPassword: 'rotate-pass-1', newPassword: 'rotated-pass-1' })
        .expect(200);

      // The old access token carries the previous token version.
      await request(http as never)
        .get('/auth/me')
        .set('authorization', `Bearer ${session.body.accessToken}`)
        .expect(401);
    });
  });

  describe('roles', () => {
    it('keeps user administration to admins', async () => {
      await createUser('role-viewer', 'role-viewer-pass-1', 'viewer');
      await createUser('role-operator', 'role-operator-pass-1', 'operator');

      const viewer = await login('role-viewer', 'role-viewer-pass-1');
      const operator = await login('role-operator', 'role-operator-pass-1');

      await request(http as never)
        .get('/auth/users')
        .set('authorization', `Bearer ${viewer.body.accessToken}`)
        .expect(403);

      await request(http as never)
        .get('/auth/users')
        .set('authorization', `Bearer ${operator.body.accessToken}`)
        .expect(403);

      await request(http as never)
        .post('/auth/users')
        .set('authorization', `Bearer ${operator.body.accessToken}`)
        .send({ username: 'sneaky', password: 'sneaky-pass-1', role: 'admin' })
        .expect(403);

      const admin = await request(http as never)
        .get('/auth/users')
        .set('authorization', `Bearer ${await adminToken()}`);
      expect(admin.status).toBe(200);
      expect(Array.isArray(admin.body)).toBe(true);
    });

    it('refuses duplicate usernames and invalid roles', async () => {
      const token = await adminToken();

      await request(http as never)
        .post('/auth/users')
        .set('authorization', `Bearer ${token}`)
        .send({ username: 'admin', password: 'another-pass-1', role: 'viewer' })
        .expect(409);

      await request(http as never)
        .post('/auth/users')
        .set('authorization', `Bearer ${token}`)
        .send({ username: 'bad-role', password: 'another-pass-1', role: 'superuser' })
        .expect(400);
    });

    it('stops an admin from demoting or deactivating itself', async () => {
      const token = await adminToken();
      const me = await request(http as never)
        .get('/auth/me')
        .set('authorization', `Bearer ${token}`);

      await request(http as never)
        .patch(`/auth/users/${me.body.sub}`)
        .set('authorization', `Bearer ${token}`)
        .send({ active: false })
        .expect(400);

      await request(http as never)
        .patch(`/auth/users/${me.body.sub}`)
        .set('authorization', `Bearer ${token}`)
        .send({ role: 'viewer' })
        .expect(400);
    });

    it('drops the sessions of an account when its access shrinks', async () => {
      const user = await createUser('demoted-target', 'demoted-pass-1', 'operator');
      const session = await login('demoted-target', 'demoted-pass-1');
      const admin = await adminToken();

      await request(http as never)
        .patch(`/auth/users/${user.id}`)
        .set('authorization', `Bearer ${admin}`)
        .send({ role: 'viewer' })
        .expect(200);

      await request(http as never)
        .get('/auth/me')
        .set('authorization', `Bearer ${session.body.accessToken}`)
        .expect(401);

      const fresh = await login('demoted-target', 'demoted-pass-1');
      expect(fresh.status).toBe(200);
      expect(fresh.body.user.role).toBe('viewer');
    });
  });

  describe('storage', () => {
    it('never stores a plaintext password', async () => {
      await createUser('hash-target', 'hash-pass-1', 'viewer');
      const users = await app.get(DataSource).getRepository(User).find();

      const stored = users.find((row) => row.username === 'hash-target');
      expect(stored).toBeDefined();
      expect(stored!.passwordHash).not.toBe('hash-pass-1');
      expect(stored!.passwordHash).toMatch(/^scrypt\$/);
    });
  });
});