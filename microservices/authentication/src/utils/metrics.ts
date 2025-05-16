// microservices/authentication/src/utils/metrics.ts
import * as promClient from 'prom-client';

// Create a Registry
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics for Authentication Service
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.5, 1, 5]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const authenticationAttempts = new promClient.Counter({
  name: 'authentication_attempts_total',
  help: 'Total authentication attempts',
  labelNames: ['type', 'result'] // type: login/register, result: success/failure
});

const activeUsers = new promClient.Gauge({
  name: 'active_users_total',
  help: 'Total number of active users'
});

const authErrors = new promClient.Counter({
  name: 'auth_errors_total',
  help: 'Total authentication errors',
  labelNames: ['type', 'error']
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(authenticationAttempts);
register.registerMetric(activeUsers);
register.registerMetric(authErrors);

export {
  register,
  httpRequestDuration,
  httpRequestTotal,
  authenticationAttempts,
  activeUsers,
  authErrors
};