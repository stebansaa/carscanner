import { z } from 'zod';

/**
 * Schema for option/package pricing
 */
export const OptionSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
});

export type Option = z.infer<typeof OptionSchema>;

/**
 * Schema for dealer add-ons (markups, protection packages, etc.)
 */
export const DealerAddOnSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
});

export type DealerAddOn = z.infer<typeof DealerAddOnSchema>;

/**
 * Schema for raw sticker data extracted from OCR
 */
export const StickerDataSchema = z.object({
  vin: z.string().length(17),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().min(1900).max(2030),
  trim: z.string().optional(),
  engine: z.string().optional(),
  basePrice: z.number().positive(),
  options: z.array(OptionSchema).default([]),
  totalMSRP: z.number().positive(),
  dealerAddOns: z.array(DealerAddOnSchema).default([]),
  totalPrice: z.number().positive(),
});

export type StickerData = z.infer<typeof StickerDataSchema>;

/**
 * Schema for scan request (multipart form data)
 */
export const ScanRequestSchema = z.object({
  // Image will be handled separately via Hono's file upload
  zipCode: z.string().length(5).optional(),
});

export type ScanRequest = z.infer<typeof ScanRequestSchema>;

/**
 * Schema for scan response
 */
export const ScanResponseSchema = z.object({
  scanId: z.string().uuid(),
  status: z.enum(['success', 'pending', 'failed']),
  stickerData: StickerDataSchema.optional(),
  error: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type ScanResponse = z.infer<typeof ScanResponseSchema>;

/**
 * Helper function to safely parse price strings
 */
function parsePriceString(val: string): number {
  // Remove all non-numeric characters except decimal point
  const cleaned = val.replace(/[^0-9.]/g, '');

  // Handle edge cases
  if (!cleaned || cleaned === '.') {
    throw new Error(`Invalid price string: "${val}"`);
  }

  // Handle multiple decimal points by keeping only the first one
  const parts = cleaned.split('.');
  const normalized = parts.length > 1
    ? `${parts[0]}.${parts.slice(1).join('')}`
    : cleaned;

  const parsed = parseFloat(normalized);

  if (!Number.isFinite(parsed) || isNaN(parsed)) {
    throw new Error(`Could not parse price: "${val}"`);
  }

  return parsed;
}

/**
 * Helper function to safely parse year
 */
function parseYear(val: string): number {
  const parsed = parseInt(val, 10);

  if (!Number.isFinite(parsed) || isNaN(parsed)) {
    throw new Error(`Could not parse year: "${val}"`);
  }

  return parsed;
}

/**
 * Schema for raw LLM response (before validation)
 */
export const RawLLMResponseSchema = z.object({
  vin: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.union([z.number(), z.string()]).transform((val) =>
    typeof val === 'string' ? parseYear(val) : val
  ),
  trim: z.string().optional(),
  engine: z.string().optional(),
  basePrice: z.union([z.number(), z.string()]).transform((val) =>
    typeof val === 'string' ? parsePriceString(val) : val
  ),
  options: z
    .array(
      z.object({
        name: z.string(),
        price: z.union([z.number(), z.string()]).transform((val) =>
          typeof val === 'string' ? parsePriceString(val) : val
        ),
      })
    )
    .default([]),
  totalMSRP: z.union([z.number(), z.string()]).transform((val) =>
    typeof val === 'string' ? parsePriceString(val) : val
  ),
  dealerAddOns: z
    .array(
      z.object({
        name: z.string(),
        price: z.union([z.number(), z.string()]).transform((val) =>
          typeof val === 'string' ? parsePriceString(val) : val
        ),
      })
    )
    .default([]),
  totalPrice: z.union([z.number(), z.string()]).transform((val) =>
    typeof val === 'string' ? parsePriceString(val) : val
  ),
});

export type RawLLMResponse = z.infer<typeof RawLLMResponseSchema>;
