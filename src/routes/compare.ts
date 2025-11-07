import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { logger } from '../utils/logger';
import { getMarketComparison } from '../services/market.service';
import {
  calculateDealScore,
  generateNegotiationAdvice,
} from '../services/score.service';
import { CompareRequestSchema, type CompareResponse } from '../schemas/market.schema';
import { MarketDataError } from '../utils/errors';

const app = new Hono();

/**
 * POST /api/compare
 * Compares vehicle price with market data
 *
 * Request: CompareRequest
 * Response: CompareResponse
 */
app.post('/', zValidator('json', CompareRequestSchema), async (c) => {
  try {
    const request = c.req.valid('json');

    logger.info('Market comparison request', {
      make: request.make,
      model: request.model,
      year: request.year,
      userPrice: request.userPrice,
    });

    // Fetch market data
    const { marketData, comparables } = await getMarketComparison(request);

    // Calculate deal score
    const scoreResult = calculateDealScore(request.userPrice, marketData);

    // Generate negotiation advice
    const negotiationAdvice = generateNegotiationAdvice(
      request.userPrice,
      marketData
    );

    logger.info('Market comparison completed', {
      dealScore: scoreResult.dealScore,
      verdict: scoreResult.verdict,
      sampleSize: marketData.sampleSize,
    });

    const response: CompareResponse = {
      marketData,
      userPrice: request.userPrice,
      dealScore: scoreResult.dealScore,
      verdict: scoreResult.verdict,
      message: scoreResult.message,
      comparables,
      insights: scoreResult.insights,
      recommendedNegotiation: negotiationAdvice,
    };

    return c.json(response);
  } catch (error) {
    logger.error('Market comparison failed', { error });

    if (error instanceof MarketDataError) {
      return c.json(
        {
          error: 'Market data unavailable',
          message: error.message,
        },
        503
      );
    }

    return c.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/compare/health
 * Health check endpoint
 */
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'compare' });
});

export default app;
