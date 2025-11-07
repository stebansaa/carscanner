# Development Guide for LLM Collaboration

**Project**: Car Sticker Scanner MVP
**For**: Product specification, see [SPECS.md](./SPECS.md)

---

## 🎯 Core Principles

This codebase is optimized for LLM-assisted development. Follow these rules religiously:

1. **Explicit over implicit** - No magic, no hidden behavior
2. **Small, single-purpose functions** - Max 50 lines per function
3. **Type everything** - Strict TypeScript, no `any`
4. **Schema-first** - Define data shapes with Zod before writing logic
5. **Pure functions preferred** - Side effects isolated and labeled
6. **Self-documenting code** - Clear names + JSDoc for all exports

---

## 🏗️ Project Structure

```
carscanner/
├── src/
│   ├── index.ts              # App entry point
│   ├── routes/               # API endpoints
│   │   ├── scan.ts           # POST /api/scan
│   │   ├── decode.ts         # POST /api/decode
│   │   └── compare.ts        # POST /api/compare
│   ├── services/             # Business logic
│   │   ├── ocr.service.ts    # GPT-4 Vision integration
│   │   ├── vin.service.ts    # VIN decoding
│   │   ├── market.service.ts # Price comparison
│   │   └── score.service.ts  # Deal scoring logic
│   ├── schemas/              # Zod validation schemas
│   │   ├── scan.schema.ts
│   │   ├── vin.schema.ts
│   │   └── market.schema.ts
│   ├── types/                # TypeScript types
│   │   └── index.ts
│   ├── utils/                # Helper functions
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   └── validators.ts
│   └── config/               # Configuration
│       └── env.ts
├── tests/                    # Test files mirror src/
│   └── services/
│       └── ocr.service.test.ts
├── data/                     # Local data/mocks
│   └── mock-market-data.json
├── uploads/                  # Temp image storage
├── .env.example
├── package.json
├── tsconfig.json
├── SPECS.md                  # What we're building
├── CLAUDE.md                 # How we're building (this file)
└── README.md                 # User-facing docs
```

**Rule**: Files should be <300 lines. Split when exceeded.

---

## 📜 Coding Standards

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `ocr.service.ts` |
| Functions | camelCase | `parseVin()` |
| Classes | PascalCase | `MarketService` |
| Constants | UPPER_SNAKE | `MAX_IMAGE_SIZE` |
| Types/Interfaces | PascalCase | `ScanResult` |
| Enums | PascalCase | `DealVerdict` |

### Function Structure

```typescript
/**
 * Brief description of what this does
 *
 * @param param1 - What this parameter is
 * @param param2 - What this parameter is
 * @returns What this returns
 * @throws {ErrorType} When this error occurs
 *
 * @example
 * const result = await functionName(arg1, arg2);
 */
export async function functionName(
  param1: string,
  param2: number
): Promise<ReturnType> {
  // 1. Validate inputs
  // 2. Core logic
  // 3. Return result
}
```

**Rules**:
- All exported functions MUST have JSDoc
- Use descriptive names (avoid abbreviations)
- Single responsibility principle
- Prefer pure functions (input → output, no side effects)

---

## 🔍 Schema-First Development

**Always define schemas before implementation.**

```typescript
// schemas/scan.schema.ts
import { z } from 'zod';

export const ScanRequestSchema = z.object({
  image: z.instanceof(File),
  zipCode: z.string().length(5).optional()
});

export const ScanResponseSchema = z.object({
  vin: z.string().length(17),
  make: z.string(),
  model: z.string(),
  year: z.number().min(1900).max(2030),
  totalPrice: z.number().positive()
});

export type ScanRequest = z.infer<typeof ScanRequestSchema>;
export type ScanResponse = z.infer<typeof ScanResponseSchema>;
```

**Use schemas for**:
- API request/response validation
- Database models
- External API responses
- Configuration

---

## 🛠️ Service Layer Pattern

All business logic lives in `services/`. Each service:
- Has a single responsibility
- Exports pure functions (or a class if stateful)
- Has a corresponding test file

### Example: OCR Service

```typescript
// services/ocr.service.ts
import { OpenAI } from 'openai';
import { StickerData } from '../types';

/**
 * Extracts vehicle data from window sticker image using GPT-4 Vision
 *
 * @param imageBase64 - Base64-encoded image
 * @returns Parsed sticker data
 * @throws {OCRError} If image cannot be processed
 */
export async function extractStickerData(
  imageBase64: string
): Promise<StickerData> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: STICKER_PROMPT },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` }}
      ]
    }],
    max_tokens: 1000
  });

  const rawData = response.choices[0].message.content;
  return parseLLMResponse(rawData);
}

/**
 * Parses LLM JSON response into validated StickerData
 */
function parseLLMResponse(raw: string): StickerData {
  const parsed = JSON.parse(raw);
  return StickerDataSchema.parse(parsed); // Zod validation
}

