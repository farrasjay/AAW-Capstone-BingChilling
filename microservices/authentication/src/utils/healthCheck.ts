// src/utils/healthCheck.ts
import { Request, Response, RequestHandler, NextFunction } from 'express';
import { pool } from '@src/db';
import { logger } from './logger';
import {
  authServiceBreaker,
  productServiceBreaker,
  orderServiceBreaker,
  tenantServiceBreaker,
  wishlistServiceBreaker
} from './circuitBreaker';
import axios from 'axios';

// Health status enum
enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy'
}

// Service dependencies interface
interface ServiceDependencies {
  [key: string]: {
    status: HealthStatus;
    details?: string;
    responseTime?: number;
  };
}

// Health check response interface
interface HealthCheckResponse {
  status: HealthStatus;
  version: string;
  uptime: string;
  timestamp: string;
  serviceName: string;
  database: {
    status: HealthStatus;
    responseTime?: number;
    details?: string;
  };
  dependencies?: ServiceDependencies;
  circuitBreakers?: {
    [key: string]: {
      state: string;
      failureCount: number;
      nextAttempt: string | null;
    };
  };
}

// Check database connection
const checkDatabase = async (): Promise<{
  status: HealthStatus;
  responseTime?: number;
  details?: string;
}> => {
  const start = Date.now();
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT 1');
    client.release();
    
    const responseTime = Date.now() - start;
    
    return {
      status: HealthStatus.HEALTHY,
      responseTime
    };
  } catch (error: any) {
    logger.error(`Database health check failed: ${error.message}`);
    return {
      status: HealthStatus.UNHEALTHY,
      details: error.message
    };
  }
};

// Check service dependency
const checkServiceDependency = async (
  name: string,
  url: string
): Promise<{
  status: HealthStatus;
  details?: string;
  responseTime?: number;
}> => {
  const start = Date.now();
  try {
    const response = await axios.get(url, { timeout: 3000 });
    const responseTime = Date.now() - start;
    
    if (response.status >= 200 && response.status < 300) {
      return {
        status: HealthStatus.HEALTHY,
        responseTime
      };
    } else {
      return {
        status: HealthStatus.DEGRADED,
        responseTime,
        details: `Unexpected status code: ${response.status}`
      };
    }
  } catch (error: any) {
    logger.warn(`Health check for ${name} failed: ${error.message}`);
    return {
      status: HealthStatus.UNHEALTHY,
      details: error.message
    };
  }
};

// Get circuit breaker statuses
const getCircuitBreakerStatuses = () => {
  return {
    'auth-service': authServiceBreaker.getStatus(),
    'product-service': productServiceBreaker.getStatus(),
    'order-service': orderServiceBreaker.getStatus(),
    'tenant-service': tenantServiceBreaker.getStatus(),
    'wishlist-service': wishlistServiceBreaker.getStatus()
  };
};

// Health check handler factory with correct Express handler signature
export const createHealthCheckHandler = (
  serviceName: string,
  version: string,
  dependencies: { [key: string]: string } = {}
): RequestHandler => {
  const serverStartTime = Date.now();
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check database connection
      const dbStatus = await checkDatabase();
      
      // Check service dependencies
      const serviceDependencies: ServiceDependencies = {};
      
      for (const [name, url] of Object.entries(dependencies)) {
        serviceDependencies[name] = await checkServiceDependency(name, url);
      }
      
      // Determine overall status
      let overallStatus = HealthStatus.HEALTHY;
      
      if (dbStatus.status === HealthStatus.UNHEALTHY) {
        overallStatus = HealthStatus.UNHEALTHY;
      } else if (dbStatus.status === HealthStatus.DEGRADED) {
        overallStatus = HealthStatus.DEGRADED;
      }
      
      // Check service dependencies status
      for (const dependency of Object.values(serviceDependencies)) {
        if (dependency.status === HealthStatus.UNHEALTHY && overallStatus !== HealthStatus.UNHEALTHY) {
          overallStatus = HealthStatus.DEGRADED;
        }
      }
      
      // Calculate uptime
      const uptimeMs = Date.now() - serverStartTime;
      const uptime = formatUptime(uptimeMs);
      
      // Build response
      const response: HealthCheckResponse = {
        status: overallStatus,
        version,
        uptime,
        timestamp: new Date().toISOString(),
        serviceName,
        database: dbStatus
      };
      
      // Add dependencies if they exist
      if (Object.keys(serviceDependencies).length > 0) {
        response.dependencies = serviceDependencies;
      }
      
      // Add circuit breaker statuses
      response.circuitBreakers = getCircuitBreakerStatuses();
      
      // Set appropriate status code
      let statusCode = 200;
      if (overallStatus === HealthStatus.DEGRADED) {
        statusCode = 200; // Still working but degraded
      } else if (overallStatus === HealthStatus.UNHEALTHY) {
        statusCode = 503; // Service unavailable
      }
      
      res.status(statusCode).json(response);
    } catch (error: any) {
      logger.error(`Health check failed: ${error.message}`);
      res.status(500).json({
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date().toISOString(),
        details: error.message
      });
    }
  };
};

// Basic readiness check
export const readinessCheck: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Perform a simple DB connection test
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    res.status(200).json({
      status: HealthStatus.HEALTHY,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error(`Readiness check failed: ${error.message}`);
    res.status(503).json({
      status: HealthStatus.UNHEALTHY,
      timestamp: new Date().toISOString(),
      details: error.message
    });
  }
};

// Liveness check
export const livenessCheck: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  res.status(200).json({
    status: HealthStatus.HEALTHY,
    timestamp: new Date().toISOString()
  });
};

// Helper function to format uptime
const formatUptime = (uptimeMs: number): string => {
  const seconds = Math.floor(uptimeMs / 1000) % 60;
  const minutes = Math.floor(uptimeMs / (1000 * 60)) % 60;
  const hours = Math.floor(uptimeMs / (1000 * 60 * 60)) % 24;
  const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
  
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};