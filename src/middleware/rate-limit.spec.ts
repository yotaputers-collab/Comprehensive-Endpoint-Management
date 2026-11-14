import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../test/app';
import { RateLimitMiddleware } from './rate-limit.middleware';

interface FakeResponse {
  statusCode: number;
  body?: unknown;
  headers: Record<string, string>;
  blocked: boolean;
  setHeader(name: string, value: string): void;
  status(code: number): FakeResponse;
  json(body: unknown): FakeResponse;
}

const makeResponse = (): FakeResponse => {
  const response: FakeResponse = {
    statusCode: 200,
    headers: {},
    blocked: false,
    setHeader(name, value) {
      response.headers[name] = value;
    },
    status(code) {
      response.statusCode = code;
      response.blocked = true;
      return response;
    },
    json(body) {
      response.body = body;
      return response;
    },
  };
  return response;
};

/** Runs one request through the middleware and reports whether it was blocked. */
const hit = (middleware: RateLimitMiddleware, path: string, ip = '203.0.113.7') => {
  const response = makeResponse();
  let passed = false;
  middleware.use({ path, ip }, response, () => {
    passed = true;
  });
  return { passed, response };
};

describe('RateLimitMiddleware', () => {
  const ORIGINAL_MAX = process.env.RATE_LIMIT_MAX;
  const ORIGINAL_AUTH_MAX = process.env.RATE_LIMIT_AUTH_MAX;
  let clock: number;

  beforeEach(() => {
    process.env.RATE_LIMIT_MAX = '3';
    process.env.RATE_LIMIT_AUTH_MAX = '2';
    clock = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => clock);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.RATE_LIMIT_MAX = ORIGINAL_MAX;
    process.env.RATE_LIMIT_AUTH_MAX = ORIGINAL_AUTH_MAX;
  });

  it('lets the budget through and then answers 429 with Retry-After', () => {
    const middleware = new RateLimitMiddleware();

    expect(hit(middleware, '/agents').passed).toBe(true);
    expect(hit(middleware, '/agents').passed).toBe(true);
    expect(hit(middleware, '/agents').passed).toBe(true);

    const rejected = hit(middleware, '/agents');

    expect(rejected.passed).toBe(false);
    expect(rejected.response.statusCode).toBe(429);
    expect(rejected.response.body).toMatchObject({ statusCode: 429, error: 'Too Many Requests' });
    expect(String((rejected.response.body as { message: string }).message)).toMatch(
      /limit 3 per minute/i,
    );
    expect(Number(rejected.response.headers['Retry-After'])).toBeGreaterThan(0);
  });

  it('does not set Retry-After on requests it allows', () => {
    const middleware = new RateLimitMiddleware();
    const allowed = hit(middleware, '/agents');

    expect(allowed.passed).toBe(true);
    expect(allowed.response.headers['Retry-After']).toBeUndefined();
  });

  it('gives auth routes the smaller budget', () => {
    const middleware = new RateLimitMiddleware();

    expect(hit(middleware, '/auth/login').passed).toBe(true);
    expect(hit(middleware, '/auth/login').passed).toBe(true);
    expect(hit(middleware, '/auth/login').passed).toBe(false);
  });

  it('keeps the auth and general buckets independent for one address', () => {
    const middleware = new RateLimitMiddleware();

    hit(middleware, '/auth/login');
    hit(middleware, '/auth/login');
    expect(hit(middleware, '/auth/login').passed).toBe(false);

    // Auth traffic must not starve the rest of the API.
    expect(hit(middleware, '/agents').passed).toBe(true);
    expect(hit(middleware, '/agents').passed).toBe(true);
    expect(hit(middleware, '/agents').passed).toBe(true);
    expect(hit(middleware, '/agents').passed).toBe(false);
  });

  it('budgets each address separately', () => {
    const middleware = new RateLimitMiddleware();

    hit(middleware, '/agents', '198.51.100.1');
    hit(middleware, '/agents', '198.51.100.1');
    hit(middleware, '/agents', '198.51.100.1');
    expect(hit(middleware, '/agents', '198.51.100.1').passed).toBe(false);

    expect(hit(middleware, '/agents', '198.51.100.2').passed).toBe(true);
  });

  it('treats only /auth/ paths as auth traffic', () => {
    const middleware = new RateLimitMiddleware();

    // Spends the general budget, not the auth one.
    hit(middleware, '/authorize');
    hit(middleware, '/authorize');
    hit(middleware, '/authorize');
    expect(hit(middleware, '/authorize').passed).toBe(false);

    expect(hit(middleware, '/auth/login').passed).toBe(true);
  });

  it('frees the budget once the window has passed', () => {
    const middleware = new RateLimitMiddleware();

    hit(middleware, '/agents');
    hit(middleware, '/agents');
    hit(middleware, '/agents');
    expect(hit(middleware, '/agents').passed).toBe(false);

    clock += 61_000;

    expect(hit(middleware, '/agents').passed).toBe(true);
  });

  it('sweeps buckets whose hits have all expired', () => {
    const middleware = new RateLimitMiddleware();
    const buckets = (middleware as unknown as { buckets: Map<string, number[]> }).buckets;

    hit(middleware, '/auth/login', '10.0.0.1');
    expect(buckets.has('auth:10.0.0.1')).toBe(true);

    clock += 61_000;
    hit(middleware, '/agents', '10.0.0.2');

    expect(buckets.has('auth:10.0.0.1')).toBe(false);
  });

  it('keeps the Retry-After hint inside the window', () => {
    const middleware = new RateLimitMiddleware();

    hit(middleware, '/auth/login');
    hit(middleware, '/auth/login');

    clock += 50_000; // ten seconds left in the window
    const rejected = hit(middleware, '/auth/login');

    expect(rejected.passed).toBe(false);
    const retryAfter = Number(rejected.response.headers['Retry-After']);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(10);
  });
});

describe('Rate limiting over HTTP', () => {
  let app: INestApplication;
  let http: unknown;

  beforeAll(async () => {
    // Low budgets, applied before the middleware is constructed.
    app = await createTestApp({ RATE_LIMIT_MAX: '5', RATE_LIMIT_AUTH_MAX: '3' });
    http = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('blocks credential attempts past the auth budget and leaves the API usable', async () => {
    const attempt = () =>
      request(http as never)
        .post('/auth/login')
        .send({ username: 'rate-limit-target', password: 'wrong-password' });

    for (let index = 0; index < 3; index += 1) {
      const allowed = await attempt();
      expect(allowed.status).toBe(401); // wrong credentials, but not throttled
    }

    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(String(blocked.body.message)).toMatch(/too many requests/i);

    // The general bucket is untouched, so ordinary traffic still works.
    await request(http as never).get('/health').expect(200);
  });

  it('enforces the general budget across endpoints', async () => {
    // One general request has already been spent above.
    for (let index = 0; index < 4; index += 1) {
      await request(http as never).get('/health').expect(200);
    }

    const blocked = await request(http as never).get('/health');
    expect(blocked.status).toBe(429);
    expect(String(blocked.body.message)).toMatch(/limit 5 per minute/i);
  });
});