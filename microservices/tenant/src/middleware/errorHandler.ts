import { Request, Response, NextFunction } from 'express';
import { logger } from '@src/utils/logger';
import { InternalServerErrorResponse } from '@src/commons/patterns';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error with stack trace
  logger.error(`Unhandled error: ${err.message}`, { 
    error: err.stack, 
    path: req.path, 
    method: req.method, 
    ip: req.ip
  });

  // Check if headers already sent
  if (res.headersSent) {
    return next(err);
  }

  // Get status code and message
  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Return appropriate response
  return res.status(statusCode).json({
    message,
    // Include stack trace in development mode
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

// Catch async errors
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Catch unhandled promise rejections and uncaught exceptions
export const setupErrorHandlers = () => {
  process.on('uncaughtException', (error) => {
    logger.error(`Uncaught Exception: ${error.message}`, { error: error.stack });
    // Give time for logs to be written before exiting
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('unhandledRejection', (reason: any, promise) => {
    logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason?.message || reason}`, {
      stack: reason?.stack
    });
  });
};