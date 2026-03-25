/**
 * Market Rate Interface
 * Represents the fetched exchange rate data
 */
export interface MarketRate {
  currency: string;
  rate: number;
  timestamp: Date;
  source: string;
}

/**
 * Market Rate Fetcher Interface
 * Contract for all currency rate fetcher implementations
 */
export interface MarketRateFetcher {
  /**
   * Get the currency code this fetcher handles
   */
  getCurrency(): string;

  /**
   * Fetch the current exchange rate
   * @throws Error if all rate sources fail
   */
  fetchRate(): Promise<MarketRate>;

  /**
   * Check if the fetcher is healthy and can reach its sources
   */
  isHealthy(): Promise<boolean>;
}

/**
 * Rate Source Configuration
 * Represents an external API source for exchange rates
 */
export interface RateSource {
  name: string;
  url: string;
  apiKey?: string;
}

/**
 * Fetcher Response Wrapper
 * Standardized response format for rate fetcher operations
 */
export interface FetcherResponse {
  success: boolean;
  data?: MarketRate;
  error?: string;
}

/**
 * Rate Fetch Error
 * Detailed error information for failed rate fetches
 */
export interface RateFetchError {
  source: string;
  message: string;
  timestamp: Date;
  retryable?: boolean;
}

/**
 * Circuit Breaker State
 * Represents the state of a circuit breaker
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

/**
 * Health Check Response
 * Standardized health check response
 */
export interface HealthCheckResponse {
  healthy: boolean;
  lastChecked: Date;
  latencyMs?: number;
  error?: string;
}

/**
 * Rate Fetch Statistics
 * Performance and reliability metrics
 */
export interface RateFetchStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatencyMs: number;
  lastSuccessfulFetch?: Date;
  lastFailedFetch?: Date;
}
