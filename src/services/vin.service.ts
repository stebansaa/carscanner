import { env } from '../config/env';
import { logger } from '../utils/logger';
import { VINDecodeError, ExternalAPIError } from '../utils/errors';
import { validateVIN, normalizeVIN } from '../utils/validators';
import {
  NHTSAResponseSchema,
  extractNHTSAValue,
  type VehicleSpecs,
  type VINDecodeResponse,
} from '../schemas/vin.schema';

/**
 * Decodes VIN using NHTSA vPIC API
 *
 * @param vin - 17-character Vehicle Identification Number
 * @returns Decoded vehicle specifications
 * @throws {VINValidationError} If VIN format is invalid
 * @throws {VINDecodeError} If API call fails
 *
 * @example
 * const specs = await decodeVIN('1HGCM82633A123456');
 * console.log(specs.make); // 'HONDA'
 */
export async function decodeVIN(vin: string): Promise<VINDecodeResponse> {
  try {
    // Normalize and validate VIN
    const normalizedVIN = normalizeVIN(vin);
    validateVIN(normalizedVIN);

    logger.info('Decoding VIN', { vin: normalizedVIN });

    const url = `${env.NHTSA_API_BASE}/vehicles/DecodeVin/${normalizedVIN}?format=json`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new ExternalAPIError(
        'NHTSA',
        `HTTP ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();

    // Validate response structure
    const validated = NHTSAResponseSchema.parse(data);

    // Extract vehicle specs
    const specs = extractVehicleSpecs(validated.Results);

    // Check if decode was successful
    const errorCode = extractNHTSAValue(validated.Results, 'Error Code');
    const errorText = extractNHTSAValue(validated.Results, 'Error Text');

    const warnings: string[] = [];
    if (errorCode && errorCode !== '0') {
      warnings.push(errorText || 'Unknown NHTSA error');
    }

    logger.info('VIN decoded successfully', { vin: normalizedVIN, make: specs.make });

    return {
      vin: normalizedVIN,
      official: specs,
      validated: warnings.length === 0,
      warnings,
    };
  } catch (error) {
    logger.error('VIN decode failed', { error, vin });

    if (error instanceof VINDecodeError || error instanceof ExternalAPIError) {
      throw error;
    }

    throw new VINDecodeError('Failed to decode VIN', vin, error);
  }
}

/**
 * Extracts vehicle specifications from NHTSA results array
 */
function extractVehicleSpecs(
  results: Array<{ Variable: string; Value: string | null }>
): VehicleSpecs {
  const make = extractNHTSAValue(results, 'Make') || 'Unknown';
  const model = extractNHTSAValue(results, 'Model') || 'Unknown';
  const year = extractNHTSAValue(results, 'Model Year') || 'Unknown';
  const trim = extractNHTSAValue(results, 'Trim');
  const bodyStyle = extractNHTSAValue(results, 'Body Class');
  const engine =
    extractNHTSAValue(results, 'Engine Model') ||
    extractNHTSAValue(results, 'Engine Number of Cylinders');
  const transmission = extractNHTSAValue(results, 'Transmission Style');
  const driveTrain = extractNHTSAValue(results, 'Drive Type');
  const fuelType = extractNHTSAValue(results, 'Fuel Type - Primary');
  const manufacturer = extractNHTSAValue(results, 'Manufacturer Name');

  return {
    make,
    model,
    year,
    trim,
    bodyStyle,
    engine,
    transmission,
    driveTrain,
    fuelType,
    manufacturer,
  };
}

/**
 * Compares OCR-extracted data with official VIN decode data
 *
 * @param ocrData - Data extracted from sticker via OCR
 * @param vinData - Official data from VIN decode
 * @returns Array of discrepancy warnings
 */
export function compareWithVINData(
  ocrData: { make: string; model: string; year: number },
  vinData: VehicleSpecs
): string[] {
  const warnings: string[] = [];

  // Normalize for comparison (case-insensitive)
  const normalize = (str: string | number): string =>
    String(str).toLowerCase().trim();

  // Check make
  if (normalize(ocrData.make) !== normalize(vinData.make)) {
    warnings.push(
      `Make mismatch: OCR says "${ocrData.make}", VIN says "${vinData.make}"`
    );
  }

  // Check model
  if (normalize(ocrData.model) !== normalize(vinData.model)) {
    warnings.push(
      `Model mismatch: OCR says "${ocrData.model}", VIN says "${vinData.model}"`
    );
  }

  // Check year
  if (normalize(ocrData.year) !== normalize(vinData.year)) {
    warnings.push(
      `Year mismatch: OCR says "${ocrData.year}", VIN says "${vinData.year}"`
    );
  }

  return warnings;
}
