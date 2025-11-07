# Car Sticker Scanner MVP

Scan car window stickers → extract specs → compare with market → know if it's a good deal.

## Overview

This API lets users photograph a car's window sticker (Monroney label), extract pricing and specs using AI, decode the VIN, and compare the price against market data to determine if it's a good, fair, or bad deal.

## Features

- **Sticker OCR**: Upload window sticker photo, extract VIN, pricing, and options using GPT-4 Vision
- **VIN Decoding**: Validate and decode VIN using NHTSA's free API
- **Market Comparison**: Compare price with market data (mock data in MVP)
- **Deal Scoring**: Get instant verdict: Great/Good/Fair/Bad deal
- **Negotiation Tips**: Receive AI-powered negotiation recommendations

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono (lightweight, fast)
- **Language**: TypeScript (strict mode)
- **Validation**: Zod
- **OCR**: OpenAI GPT-4 Vision
- **VIN API**: NHTSA vPIC (free)

## Project Structure

```
carscanner/
├── src/
│   ├── index.ts              # App entry point
│   ├── routes/               # API endpoints
│   ├── services/             # Business logic
│   ├── schemas/              # Zod validation
│   ├── types/                # TypeScript types
│   ├── utils/                # Helpers
│   └── config/               # Configuration
├── tests/                    # Test files
├── data/                     # Local data
├── uploads/                  # Temp uploads
├── SPECS.md                  # Product specifications
└── CLAUDE.md                 # Development guide
```

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) installed
- OpenAI API key (for GPT-4 Vision)

### Installation

1. Clone and install:
```bash
git clone <repo-url>
cd carscanner
bun install
```

2. Set up environment:
```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

3. Run development server:
```bash
bun run dev
```

Server starts at `http://localhost:3000`

### Testing

```bash
bun test
```

## API Endpoints

### 1. Scan Sticker

**POST** `/api/scan`

Upload a window sticker image and extract data.

**Request**: `multipart/form-data`
- `image`: File (JPEG/PNG, max 10MB)
- `zipCode`: string (optional, 5 digits)

**Response**:
```json
{
  "scanId": "uuid",
  "status": "success",
  "stickerData": {
    "vin": "1HGCM82633A123456",
    "make": "Honda",
    "model": "Accord",
    "year": 2024,
    "trim": "EX-L",
    "basePrice": 32500,
    "options": [
      {"name": "Premium Audio", "price": 1200}
    ],
    "totalMSRP": 34500,
    "dealerAddOns": [
      {"name": "Paint Protection", "price": 995}
    ],
    "totalPrice": 35495
  },
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/scan \
  -F "image=@sticker.jpg" \
  -F "zipCode=90210"
```

### 2. Decode VIN

**POST** `/api/decode`

Decode a VIN using NHTSA API.

**Request**:
```json
{
  "vin": "1HGCM82633A123456"
}
```

**Response**:
```json
{
  "vin": "1HGCM82633A123456",
  "official": {
    "make": "HONDA",
    "model": "Accord",
    "year": "2024",
    "trim": "EX-L",
    "bodyStyle": "Sedan"
  },
  "validated": true,
  "warnings": []
}
```

**Alternative**: `GET /api/decode/:vin`

### 3. Compare Price

**POST** `/api/compare`

Compare vehicle price with market data.

**Request**:
```json
{
  "make": "Honda",
  "model": "Accord",
  "year": 2024,
  "trim": "EX-L",
  "userPrice": 35495,
  "zipCode": "90210",
  "radius": 50
}
```

**Response**:
```json
{
  "marketData": {
    "avgPrice": 33800,
    "minPrice": 31500,
    "maxPrice": 36200,
    "sampleSize": 12
  },
  "userPrice": 35495,
  "dealScore": -5.0,
  "verdict": "BAD_DEAL",
  "message": "You're paying $1,695 (5.0%) above average market price.",
  "comparables": [
    {
      "price": 33200,
      "dealer": "Sunset Honda",
      "distance": 12,
      "listingUrl": "https://example.com/..."
    }
  ],
  "insights": [
    "Strong negotiating leverage: Show comparable lower prices.",
    "Target price should be around $33,800."
  ],
  "recommendedNegotiation": "Consider negotiating to $33,300..."
}
```

### 4. Health Check

**GET** `/health`

Check API health status.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | - | OpenAI API key for GPT-4 Vision |
| `NHTSA_API_BASE` | No | `https://vpic.nhtsa.dot.gov/api` | NHTSA API base URL |
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `LOG_LEVEL` | No | `info` | Logging level |
| `MAX_IMAGE_SIZE_MB` | No | `10` | Max upload size |

## Development

### Commands

```bash
bun run dev          # Start dev server (hot reload)
bun run start        # Start production server
bun test             # Run tests
bun test:watch       # Run tests in watch mode
bun run typecheck    # Type check without building
bun run format       # Format code with Prettier
bun run lint         # Lint code with ESLint
```

### Code Standards

- Follow guidelines in [CLAUDE.md](./CLAUDE.md)
- All functions must have JSDoc comments
- Use Zod schemas for validation
- Keep functions < 50 lines
- No `any` types
- 100% type coverage

### Adding Features

1. Define schema in `schemas/`
2. Implement service in `services/`
3. Create route in `routes/`
4. Write tests in `tests/`
5. Update this README

## Testing the API

### 1. Test with cURL

```bash
# Scan a sticker
curl -X POST http://localhost:3000/api/scan \
  -F "image=@test-sticker.jpg"

# Decode VIN
curl -X POST http://localhost:3000/api/decode \
  -H "Content-Type: application/json" \
  -d '{"vin":"1HGCM82633A123456"}'

# Compare price
curl -X POST http://localhost:3000/api/compare \
  -H "Content-Type: application/json" \
  -d '{
    "make":"Honda",
    "model":"Accord",
    "year":2024,
    "userPrice":35000,
    "zipCode":"90210"
  }'
```

### 2. Test with JavaScript

```javascript
// Scan sticker
const formData = new FormData();
formData.append('image', file);

const response = await fetch('http://localhost:3000/api/scan', {
  method: 'POST',
  body: formData
});

const data = await response.json();
console.log(data);
```

## Roadmap

### MVP (Current)
- [x] Image upload & OCR
- [x] VIN decoding
- [x] Mock market data
- [x] Deal scoring
- [ ] Basic tests

### Phase 2
- [ ] Real market API integration (MarketCheck)
- [ ] Database for scan history (Bun SQLite)
- [ ] Rate limiting
- [ ] Caching layer

### Phase 3
- [ ] User authentication
- [ ] Mobile app (React Native)
- [ ] Advanced analytics
- [ ] Dealer negotiation tips

## Contributing

See [CLAUDE.md](./CLAUDE.md) for development guidelines.

## License

MIT

## Support

For issues or questions, please open a GitHub issue.
