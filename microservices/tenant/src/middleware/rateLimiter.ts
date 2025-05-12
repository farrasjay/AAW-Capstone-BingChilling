// src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import type { Options, RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '@src/utils/logger';
import { TooManyRequestsResponse } from '@src/commons/patterns';

// Create rate limiter factory function
export const createRateLimiter = (
  windowMs = 60 * 1000, // 1 minute by default
  maxRequests = 60,     // 60 requests per window by default
  message = 'Too many requests, please try again later',
  keyGenerator: (req: Request) => string = (req) => {
    // Default key is IP + route path
    return `${req.ip}:${req.path}`;
  } 
): RateLimitRequestHandler => {
  const limiterOptions: Partial<Options> = {
    windowMs,
    limit: maxRequests, // Changed from 'max' to 'limit'
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    handler: (req: Request, res: Response) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}, path: ${req.path}`);
      const error = new TooManyRequestsResponse(message);
      return res.status(error.status).json(error.generate().data);
    }
  };

  return rateLimit(limiterOptions);
};

// Standard rate limiters for common scenarios
export const generalLimiter = createRateLimiter(
  60 * 1000,         // 1 minute window
  60                 // 60 requests per minute
);

export const authLimiter = createRateLimiter(
  5 * 60 * 1000,     // 5 minute window
  20,                // 20 requests per 5 minutes
  'Too many authentication attempts, please try again later',
  (req: Request) => `auth:${req.ip}`  // Use IP as the key for auth endpoints
);

export const createAccountLimiter = createRateLimiter(
  60 * 60 * 1000,    // 1 hour window
  5,                 // 5 registration attempts per hour
  'Too many accounts created from this IP, please try again after an hour',
  (req: Request) => `create:${req.ip}`  // Use IP as the key for registration
);

// API limiter for authenticated requests
export const apiLimiter = createRateLimiter(
  60 * 1000,         // 1 minute window
  100,               // 100 requests per minute
  'API rate limit exceeded',
  (req: Request) => {
    const userId = req.body.user?.id || 'anonymous';
    return `api:${userId}:${req.path}`;  // Use user ID for authenticated requests
  }
);

// Enhanced limiter for sensitive operations
export const sensitiveOperationLimiter = createRateLimiter(
  15 * 60 * 1000,    // 15 minute window
  10,                // 10 requests per 15 minutes
  'Too many sensitive operations, please try again later',
  (req: Request) => {
    const userId = req.body.user?.id || req.ip;
    return `sensitive:${userId}`;
  }
);