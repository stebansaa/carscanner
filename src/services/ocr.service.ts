import OpenAI from 'openai';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { OCRError } from '../utils/errors';
import {
  StickerDataSchema,
  RawLLMResponseSchema,
  type StickerData,
} from '../schemas/scan.schema';

/**
 * GPT-4 Vision prompt for extracting sticker data
 */
const STICKER_EXTRACTION_PROMPT = `
You are an expert at extracting data from car window stickers (Monroney labels).

Extract the following information from this car window sticker image:
- VIN (17 characters)
- Make, Model, Year
- Trim level and engine description
- Base MSRP (manufacturer's suggested retail price)
- Option packages (array of name and price)
- Total MSRP
- Any dealer add-ons or markups (not from manufacturer)

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
  "vin": "17-character VIN",
  "make": "Honda",
  "model": "Accord",
  "year": 2024,
  "trim": "EX-L",
  "engine": "2.0L Turbo",
  "basePrice": 32500,
  "options": [
    {"name": "Premium Audio Package", "price": 1200},
    {"name": "Sunroof", "price": 800}
  ],
  "totalMSRP": 34500,
  "dealerAddOns": [
    {"name": "Paint Protection Film", "price": 995}
  ],
  "totalPrice": 35495
}

Important:
- VIN must be exactly 17 characters
- All prices should be numbers (not strings)
- If a field is not visible, use best guess or omit optional fields
- Dealer add-ons are items NOT listed in the manufacturer's options
- totalPrice = totalMSRP + sum of dealer add-ons
`.trim();

/**
 * Extracts vehicle data from window sticker image using GPT-4 Vision
 *
 * @param imageBase64 - Base64-encoded image data (with or without data URL prefix)
 * @returns Parsed and validated sticker data
 * @throws {OCRError} If extraction or parsing fails
 *
 * @example
 * const base64 = await Bun.file('sticker.jpg').text();
 * const data = await extractStickerData(base64);
 */
export async function extractStickerData(
  imageBase64: string
): Promise<StickerData> {
  try {
    logger.info('Starting OCR extraction');

    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    // Ensure base64 has proper data URL prefix
    const imageUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: STICKER_EXTRACTION_PROMPT },
            {
              type: 'image_url',
              image_url: { url: imageUrl, detail: 'high' },
            },
          ],
        },
      ],
      max_tokens: 1500,
      temperature: 0.1, // Low temperature for consistency
    });

    const rawText = response.choices[0]?.message?.content;

    if (!rawText) {
      throw new OCRError('No response from GPT-4 Vision');
    }

    logger.debug('Raw LLM response', { rawText });

    // Parse and validate response
    const parsedData = parseLLMResponse(rawText);

    logger.info('OCR extraction successful', { vin: parsedData.vin });

    return parsedData;
  } catch (error) {
    logger.error('OCR extraction failed', { error });

    if (error instanceof OCRError) {
      throw error;
    }

    throw new OCRError('Failed to extract sticker data', error);
  }
}

/**
 * Parses and validates LLM JSON response
 *
 * @param rawText - Raw text response from LLM
 * @returns Validated sticker data
 * @throws {OCRError} If parsing or validation fails
 */
function parseLLMResponse(rawText: string): StickerData {
  try {
    // Remove markdown code blocks if present
    let cleaned = rawText.trim();
    cleaned = cleaned.replace(/^```json\s*/i, '');
    cleaned = cleaned.replace(/^```\s*/i, '');
    cleaned = cleaned.replace(/```\s*$/i, '');
    cleaned = cleaned.trim();

    // Parse JSON
    const parsed = JSON.parse(cleaned);

    // First pass: validate raw response (handles string-to-number conversion)
    const rawValidated = RawLLMResponseSchema.parse(parsed);

    // Second pass: validate final structure
    const finalValidated = StickerDataSchema.parse(rawValidated);

    return finalValidated;
  } catch (error) {
    logger.error('Failed to parse LLM response', { error, rawText });
    throw new OCRError('Invalid response format from OCR', error);
  }
}

/**
 * Converts image file to base64 string
 *
 * @param file - Bun File object
 * @returns Base64-encoded string (without data URL prefix)
 */
export async function imageToBase64(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
  } catch (error) {
    throw new OCRError('Failed to convert image to base64', error);
  }
}
