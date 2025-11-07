/**
 * Custom error classes for domain-specific errors
 */

/**
 * Thrown when OCR processing fails
 */
export class OCRError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'OCRError';
  }
}

/**
 * Thrown when VIN validation fails
 */
export class VINValidationError extends Error {
  constructor(public vin: string, message?: string) {
    super(message || `Invalid VIN: ${vin}`);
    this.name = 'VINValidationError';
  }
}

/**
 * Thrown when VIN decoding API fails
 */
export class VINDecodeError extends Error {
  constructor(message: string, public vin?: string, public cause?: unknown) {
    super(message);
    this.name = 'VINDecodeError';
  }
}

/**
 * Thrown when market data fetching fails
 */
export class MarketDataError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'MarketDataError';
  }
}

/**
 * Thrown when image upload/processing fails
 */
export class ImageProcessingError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'ImageProcessingError';
  }
}

/**
 * Thrown when external API calls fail
 */
export class ExternalAPIError extends Error {
  constructor(
    public service: string,
    message: string,
    public statusCode?: number,
    public cause?: unknown
  ) {
    super(`${service} API error: ${message}`);
    this.name = 'ExternalAPIError';
  }
}

/**
 * Thrown when configuration is invalid
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Type guard to check if error is an instance of a specific error class
 */
export function isErrorType<T extends Error>(
  error: unknown,
  errorClass: new (...args: any[]) => T
): error is T {
  return error instanceof errorClass;
}
