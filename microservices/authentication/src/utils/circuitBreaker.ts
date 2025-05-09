import { logger } from './logger';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ServiceUnavailableResponse } from '@src/commons/patterns/exceptions';

enum CircuitState {
  CLOSED,    // Normal operation - requests are allowed
  OPEN,      // Circuit is open - requests are blocked
  HALF_OPEN  // Testing if service is healthy again
}

interface CircuitBreakerOptions {
  failureThreshold: number;    // How many failures before opening circuit
  resetTimeout: number;        // How long to wait before testing service again (ms)
  timeout: number;             // Request timeout (ms)
  maxRetries: number;          // Maximum retry attempts
  retryDelay: number;          // Delay between retries (ms)
}

class CircuitBreaker {
  private state: CircuitState;
  private failureCount: number;
  private nextAttempt: number;
  private serviceId: string;
  private options: CircuitBreakerOptions;

  constructor(serviceId: string, options: Partial<CircuitBreakerOptions> = {}) {
    this.serviceId = serviceId;
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.nextAttempt = Date.now();
    
    // Default options
    this.options = {
      failureThreshold: 3,
      resetTimeout: 30000, // 30 seconds
      timeout: 5000,      // 5 seconds
      maxRetries: 3,
      retryDelay: 1000,   // 1 second
      ...options
    };

    logger.info(`Circuit breaker initialized for service: ${serviceId}`);
  }

  private async executeWithRetry<T>(
    url: string, 
    config: AxiosRequestConfig = {},
    retryCount = 0
  ): Promise<AxiosResponse<T>> {
    try {
      // Add timeout to config
      const requestConfig = {
        ...config,
        timeout: this.options.timeout
      };

      return await axios(url, requestConfig);
    } catch (error: any) {
      // Check if we can retry
      if (
        retryCount < this.options.maxRetries && 
        (error.code === 'ECONNABORTED' || 
         error.code === 'ETIMEDOUT' || 
         (error.response && (error.response.status >= 500 || error.response.status === 429)))
      ) {
        logger.warn(`Retrying request to ${url} (${retryCount + 1}/${this.options.maxRetries})`);
        // Exponential backoff
        const delay = this.options.retryDelay * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry<T>(url, config, retryCount + 1);
      }

      throw error;
    }
  }

  public async exec<T>(
    url: string, 
    config: AxiosRequestConfig = {}
  ): Promise<AxiosResponse<T>> {
    if (this.state === CircuitState.OPEN) {
      // Check if it's time to try again
      if (Date.now() > this.nextAttempt) {
        this.state = CircuitState.HALF_OPEN;
        logger.info(`Circuit half-open for ${this.serviceId}, testing connection...`);
      } else {
        logger.warn(`Circuit open for ${this.serviceId}, rejecting request`);
        throw new ServiceUnavailableResponse(`Service ${this.serviceId} is temporarily unavailable`);
      }
    }

    try {
      const response = await this.executeWithRetry<T>(url, config);

      // If we're half-open and the request succeeded, close the circuit
      if (this.state === CircuitState.HALF_OPEN) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        logger.info(`Circuit closed for ${this.serviceId}, service is healthy again`);
      }

      return response;
    } catch (error: any) {
      // Track failure
      this.failureCount++;
      
      if (this.state === CircuitState.HALF_OPEN || 
          this.failureCount >= this.options.failureThreshold) {
        this.state = CircuitState.OPEN;
        this.nextAttempt = Date.now() + this.options.resetTimeout;
        logger.error(`Circuit opened for ${this.serviceId} due to failure count: ${this.failureCount}`);
      }

      // Log the error
      const errorMessage = error.response ? 
        `${error.response.status} ${error.response.statusText}` : 
        error.message;
      logger.error(`Request to ${this.serviceId} failed: ${errorMessage}`);
      
      throw error;
    }
  }

  // Additional methods to manually control the circuit
  public forceOpen(): void {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.options.resetTimeout;
    logger.info(`Circuit for ${this.serviceId} manually opened`);
  }

  public forceClose(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    logger.info(`Circuit for ${this.serviceId} manually closed`);
  }

  public getState(): string {
    return CircuitState[this.state];
  }

  public getStatus(): any {
    return {
      service: this.serviceId,
      state: CircuitState[this.state],
      failureCount: this.failureCount,
      nextAttempt: this.state === CircuitState.OPEN ? new Date(this.nextAttempt).toISOString() : null
    };
  }
}

// Create circuit breakers for each microservice
const authServiceBreaker = new CircuitBreaker('auth-service', {
  failureThreshold: 3,
  resetTimeout: 30000
});

const productServiceBreaker = new CircuitBreaker('product-service', {
  failureThreshold: 3,
  resetTimeout: 30000
});

const orderServiceBreaker = new CircuitBreaker('order-service', {
  failureThreshold: 3,
  resetTimeout: 30000
});

const tenantServiceBreaker = new CircuitBreaker('tenant-service', {
  failureThreshold: 3,
  resetTimeout: 30000
});

const wishlistServiceBreaker = new CircuitBreaker('wishlist-service', {
  failureThreshold: 3,
  resetTimeout: 30000
});

export {
  CircuitBreaker,
  authServiceBreaker,
  productServiceBreaker,
  orderServiceBreaker,
  tenantServiceBreaker,
  wishlistServiceBreaker
};