/**
 * Central type definitions
 * Re-exports types from schemas and adds additional utility types
 */

// Import types for use in this file
import type {
  StickerData as StickerDataImport,
} from '../schemas/scan.schema';
import type {
  VehicleSpecs as VehicleSpecsImport,
} from '../schemas/vin.schema';
import type {
  MarketData as MarketDataImport,
  ComparableListing as ComparableListingImport,
} from '../schemas/market.schema';
import { DealVerdict as DealVerdictImport } from '../schemas/market.schema';

// Re-export schema types
export type {
  Option,
  DealerAddOn,
  StickerData,
  ScanRequest,
  ScanResponse,
  RawLLMResponse,
} from '../schemas/scan.schema';

export type {
  VINDecodeRequest,
  VINDecodeResponse,
  VehicleSpecs,
  NHTSAResponse,
} from '../schemas/vin.schema';

export type {
  ComparableListing,
  MarketData,
  CompareRequest,
  CompareResponse,
} from '../schemas/market.schema';

export { DealVerdict } from '../schemas/market.schema';

/**
 * Database record for scans
 */
export interface ScanRecord {
  id: string; // UUID
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  imageUrl: string; // Local path or S3 URL
  vin: string | null;
  status: 'pending' | 'completed' | 'failed';
  parsedData: StickerDataImport | null;
  marketData: MarketDataImport | null;
  dealScore: number | null;
  verdict: string | null;
  errorMessage: string | null;
}

/**
 * OCR service response
 */
export interface OCRResult {
  success: boolean;
  data?: StickerDataImport;
  rawText?: string;
  error?: string;
}

/**
 * VIN decode service response
 */
export interface VINDecodeResult {
  success: boolean;
  data?: VehicleSpecsImport;
  warnings?: string[];
  error?: string;
}

/**
 * Market comparison service response
 */
export interface MarketComparisonResult {
  success: boolean;
  marketData?: MarketDataImport;
  comparables?: ComparableListingImport[];
  dealScore?: number;
  verdict?: DealVerdictImport;
  error?: string;
}

/**
 * API error response format
 */
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

/**
 * Image upload info
 */
export interface ImageUploadInfo {
  filename: string;
  path: string;
  size: number;
  mimeType: string;
}

/**
 * Score calculation result
 */
export interface ScoreResult {
  dealScore: number; // percentage difference from average
  verdict: DealVerdictImport;
  message: string;
  insights: string[];
}
