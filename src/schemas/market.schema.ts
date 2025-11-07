import { z } from 'zod';

/**
 * Deal verdict levels
 */
export enum DealVerdict {
  GREAT_DEAL = 'GREAT_DEAL',
  GOOD_DEAL = 'GOOD_DEAL',
  FAIR_DEAL = 'FAIR_DEAL',
  BAD_DEAL = 'BAD_DEAL',
}

/**
 * Schema for a comparable vehicle listing
 */
export const ComparableListingSchema = z.object({
  price: z.number().positive(),
  dealer: z.string().optional(),
  dealerType: z.enum(['franchise', 'independent', 'private']).optional(),
  distance: z.number().nonnegative().optional(), // miles
  mileage: z.number().nonnegative().optional(),
  year: z.number().optional(),
  trim: z.string().optional(),
  listingUrl: z.string().url().optional(),
  daysOnMarket: z.number().nonnegative().optional(),
  vin: z.string().optional(),
});

export type ComparableListing = z.infer<typeof ComparableListingSchema>;

/**
 * Schema for market data statistics
 */
export const MarketDataSchema = z.object({
  avgPrice: z.number().positive(),
  minPrice: z.number().positive(),
  maxPrice: z.number().positive(),
  medianPrice: z.number().positive().optional(),
  sampleSize: z.number().min(0),
  radius: z.number().positive(), // miles
  zipCode: z.string().length(5).optional(),
});

export type MarketData = z.infer<typeof MarketDataSchema>;

/**
 * Schema for market comparison request
 */
export const CompareRequestSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().min(1900).max(2030),
  trim: z.string().optional(),
  userPrice: z.number().positive(),
  zipCode: z.string().length(5).default('90210'), // Default to Beverly Hills for MVP
  radius: z.number().positive().default(50), // miles
});

export type CompareRequest = z.infer<typeof CompareRequestSchema>;

/**
 * Schema for market comparison response
 */
export const CompareResponseSchema = z.object({
  marketData: MarketDataSchema,
  userPrice: z.number().positive(),
  dealScore: z.number(), // percentage difference from average
  verdict: z.nativeEnum(DealVerdict),
  message: z.string(),
  comparables: z.array(ComparableListingSchema).max(10),
  insights: z.array(z.string()).optional(),
  recommendedNegotiation: z.string().optional(),
});

export type CompareResponse = z.infer<typeof CompareResponseSchema>;
