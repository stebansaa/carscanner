import { logger } from '../utils/logger';
import { DealVerdict, type MarketData, type ScoreResult } from '../types';

/**
 * Calculates deal score based on user price vs market average
 *
 * Formula: ((marketAvg - userPrice) / marketAvg) * 100
 *
 * Positive score = below market average (good deal)
 * Negative score = above market average (bad deal)
 *
 * @param userPrice - Price user is paying
 * @param marketData - Market statistics
 * @returns Deal score and verdict
 *
 * @example
 * const score = calculateDealScore(35000, { avgPrice: 33000, ... });
 * // score.dealScore = -6.06 (paying 6% above average)
 * // score.verdict = 'BAD_DEAL'
 */
export function calculateDealScore(
  userPrice: number,
  marketData: MarketData
): ScoreResult {
  const { avgPrice } = marketData;

  // Calculate percentage difference from average
  const dealScore = ((avgPrice - userPrice) / avgPrice) * 100;

  // Determine verdict
  const verdict = getDealVerdict(dealScore);

  // Generate message
  const message = generateDealMessage(userPrice, avgPrice, dealScore, verdict);

  // Generate insights
  const insights = generateInsights(userPrice, marketData, dealScore);

  logger.info('Deal score calculated', { userPrice, avgPrice, dealScore, verdict });

  return {
    dealScore: Math.round(dealScore * 100) / 100, // Round to 2 decimals
    verdict,
    message,
    insights,
  };
}

/**
 * Determines deal verdict based on score
 *
 * Thresholds:
 * - GREAT_DEAL: >10% below average
 * - GOOD_DEAL: 5-10% below average
 * - FAIR_DEAL: ±5% of average
 * - BAD_DEAL: >5% above average
 */
function getDealVerdict(score: number): DealVerdict {
  if (score > 10) return DealVerdict.GREAT_DEAL;
  if (score > 5) return DealVerdict.GOOD_DEAL;
  if (score >= -5) return DealVerdict.FAIR_DEAL;
  return DealVerdict.BAD_DEAL;
}

/**
 * Generates human-readable deal message
 */
function generateDealMessage(
  userPrice: number,
  avgPrice: number,
  score: number,
  verdict: DealVerdict
): string {
  const difference = Math.abs(userPrice - avgPrice);
  const formattedDiff = formatCurrency(difference);
  const formattedScore = Math.abs(score).toFixed(1);

  switch (verdict) {
    case DealVerdict.GREAT_DEAL:
      return `Excellent deal! You're paying ${formattedDiff} (${formattedScore}%) below average market price.`;

    case DealVerdict.GOOD_DEAL:
      return `Good deal! You're paying ${formattedDiff} (${formattedScore}%) below average market price.`;

    case DealVerdict.FAIR_DEAL:
      if (score > 0) {
        return `Fair deal. You're paying ${formattedDiff} (${formattedScore}%) below average market price.`;
      } else if (score < 0) {
        return `Fair deal. You're paying ${formattedDiff} (${formattedScore}%) above average market price.`;
      }
      return 'Fair deal. Price is at average market value.';

    case DealVerdict.BAD_DEAL:
      return `You're paying ${formattedDiff} (${formattedScore}%) above average market price. Consider negotiating.`;

    default:
      return 'Unable to determine deal quality.';
  }
}

/**
 * Generates insights and recommendations
 */
function generateInsights(
  userPrice: number,
  marketData: MarketData,
  score: number
): string[] {
  const insights: string[] = [];

  // Price position insights
  if (userPrice <= marketData.minPrice) {
    insights.push('This is the lowest price found in the market.');
  } else if (userPrice >= marketData.maxPrice) {
    insights.push('This is the highest price found in the market.');
  }

  // Sample size insights
  if (marketData.sampleSize < 5) {
    insights.push(
      'Limited data available. Consider expanding search radius for better comparison.'
    );
  } else if (marketData.sampleSize > 20) {
    insights.push('Comprehensive market data available for reliable comparison.');
  }

  // Negotiation tips
  if (score < -5) {
    insights.push('Strong negotiating leverage: Show comparable lower prices.');
    insights.push(`Target price should be around ${formatCurrency(marketData.avgPrice)}.`);
  } else if (score > 10) {
    insights.push('This price is significantly below market - verify vehicle condition.');
  }

  // Median vs average comparison
  if (marketData.medianPrice) {
    const medianDiff = userPrice - marketData.medianPrice;
    if (Math.abs(medianDiff) > marketData.avgPrice * 0.05) {
      if (medianDiff < 0) {
        insights.push(
          `Price is below median (${formatCurrency(marketData.medianPrice)}), indicating a better deal than most.`
        );
      } else {
        insights.push(
          `Price is above median (${formatCurrency(marketData.medianPrice)}), indicating most buyers pay less.`
        );
      }
    }
  }

  return insights;
}

/**
 * Formats number as currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculates recommended negotiation target price
 *
 * @param marketData - Market statistics
 * @param aggressiveness - How aggressive to negotiate (0-1)
 * @returns Target price
 */
export function getTargetPrice(
  marketData: MarketData,
  aggressiveness: number = 0.5
): number {
  const { avgPrice, minPrice } = marketData;

  // Target between min and avg based on aggressiveness
  const range = avgPrice - minPrice;
  const targetDiscount = range * aggressiveness;

  return Math.round(avgPrice - targetDiscount);
}

/**
 * Generates negotiation recommendation text
 *
 * @param userPrice - Current asking price
 * @param marketData - Market data
 * @returns Negotiation advice
 */
export function generateNegotiationAdvice(
  userPrice: number,
  marketData: MarketData
): string | undefined {
  const targetPrice = getTargetPrice(marketData, 0.6); // 60% aggressive

  if (userPrice <= targetPrice) {
    return undefined; // Already at or below target
  }

  const savings = userPrice - targetPrice;

  return `Consider negotiating to ${formatCurrency(targetPrice)} (save ${formatCurrency(savings)}). ` +
    `Use comparable listings as leverage. Start your offer at ${formatCurrency(targetPrice - 500)}.`;
}
