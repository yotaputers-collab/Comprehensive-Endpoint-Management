import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    // Simple rate limiting implementation
    const IP = req.ip || req.socket.remoteAddress;
    const now = Date.now();
    
    // In a real implementation, use Redis for distributed rate limiting
    // This is a simple per-IP rate limiter
    
    if (!req.session) {
      req.session = {};
    }
    
    if (!req.session.rateLimit) {
      req.session.rateLimit = {};
    }
    
    const windowMs = 60000; // 1 minute window
    const maxRequests = 60; // max 60 requests per minute
    
    // Clean up old entries
    Object.keys(req.session.rateLimit).forEach(key => {
      if (now - key > windowMs * 2) {
        delete req.session.rateLimit[key];
      }
    });
    
    // Check current request count
    const requestCount = (req.session.rateLimit[IP] || 0) + 1;
    req.session.rateLimit[IP] = now;
    
    if (requestCount > maxRequests) {
      res.status(429).json({
        statusCode: 429,
        message: 'Too many requests, please try again later',
        error: 'Rate Limit Exceeded'
      });
      return;
    }
    
    next();
  }
}