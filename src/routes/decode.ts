import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { logger } from '../utils/logger';
import { decodeVIN } from '../services/vin.service';
import { VINDecodeRequestSchema } from '../schemas/vin.schema';
import { VINValidationError, VINDecodeError } from '../utils/errors';

const app = new Hono();

/**
 * POST /api/decode
 * Decodes a VIN using NHTSA API
 *
 * Request: { vin: string }
 * Response: VINDecodeResponse
 */
app.post('/', zValidator('json', VINDecodeRequestSchema), async (c) => {
  try {
    const { vin } = c.req.valid('json');

    logger.info('VIN decode request', { vin });

    const result = await decodeVIN(vin);

    logger.info('VIN decode successful', {
      vin,
      make: result.official.make,
      validated: result.validated,
    });

    return c.json(result);
  } catch (error) {
    logger.error('VIN decode failed', { error });

    if (error instanceof VINValidationError) {
      return c.json(
        {
          error: 'Invalid VIN',
          message: error.message,
        },
        400
      );
    }

    if (error instanceof VINDecodeError) {
      return c.json(
        {
          error: 'VIN decode failed',
          message: error.message,
        },
        500
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
 * GET /api/decode/:vin
 * Decodes a VIN using path parameter (alternative endpoint)
 */
app.get('/:vin', async (c) => {
  try {
    const vin = c.req.param('vin');

    if (!vin || vin.length !== 17) {
      return c.json(
        {
          error: 'Invalid VIN',
          message: 'VIN must be exactly 17 characters',
        },
        400
      );
    }

    logger.info('VIN decode request (GET)', { vin });

    const result = await decodeVIN(vin);

    return c.json(result);
  } catch (error) {
    logger.error('VIN decode failed', { error });

    if (error instanceof VINValidationError) {
      return c.json(
        {
          error: 'Invalid VIN',
          message: error.message,
        },
        400
      );
    }

    return c.json(
      {
        error: 'VIN decode failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/decode/health
 * Health check endpoint
 */
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'decode' });
});

export default app;
