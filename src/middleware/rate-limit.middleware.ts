import { Injectable, NestMiddleware } from '@nestjs/common';

/**
 * Per-IP sliding-window limiter. Auth routes get a much lower budget than the
 * rest of the API, which is what makes credential stuffing expensive.
 *
 * In-memory and therefore per-process: behind more than one replica each
 * instance keeps its own counters.
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly windowMs = 60_000;
  private readonly generalMax = Number(process.env.RATE_LIMIT_MAX ?? 300);
  private readonly authMax = Number(process.env.RATE_LIMIT_AUTH_MAX ?? 10);
  private readonly buckets = new Map<string, number[]>();
  private lastSweep = Date.now();

  use(req: any, res: any, next: () => void): void {
    const ip = String(req.ip ?? req.socket?.remoteAddress ?? 'unknown');
    const now = Date.now();
    const isAuth = typeof req.path === 'string' && req.path.startsWith('/auth/');
    // Separate budgets, so auth traffic cannot starve the rest of the API.
    const key = `${isAuth ? 'auth' : 'general'}:${ip}`;
    const limit = isAuth ? this.authMax : this.generalMax;

    const hits = (this.buckets.get(key) ?? []).filter((at) => now - at < this.windowMs);
    hits.push(now);
    this.buckets.set(key, hits);
    this.sweep(now);

    if (hits.length > limit) {
      const retryAfter = Math.max(1, Math.ceil((this.windowMs - (now - hits[0])) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        statusCode: 429,
        message: `Too many requests (limit ${limit} per minute). Try again in ${retryAfter}s.`,
        error: 'Too Many Requests',
      });
      return;
    }

    next();
  }

  private sweep(now: number): void {
    if (now - this.lastSweep < this.windowMs) {
      return;
    }
    this.lastSweep = now;
    for (const [key, hits] of this.buckets) {
      const live = hits.filter((at) => now - at < this.windowMs);
      if (live.length === 0) {
        this.buckets.delete(key);
      } else {
        this.buckets.set(key, live);
      }
    }
  }
}
