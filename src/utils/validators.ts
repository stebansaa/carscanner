import { VINValidationError } from './errors';

/**
 * Validates VIN format (17 alphanumeric characters, no I, O, Q)
 *
 * @param vin - Vehicle Identification Number
 * @returns true if valid
 * @throws {VINValidationError} if invalid
 */
export function validateVIN(vin: string): boolean {
  // VIN must be exactly 17 characters
  if (vin.length !== 17) {
    throw new VINValidationError(vin, 'VIN must be exactly 17 characters');
  }

  // VIN must be alphanumeric
  if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) {
    throw new VINValidationError(
      vin,
      'VIN must contain only letters and numbers (no I, O, or Q)'
    );
  }

  return true;
}

/**
 * Validates year is reasonable for a vehicle
 */
export function validateYear(year: number): boolean {
  const currentYear = new Date().getFullYear();
  const minYear = 1900;
  const maxYear = currentYear + 2; // Allow next year models

  if (year < minYear || year > maxYear) {
    throw new Error(`Year must be between ${minYear} and ${maxYear}`);
  }

  return true;
}

/**
 * Validates price is positive
 */
export function validatePrice(price: number, fieldName: string = 'Price'): boolean {
  if (price < 0) {
    throw new Error(`${fieldName} cannot be negative`);
  }

  if (price === 0) {
    throw new Error(`${fieldName} cannot be zero`);
  }

  if (!Number.isFinite(price)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  return true;
}

/**
 * Validates ZIP code format (5 digits)
 */
export function validateZipCode(zip: string): boolean {
  if (!/^\d{5}$/.test(zip)) {
    throw new Error('ZIP code must be exactly 5 digits');
  }

  return true;
}

/**
 * Validates image file type
 */
export function validateImageType(mimeType: string): boolean {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(mimeType.toLowerCase())) {
    throw new Error(
      `Invalid image type: ${mimeType}. Allowed types: ${allowedTypes.join(', ')}`
    );
  }

  return true;
}

/**
 * Validates image file size
 */
export function validateImageSize(sizeInBytes: number, maxSizeMB: number): boolean {
  const minSizeBytes = 1024; // 1KB minimum
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (sizeInBytes < minSizeBytes) {
    throw new Error(
      `Image size (${sizeInBytes} bytes) is too small. Minimum size is ${minSizeBytes} bytes.`
    );
  }

  if (sizeInBytes > maxSizeBytes) {
    throw new Error(
      `Image size (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${maxSizeMB}MB)`
    );
  }

  return true;
}

/**
 * Sanitizes string input (removes excess whitespace, trims)
 */
export function sanitizeString(input: string): string {
  if (input === null || input === undefined) {
    throw new Error('Input string cannot be null or undefined');
  }

  if (typeof input !== 'string') {
    throw new Error(`Expected string, got ${typeof input}`);
  }

  return input.trim().replace(/\s+/g, ' ');
}

/**
 * Normalizes VIN to uppercase
 */
export function normalizeVIN(vin: string): string {
  if (vin === null || vin === undefined) {
    throw new Error('VIN cannot be null or undefined');
  }

  if (typeof vin !== 'string') {
    throw new Error(`Expected string VIN, got ${typeof vin}`);
  }

  return vin.toUpperCase().trim();
}
