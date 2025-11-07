import { env, isDev } from '../config/env';
import { logger } from '../utils/logger';
import { MarketDataError } from '../utils/errors';
import type {
  ComparableListing,
  MarketData,
  CompareRequest,
} from '../schemas/market.schema';

/**
 * Fetches market comparison data for a vehicle
 *
 * @param request - Comparison request with vehicle specs
 * @returns Market data and comparable listings
 * @throws {MarketDataError} If data fetch fails
 *
 * @example
 * const result = await getMarketComparison({
 *   make: 'Honda',
 *   model: 'Accord',
 *   year: 2024,
 *   trim: 'EX-L',
 *   userPrice: 35000,
 *   zipCode: '90210',
 *   radius: 50
 * });
 */
export async function getMarketComparison(
  request: CompareRequest
): Promise<{
  marketData: MarketData;
  comparables: ComparableListing[];
}> {
  try {
    logger.info('Fetching market comparison', {
      make: request.make,
      model: request.model,
      year: request.year,
    });

    // For MVP, use mock data if no API key provided or in dev mode
    if (!env.MARKET_API_KEY || isDev) {
      logger.warn('Using mock market data (no API key or dev mode)');
      return getMockMarketData(request);
    }

    // TODO: Implement real market API integration (MarketCheck, Edmunds, etc.)
    // For now, fall back to mock data
    return getMockMarketData(request);
  } catch (error) {
    logger.error('Market comparison failed', { error, request });
    throw new MarketDataError('Failed to fetch market data', error);
  }
}

/**
 * Generates realistic mock market data for testing
 *
 * @param request - Comparison request
 * @returns Mock market data
 */
function getMockMarketData(request: CompareRequest): {
  marketData: MarketData;
  comparables: ComparableListing[];
} {
  // Generate random variance around user price
  const basePrice = request.userPrice;
  const variance = basePrice * 0.15; // ±15% variance

  // Generate 5-12 comparable listings
  const numComparables = Math.floor(Math.random() * 8) + 5;
  const prices: number[] = [];

  const comparables: ComparableListing[] = Array.from(
    { length: numComparables },
    (_, i) => {
      // Price distribution: mostly around average, some outliers
      const offset = (Math.random() - 0.5) * 2 * variance;
      const price = Math.round(basePrice + offset);
      prices.push(price);

      return {
        price,
        dealer: `${getDealerName()} ${request.make}`,
        dealerType: Math.random() > 0.7 ? 'independent' : 'franchise',
        distance: Math.round(Math.random() * request.radius),
        mileage: Math.round(Math.random() * 5000), // Assume new or low mileage
        year: request.year,
        trim: request.trim,
        listingUrl: `https://example.com/listing-${i + 1}`,
        daysOnMarket: Math.round(Math.random() * 90),
      };
    }
  );

  // Calculate market statistics
  const avgPrice = Math.round(
    prices.reduce((sum, p) => sum + p, 0) / prices.length
  );
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // Calculate median
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const medianPrice =
    sortedPrices.length % 2 === 0
      ? Math.round(
          (sortedPrices[sortedPrices.length / 2 - 1] +
            sortedPrices[sortedPrices.length / 2]) /
            2
        )
      : sortedPrices[Math.floor(sortedPrices.length / 2)];

  const marketData: MarketData = {
    avgPrice,
    minPrice,
    maxPrice,
    medianPrice,
    sampleSize: numComparables,
    radius: request.radius,
    zipCode: request.zipCode,
  };

  logger.info('Mock market data generated', { avgPrice, sampleSize: numComparables });

  return {
    marketData,
    comparables: comparables
      .sort((a, b) => a.price - b.price) // Sort by price ascending
      .slice(0, 10), // Return top 10 best deals
  };
}

/**
 * Returns random dealer name
 */
function getDealerName(): string {
  const names = [
    'Sunset',
    'Pacific',
    'Premium',
    'Elite',
    'Valley',
    'Metro',
    'Coastal',
    'Central',
    'Northside',
    'Southbay',
  ];
  return names[Math.floor(Math.random() * names.length)];
}

/**
 * Calculates average price from market data
 *
 * @param comparables - Array of comparable listings
 * @returns Average price
 */
export function calculateAveragePrice(comparables: ComparableListing[]): number {
  if (comparables.length === 0) {
    throw new MarketDataError('No comparable listings found');
  }

  const total = comparables.reduce((sum, listing) => sum + listing.price, 0);
  return Math.round(total / comparables.length);
}

/**
 * Filters comparables by criteria
 *
 * @param comparables - All listings
 * @param maxDistance - Maximum distance in miles
 * @param maxDaysOnMarket - Maximum days on market
 * @returns Filtered listings
 */
export function filterComparables(
  comparables: ComparableListing[],
  maxDistance?: number,
  maxDaysOnMarket?: number
): ComparableListing[] {
  return comparables.filter((listing) => {
    if (maxDistance && listing.distance && listing.distance > maxDistance) {
      return false;
    }

    if (
      maxDaysOnMarket &&
      listing.daysOnMarket &&
      listing.daysOnMarket > maxDaysOnMarket
    ) {
      return false;
    }

    return true;
  });
}
