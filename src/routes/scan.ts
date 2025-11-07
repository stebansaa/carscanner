import { Hono } from 'hono';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import { extractStickerData, imageToBase64 } from '../services/ocr.service';
import { validateImageType, validateImageSize } from '../utils/validators';
import { env } from '../config/env';
import type { ScanResponse } from '../types';

const app = new Hono();

/**
 * POST /api/scan
 * Scans a car window sticker image and extracts data
 *
 * Request: multipart/form-data
 *  - image: File (required)
 *  - zipCode: string (optional, 5 digits)
 *
 * Response: ScanResponse
 */
app.post('/', async (c) => {
  const scanId = randomUUID();

  try {
    logger.info('Scan request received', { scanId });

    // Get form data
    const formData = await c.req.formData();
    const imageFile = formData.get('image') as File | null;
    // const zipCode = formData.get('zipCode') as string | null; // TODO: Use for location-based features

    // Validate image file exists
    if (!imageFile) {
      logger.warn('No image file provided', { scanId });
      return c.json(
        {
          error: 'Image file is required',
        },
        400
      );
    }

    // Validate image type
    try {
      validateImageType(imageFile.type);
    } catch (error) {
      logger.warn('Invalid image type', { scanId, type: imageFile.type });
      return c.json(
        {
          error: error instanceof Error ? error.message : 'Invalid image type',
        },
        400
      );
    }

    // Validate image size
    try {
      validateImageSize(imageFile.size, env.MAX_IMAGE_SIZE_MB);
    } catch (error) {
      logger.warn('Image too large', { scanId, size: imageFile.size });
      return c.json(
        {
          error: error instanceof Error ? error.message : 'Image too large',
        },
        400
      );
    }

    logger.info('Image validated', {
      scanId,
      size: imageFile.size,
      type: imageFile.type,
    });

    // Convert image to base64
    const base64 = await imageToBase64(imageFile);

    // Extract sticker data using OCR
    const stickerData = await extractStickerData(base64);

    logger.info('Scan completed successfully', {
      scanId,
      vin: stickerData.vin,
    });

    const response: ScanResponse = {
      scanId,
      status: 'success',
      stickerData,
      createdAt: new Date().toISOString(),
    };

    return c.json(response);
  } catch (error) {
    logger.error('Scan failed', { scanId, error });

    const response: ScanResponse = {
      scanId,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      createdAt: new Date().toISOString(),
    };

    return c.json(response, 500);
  }
});

/**
 * GET /api/scan/health
 * Health check endpoint
 */
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'scan' });
});

export default app;
