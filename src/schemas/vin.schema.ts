import { z } from 'zod';

/**
 * Schema for VIN decode request
 */
export const VINDecodeRequestSchema = z.object({
  vin: z.string().length(17),
});

export type VINDecodeRequest = z.infer<typeof VINDecodeRequestSchema>;

/**
 * Schema for official vehicle specs from VIN decode
 */
export const VehicleSpecsSchema = z.object({
  make: z.string(),
  model: z.string(),
  year: z.string().or(z.number()),
  trim: z.string().optional(),
  bodyStyle: z.string().optional(),
  engine: z.string().optional(),
  transmission: z.string().optional(),
  driveTrain: z.string().optional(),
  fuelType: z.string().optional(),
  manufacturer: z.string().optional(),
});

export type VehicleSpecs = z.infer<typeof VehicleSpecsSchema>;

/**
 * Schema for VIN decode response
 */
export const VINDecodeResponseSchema = z.object({
  vin: z.string().length(17),
  official: VehicleSpecsSchema,
  validated: z.boolean(),
  warnings: z.array(z.string()).default([]),
});

export type VINDecodeResponse = z.infer<typeof VINDecodeResponseSchema>;

/**
 * Schema for NHTSA API response (raw)
 * NHTSA returns an array of key-value pairs
 */
export const NHTSAResultSchema = z.object({
  Variable: z.string(),
  Value: z.string().nullable(),
  ValueId: z.string().nullable().optional(),
  VariableId: z.number().optional(),
});

export const NHTSAResponseSchema = z.object({
  Count: z.number(),
  Message: z.string(),
  SearchCriteria: z.string().optional(),
  Results: z.array(NHTSAResultSchema),
});

export type NHTSAResponse = z.infer<typeof NHTSAResponseSchema>;

/**
 * Helper to extract value from NHTSA results array
 */
export function extractNHTSAValue(
  results: z.infer<typeof NHTSAResultSchema>[],
  variableName: string
): string | undefined {
  const result = results.find((r) => r.Variable === variableName);
  return result?.Value || undefined;
}
