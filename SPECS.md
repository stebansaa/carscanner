# Car Sticker Scanner MVP - Technical Specifications

**Version**: 0.1.0
**Last Updated**: 2025-11-07

---

## 📋 Project Overview

**Goal**: Let users scan/photograph a car's window sticker → extract specs & pricing → compare with market → show if it's a good deal.

**Target Users**: Car buyers at dealerships or browsing online listings

**Core Value Prop**: Instant deal validation without manual data entry

---

## 🎯 MVP Scope

### In Scope
- Window sticker image upload (via API endpoint)
- OCR + LLM parsing of sticker data
- VIN decoding and validation
- Market price comparison (using free/trial APIs)
- Deal score calculation
- JSON API responses

### Out of Scope (Post-MVP)
- Mobile app (iOS/Android)
- User accounts / authentication
- Saving scan history
- Push notifications
- Advanced dealer negotiation tips
- Real-time market tracking

---

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │  (Image upload)
└──────┬──────┘
       │
       v
┌─────────────────────────────────────┐
│     API Server (Bun + Hono)         │
│  - /scan (POST image)               │
│  - /decode (POST VIN)               │
│  - /compare (POST specs)            │
└──────┬──────────────────────────────┘
       │
       ├─> OCR Service (GPT-4 Vision)
       ├─> VIN Decoder (NHTSA vPIC)
       ├─> Market API (MarketCheck/similar)
       └─> Database (SQLite)
```

---

## 📦 Core Features

### 1. Sticker Scanner (`/api/scan`)

**Input**: Image file (JPEG/PNG, max 10MB)

**Process**:
1. Upload to temp storage
2. Send to GPT-4 Vision API with prompt:
   ```
   Extract from this car window sticker:
   - VIN
   - Make, Model, Year
   - Trim/Engine
   - Base MSRP
   - Option packages (name + price)
   - Total MSRP
   - Any dealer markups/add-ons

   Return as JSON with these exact keys.
   ```
3. Parse LLM response into structured data
4. Validate VIN format (17 chars, alphanumeric)

**Output**:
```json
{
  "vin": "1HGCM82633A123456",
  "make": "Honda",
  "model": "Accord",
  "year": 2024,
  "trim": "EX-L",
  "basePrice": 32500,
  "options": [
    {"name": "Premium Audio", "price": 1200},
    {"name": "Sunroof", "price": 800}
  ],
  "totalMSRP": 34500,
  "dealerAddOns": [
    {"name": "Paint Protection", "price": 995}
  ],
  "totalPrice": 35495
}
```

### 2. VIN Decoder (`/api/decode`)

**Input**: VIN string

**Process**:
1. Call NHTSA vPIC API: `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{VIN}?format=json`
2. Extract official specs: make, model, year, trim, body style
3. Validate against OCR data (flag discrepancies)

**Output**:
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
  "validated": true
}
```

### 3. Market Comparison (`/api/compare`)

**Input**: Normalized vehicle specs + zip code

**Process**:
1. Query pricing API (MarketCheck or mock data for MVP)
   - Filters: same make/model/year/trim, within 50mi radius
2. Calculate statistics:
   - Average market price
   - Min/max range
   - Median
3. Compare user's price to market
4. Generate verdict

**Output**:
```json
{
  "marketData": {
    "avgPrice": 33800,
    "minPrice": 31500,
    "maxPrice": 36200,
    "sampleSize": 12,
    "radius": 50
  },
  "userPrice": 35495,
  "dealScore": -5.0,
  "verdict": "BAD_DEAL",
  "message": "You're paying $1,695 above average market price",
  "comparables": [
    {
      "price": 33200,
      "dealer": "ABC Motors",
      "distance": 12,
      "listingUrl": "https://example.com/..."
    }
  ]
}
```

### 4. Deal Score Logic

```typescript
dealScore = ((marketAvg - userPrice) / marketAvg) * 100

Verdicts:
- GREAT_DEAL: score > 10%
- GOOD_DEAL: score 5-10%
- FAIR_DEAL: score -5 to 5%
- BAD_DEAL: score < -5%
```

---

## 🔌 External APIs

### Required

| Service | Purpose | Cost | Endpoint |
|---------|---------|------|----------|
| OpenAI GPT-4 Vision | OCR + parsing | ~$0.01/image | `https://api.openai.com/v1/chat/completions` |
| NHTSA vPIC | VIN decoding | Free | `https://vpic.nhtsa.dot.gov/api/` |

### Optional (can mock for MVP)

| Service | Purpose | Cost |
|---------|---------|------|
| MarketCheck API | Market pricing | $99/mo trial |
| AWS Textract | Fallback OCR | Pay-per-use |

---

## 🗄️ Data Models

### Scan Record

```typescript
{
  id: string            // UUID
  createdAt: string     // ISO timestamp
  imageUrl: string      // S3/local path
  vin: string
  parsedData: {         // From OCR
    make: string
    model: string
    year: number
    trim: string
    totalPrice: number
    options: Array<{name: string, price: number}>
  }
  marketData: {         // From comparison
    avgPrice: number
    dealScore: number
    verdict: string
  }
  status: 'pending' | 'completed' | 'failed'
}
```

---

## 🚦 MVP Success Metrics

- **OCR Accuracy**: >85% correct VIN extraction
- **API Response Time**: <5 seconds end-to-end
- **Deal Score Accuracy**: Within 10% of manual calculation
- **Error Handling**: Graceful fallback for bad images

---

## 🔐 Security & Privacy

- No user authentication (stateless API for MVP)
- Images deleted after processing (or 24hr TTL)
- No PII storage beyond VIN
- Rate limiting: 10 requests/IP/hour

---

## 🛠️ Development Phases

### Phase 1: Core Scanning (Week 1)
- [x] Project setup
- [ ] Image upload endpoint
- [ ] GPT-4 Vision integration
- [ ] Basic VIN validation

### Phase 2: VIN + Market (Week 2)
- [ ] NHTSA API integration
- [ ] Mock market data generator
- [ ] Deal score calculation

### Phase 3: Polish (Week 3)
- [ ] Error handling
- [ ] Logging
- [ ] Basic frontend (upload form)
- [ ] Testing with real stickers

---

## 📚 References

- [NHTSA vPIC API Docs](https://vpic.nhtsa.dot.gov/api/)
- [OpenAI Vision Guide](https://platform.openai.com/docs/guides/vision)
- [MarketCheck API](https://www.marketcheck.com/automotive/api)

---

**Next Steps**: See [CLAUDE.md](./CLAUDE.md) for development guidelines.
