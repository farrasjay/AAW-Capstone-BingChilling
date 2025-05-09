import { logger } from '@src/utils/logger';

export class ErrorResponse {
    message: string;
    status: number;
    error?: Error;

    constructor(message: string, status: number, error?: Error) {
        this.message = message;
        this.status = status;
        this.error = error;
        
        // Log error with appropriate level based on status code
        if (status >= 500) {
            logger.error(`[${status}] ${message}${error ? ` - ${error.stack}` : ''}`);
        } else if (status >= 400) {
            logger.warn(`[${status}] ${message}${error ? ` - ${error.message}` : ''}`);
        } else {
            logger.info(`[${status}] ${message}`);
        }
    }

    generate() {
        return {
            data: {
                message: this.message,
                // Include error stack in dev mode but not in production
                ...(process.env.NODE_ENV !== 'production' && this.error && { 
                    stack: this.error.stack 
                })
            },
            status: this.status
        }
    }
}

export class NotFoundResponse extends ErrorResponse {
    constructor(message: Error | string | unknown = "Resource not found") {
        const error = message instanceof Error ? message : undefined;
        const messageStr = message?.toString() ?? "Resource not found";
        super(messageStr, 404, error);
    }
}

export class InternalServerErrorResponse extends ErrorResponse {
    constructor(message: Error | string | unknown = "Internal Server Error") {
        const error = message instanceof Error ? message : undefined;
        const messageStr = message?.toString() ?? "Internal Server Error";
        super(messageStr, 500, error);
    }
}

export class UnauthenticatedResponse extends ErrorResponse {
    constructor(message: Error | string | unknown = "Unauthenticated") {
        const error = message instanceof Error ? message : undefined;
        const messageStr = message?.toString() ?? "Unauthenticated";
        super(messageStr, 401, error);
    }
}

export class UnauthorizedResponse extends ErrorResponse {
    constructor(message: Error | string | unknown = "Unauthorized") {
        const error = message instanceof Error ? message : undefined;
        const messageStr = message?.toString() ?? "Unauthorized";
        super(messageStr, 403, error);
    }
}

export class BadRequestResponse extends ErrorResponse {
    constructor(message: Error | string | unknown = "Bad Request") {
        const error = message instanceof Error ? message : undefined;
        const messageStr = message?.toString() ?? "Bad Request";
        super(messageStr, 400, error);
    }
}

export class ConflictResponse extends ErrorResponse {
    constructor(message: Error | string | unknown = "Conflict") {
        const error = message instanceof Error ? message : undefined;
        const messageStr = message?.toString() ?? "Conflict";
        super(messageStr, 409, error);
    }
}

// Add new error types for circuit breaker, timeout, etc.
export class ServiceUnavailableResponse extends ErrorResponse {
    constructor(message: Error | string | unknown = "Service Temporarily Unavailable") {
        const error = message instanceof Error ? message : undefined;
        const messageStr = message?.toString() ?? "Service Temporarily Unavailable";
        super(messageStr, 503, error);
    }
}

export class GatewayTimeoutResponse extends ErrorResponse {
    constructor(message: Error | string | unknown = "Gateway Timeout") {
        const error = message instanceof Error ? message : undefined;
        const messageStr = message?.toString() ?? "Gateway Timeout";
        super(messageStr, 504, error);
    }
}

export class TooManyRequestsResponse extends ErrorResponse {
    constructor(message: Error | string | unknown = "Too Many Requests") {
        const error = message instanceof Error ? message : undefined;
        const messageStr = message?.toString() ?? "Too Many Requests";
        super(messageStr, 429, error);
    }
}