const STICKER_PROMPT = `
Extract the following from this car window sticker:
- VIN (17 characters)
- Make, Model, Year
- Trim level
- Base MSRP
- Option packages (array of {name, price})
- Total MSRP
- Any dealer add-ons

Return ONLY valid JSON with these keys:
{
  "vin": "...",
  "make": "...",
  "model": "...",
  "year": 2024,
  "trim": "...",
  "basePrice": 0,
  "options": [],
  "totalMSRP": 0,
  "dealerAddOns": []
}
`;
```

---

## 🔀 Route Handlers (Hono)

Keep routes thin - delegate to services.

```typescript
// routes/scan.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ScanRequestSchema } from '../schemas/scan.schema';
import { extractStickerData } from '../services/ocr.service';
import { logger } from '../utils/logger';

const app = new Hono();

app.post('/scan', zValidator('json', ScanRequestSchema), async (c) => {
  try {
    const { image } = c.req.valid('json');

    logger.info('Processing scan request');

    // Convert image to base64
    const base64 = await imageToBase64(image);

    // Extract data
    const stickerData = await extractStickerData(base64);

    logger.info('Scan completed', { vin: stickerData.vin });

    return c.json(stickerData);

  } catch (error) {
    logger.error('Scan failed', { error });
    return c.json({ error: 'Failed to process image' }, 500);
  }
});

export default app;
```

---

## ⚠️ Error Handling

Use custom error classes for clarity.

```typescript
// utils/errors.ts
export class OCRError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'OCRError';
  }
}

export class VINValidationError extends Error {
  constructor(public vin: string) {
    super(`Invalid VIN: ${vin}`);
    this.name = 'VINValidationError';
  }
}

export class MarketDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MarketDataError';
  }
}
```

**Usage**:
```typescript
try {
  const data = await fetchMarketData(vin);
} catch (error) {
  if (error instanceof MarketDataError) {
    // Handle market data issues
  }
  throw error;
}
```

---

## 📝 Logging

Use structured logging (JSON format for production).

```typescript
// utils/logger.ts
export const logger = {
  info: (message: string, meta?: object) => {
    console.log(JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() }));
  },
  error: (message: string, meta?: object) => {
    console.error(JSON.stringify({ level: 'error', message, ...meta, timestamp: new Date().toISOString() }));
  },
  warn: (message: string, meta?: object) => {
    console.warn(JSON.stringify({ level: 'warn', message, ...meta, timestamp: new Date().toISOString() }));
  }
};
```

**Always log**:
- API requests (method, path, status)
- External API calls (service, duration)
- Errors (stack trace, context)
- Business events (scan completed, deal scored)

---

## 🧪 Testing

Use Bun's built-in test runner.

```typescript
// tests/services/ocr.service.test.ts
import { describe, test, expect, mock } from 'bun:test';
import { extractStickerData } from '../../src/services/ocr.service';

describe('OCR Service', () => {
  test('should extract VIN from sticker', async () => {
    const mockImage = 'base64...';

    const result = await extractStickerData(mockImage);

    expect(result.vin).toHaveLength(17);
    expect(result.make).toBeDefined();
  });

  test('should throw OCRError on invalid image', async () => {
    expect(async () => {
      await extractStickerData('invalid');
    }).toThrow(OCRError);
  });
});
```

**Run tests**: `bun test`

---

## 🌍 Environment Variables

```bash
# .env.example
OPENAI_API_KEY=sk-...
NHTSA_API_BASE=https://vpic.nhtsa.dot.gov/api
MARKET_API_KEY=optional
PORT=3000
LOG_LEVEL=info
```

**Load with**:
```typescript
// config/env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  NHTSA_API_BASE: z.string().url(),
  PORT: z.coerce.number().default(3000)
});

export const env = EnvSchema.parse(process.env);
```

---

## 🚀 Running the App

```bash
# Install dependencies
bun install

# Run dev server (with hot reload)
bun run dev

# Run tests
bun test

# Build for production
bun run build

# Run production
bun run start
```

---

## 📦 Dependencies

**Core**:
- `hono` - Web framework
- `zod` - Schema validation
- `openai` - GPT-4 Vision API
- `drizzle-orm` + `better-sqlite3` - Database (if needed)

**Dev**:
- `@types/bun` - TypeScript types
- `prettier` - Code formatting
- `eslint` - Linting

---

## 🤖 LLM Collaboration Tips

### When asking Claude to code:

✅ **Good requests**:
- "Create the OCR service in `services/ocr.service.ts` following CLAUDE.md guidelines"
- "Add Zod schema for market comparison response in `schemas/market.schema.ts`"
- "Write unit tests for the VIN validation function"

❌ **Vague requests**:
- "Add error handling"
- "Make it better"
- "Fix the bug"

### Before committing:

1. Verify file follows structure in this guide
2. Check all exports have JSDoc
3. Run `bun test` to ensure tests pass
4. Validate against schemas where applicable

---

## 🔗 Quick Links

- **Product Specs**: [SPECS.md](./SPECS.md)
- **NHTSA API**: https://vpic.nhtsa.dot.gov/api/
- **OpenAI Vision**: https://platform.openai.com/docs/guides/vision
- **Hono Docs**: https://hono.dev/
- **Zod Docs**: https://zod.dev/

---

**Last Updated**: 2025-11-07
