import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import express_prom_bundle from "express-prom-bundle";
import morgan from "morgan";
import { stream } from "./utils/logger";
import { createHealthCheckHandler, readinessCheck, livenessCheck } from "./utils/healthCheck";
import { errorHandler, setupErrorHandlers } from "./middleware/errorHandler";
import { generalLimiter } from "./middleware/rateLimiter";

import tenantRoutes from './tenant/tenant.routes';

// Initialize metrics middleware
const metricsMiddleware = express_prom_bundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true
});

// Set up global error handlers
setupErrorHandlers();

// Create app
const app = express();

// Apply middlewares
app.use(metricsMiddleware);
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream })); // Log HTTP requests
app.use(generalLimiter); // Apply general rate limiting

// App version from package.json
const { version } = require('../package.json');

// Health check routes
app.get("/health", createHealthCheckHandler("tenant-service", version, {
  "auth-service": `${process.env.AUTH_MS_URL}/health`
}));
app.get("/readiness", readinessCheck);
app.get("/liveness", livenessCheck);

// API routes
app.use("/tenant", tenantRoutes);

// Root endpoint
app.get("/", (req, res) => {
  return res.status(200).send("Tenant Microservice is running!");
});

// Global error handler - must be last
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 8003;
app.listen(PORT, () => {
  console.log(`🚀 Tenant Microservice has started on port ${PORT}`);
});