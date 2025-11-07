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
 * Schema for raw LLM response (before validation)
 */
export const RawLLMResponseSchema = z.object({
  vin: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.union([z.number(), z.string()]).transform((val) =>
    typeof val === 'string' ? parseInt(val, 10) : val
  ),
  trim: z.string().optional(),
  engine: z.string().optional(),
  basePrice: z.union([z.number(), z.string()]).transform((val) =>
    typeof val === 'string' ? parseFloat(val.replace(/[^0-9.]/g, '')) : val
  ),
  options: z
    .array(
      z.object({
        name: z.string(),
        price: z.union([z.number(), z.string()]).transform((val) =>
          typeof val === 'string' ? parseFloat(val.replace(/[^0-9.]/g, '')) : val
        ),
      })
    )
    .default([]),
  totalMSRP: z.union([z.number(), z.string()]).transform((val) =>
    typeof val === 'string' ? parseFloat(val.replace(/[^0-9.]/g, '')) : val
  ),
  dealerAddOns: z
    .array(
      z.object({
        name: z.string(),
        price: z.union([z.number(), z.string()]).transform((val) =>
          typeof val === 'string' ? parseFloat(val.replace(/[^0-9.]/g, '')) : val
        ),
      })
    )
    .default([]),
  totalPrice: z.union([z.number(), z.string()]).transform((val) =>
    typeof val === 'string' ? parseFloat(val.replace(/[^0-9.]/g, '')) : val
  ),
});

export type RawLLMResponse = z.infer<typeof RawLLMResponseSchema>;
