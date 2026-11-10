# EasyDrive REST API Reference

> **Base URL:** `http://localhost:5000` (configured via `PORT` in `server/.env`)  
> **Content-Type:** All requests and responses use `application/json`.  
> **Auth:** Protected routes require `Authorization: Bearer <token>` header.

---

## Response Envelope

Every endpoint returns the same shape:

```jsonc
// Success
{ "success": true, "data": { ... } }

// Validation error
{ "success": false, "message": "Validation failed", "errors": [{ "field": "aadhaar", "message": "..." }] }

// Business error (with optional stable code)
{ "success": false, "code": "CAR_NOT_AVAILABLE", "message": "..." }
```

HTTP status codes used: `200`, `201`, `400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`.

---

## Rate Limiting

| Scope | Limit |
|---|---|
| `POST /api/auth/*` | **10 requests / 15 min / IP** |
| All other routes | Unlimited |

---

## Endpoints

### `GET /api/health`

Server liveness check. No auth required.

**Response `200`**
```json
{
  "success": true,
  "data": { "status": "ok", "timestamp": "2026-10-26T00:00:00.000Z" }
}
```

---

### Auth — `/api/auth`

#### `POST /api/auth/register`

Create a new user account and receive a JWT.

**Request body**

| Field | Type | Rules |
|---|---|---|
| `name` | string | Required, 1–100 chars |
| `email` | string | Required, valid email |
| `password` | string | Required, min 8 chars |

> [!NOTE]
> There is **no `phone` field** in registration. The spec does not include it.

**Response `201`**
```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "user": { "_id": "...", "name": "...", "email": "..." }
  }
}
```

**Errors**

| Status | Condition |
|---|---|
| `422` | Validation failed (missing / invalid field) |
| `409` | Email already registered |

---

#### `POST /api/auth/login`

Authenticate an existing user.

**Request body**

| Field | Type |
|---|---|
| `email` | string |
| `password` | string |

**Response `200`** — same shape as register.

**Errors**

| Status | Condition |
|---|---|
| `422` | Missing fields |
| `401` | Wrong email or password |

---

#### `GET /api/auth/me`  *(Protected)*

Returns the authenticated user's profile. `passwordHash` is never returned.

**Response `200`**
```json
{
  "success": true,
  "data": { "user": { "_id": "...", "name": "...", "email": "..." } }
}
```

---

### Cars — `/api/cars`

#### `GET /api/cars`

Returns the full fleet, optionally filtered and sorted.

**Query parameters**

| Parameter | Alias | Values | Notes |
|---|---|---|---|
| `city` | — | City name string | Filter by `Car.cities[]` membership |
| `type` | `category` | `Hatchback` \| `Sedan` \| `SUV` \| `MPV` \| `EV` \| `Luxury` | Case-sensitive |
| `search` | `q` | Any string | Case-insensitive search across brand, name, type |
| `sortBy` | `sort` | `featured` \| `price_asc` \| `price-asc` \| `price_desc` \| `price-desc` \| `rating` | Default: `featured` |

> [!NOTE]
> The aliases (`category`, `q`, `sort`, `price_asc`, `price_desc`) are accepted identically to the primary names. An invalid `sortBy`/`sort` value returns `422`.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "cars": [ { "slug": "maruti-swift", "brand": "Maruti Suzuki", ... } ]
  }
}
```

---

#### `GET /api/cars/:slug`

Returns a single car by its slug.

**Response `200`**
```json
{ "success": true, "data": { "car": { ... } } }
```

**Errors**

| Status | Condition |
|---|---|
| `404` | Slug not found |

---

#### `GET /api/cars/:slug/booked-dates`

Returns future confirmed booking windows for this car (used to block unavailable dates in the frontend datepicker).

**Response `200`**
```json
{
  "success": true,
  "data": {
    "bookedDates": [
      { "startDate": "2026-11-01", "endDate": "2026-11-05" }
    ]
  }
}
```

**Errors**

| Status | Condition |
|---|---|
| `404` | Slug not found |

---

### Bookings — `/api/bookings`

All booking endpoints require authentication (`Authorization: Bearer <token>`).

#### `POST /api/bookings`  *(Protected)*

Create a new car reservation.

**Request body**

| Field | Type | Rules |
|---|---|---|
| `carSlug` | string | Required — must match a car in MongoDB |
| `pickupCity` | string | Required — must be one of the 8 supported cities (see §Cities) |
| `pickupLocation` | string | Required — must be one of the hubs for `pickupCity` (see §Cities) |
| `startDate` | string | Required — ISO `YYYY-MM-DD`, must not be in the past (Asia/Kolkata) |
| `endDate` | string | Required — ISO `YYYY-MM-DD`, must be at least 1 day after `startDate`, at most 30 days |
| `aadhaar` | string | Required — 12 digits, first digit must be 2–9 (format check only, never stored in full) |
| `dl` | string | Required — alphanumeric, 4–20 chars, no hyphens/spaces (only last 4 stored) |

> [!IMPORTANT]
> **Privacy rules (enforced server-side, never bypassed):**
> - Full Aadhaar is never logged, stored, or returned. Only `aadhaarLast4` (`aadhaar.slice(-4)`) is persisted.
> - Full DL is never logged, stored, or returned. Only `dlLast4` (`dl.slice(-4).toUpperCase()`) is persisted.

> [!WARNING]
> **Car availability check:** The car must have `isAvailable: true` AND include `pickupCity` in its `cities[]` array. Booking a car in a city it does not serve (e.g., `mahindra-thar` in Kolkata) returns `422` with `code: "CAR_NOT_AVAILABLE"`.

**Validation errors `422`**

| Code | Condition |
|---|---|
| `VALIDATION_ERROR` | Invalid `pickupCity` — not one of the 8 supported cities |
| `VALIDATION_ERROR` | Invalid `pickupLocation` — not a valid hub for the given city |
| `VALIDATION_ERROR` | `startDate` is today or in the past (Asia/Kolkata time) |
| `VALIDATION_ERROR` | `endDate` is not at least 1 day after `startDate` |
| `VALIDATION_ERROR` | Rental duration exceeds 30 days |
| `VALIDATION_ERROR` | `aadhaar` is not 12 digits or first digit is 0 or 1 |
| `VALIDATION_ERROR` | `dl` format invalid |
| `CAR_NOT_AVAILABLE` | Car is inactive or does not serve `pickupCity` |

**Conflict error `409`**

| Code | Condition |
|---|---|
| `CAR_NOT_AVAILABLE` | Car already has a confirmed/active booking overlapping the requested dates |

Overlap predicate: `existingStart < requestedEnd && existingEnd > requestedStart`.

**Response `201`**
```json
{
  "success": true,
  "data": {
    "booking": {
      "bookingReference": "ED-2610-A3F7",
      "carSlug": "maruti-swift",
      "carName": "Maruti Suzuki Swift ZXi+",
      "pickupCity": "Mumbai",
      "pickupLocation": "CSMIA Airport (T2)",
      "startDate": "2026-11-01",
      "endDate": "2026-11-04",
      "durationDays": 3,
      "pricePerDay": 1399,
      "subtotal": 4197,
      "taxAmount": 755,
      "totalCost": 4952,
      "paymentStatus": "pending",
      "status": "confirmed",
      "aadhaarLast4": "1234",
      "dlLast4": "AB12",
      "createdAt": "2026-10-26T00:00:00.000Z"
    }
  }
}
```

> [!NOTE]
> **Pricing is always whole rupees (integers):**
> - `subtotal = durationDays × pricePerDay`
> - `taxAmount = Math.round(subtotal × TAX_RATE)` (TAX_RATE from env, default 0.18)
> - `totalCost = subtotal + taxAmount`
> - `paymentStatus` defaults to `"pending"`.

---

#### `GET /api/bookings/mine`  *(Protected)*

Returns all bookings belonging to the authenticated user, newest first.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "bookings": [ { "bookingReference": "ED-2610-A3F7", ... } ]
  }
}
```

---

#### `GET /api/bookings/:reference`  *(Protected)*

Returns a single booking by its reference string. Only the booking owner can access it.

**Response `200`**
```json
{ "success": true, "data": { "booking": { ... } } }
```

**Errors**

| Status | Condition |
|---|---|
| `404` | Reference not found or does not belong to the authenticated user |

---

## Booking Reference Format

```
ED-YYMM-XXXX
```

| Segment | Meaning | Example |
|---|---|---|
| `ED` | Fixed prefix | `ED` |
| `YY` | 2-digit year | `26` (for 2026) |
| `MM` | 2-digit month (zero-padded) | `10` (October) |
| `XXXX` | 4 uppercase hex chars (random, collision-checked) | `A3F7` |

Full example: **`ED-2610-A3F7`**

---

## Cities & Canonical Pickup Hubs

Defined in `server/config/hubs.js`. `pickupCity` and `pickupLocation` must exactly match these strings (case-sensitive).

| City | Hub 1 | Hub 2 | Hub 3 |
|---|---|---|---|
| `Delhi NCR` | `IGI Airport T3` | `New Delhi Station` | `Connaught Place` |
| `Mumbai` | `CSMIA Airport (T2)` | `BKC` | `Mumbai Central` |
| `Bengaluru` | `KIA Airport` | `Majestic Station` | `Koramangala` |
| `Chennai` | `Chennai Airport` | `Central Station` | `T. Nagar` |
| `Kolkata` | `NSCBI Airport` | `Howrah Station` | `Park Street` |
| `Hyderabad` | `RGIA Airport` | `Secunderabad Station` | `Hitec City` |
| `Pune` | `Pune Airport` | `Pune Junction` | `Koregaon Park` |
| `Ahmedabad` | `SVPI Airport` | `Kalupur Station` | `SG Highway` |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | Full MongoDB connection string |
| `JWT_SECRET` | ✅ | Min 32-char random string for signing tokens |
| `CLIENT_ORIGINS` | ✅ | Comma-separated CORS origins (e.g. `http://localhost:3000`) |
| `TAX_RATE` | ✅ | Decimal tax rate applied to subtotal (e.g. `0.18` for 18% GST) |
| `PORT` | Optional | Server port, defaults to `5000` |

---

## Running Tests

```powershell
cd server
npm test
```

- Uses Node.js built-in `node:test` runner — no extra framework.
- Uses `mongodb-memory-server` (devDependency) — **never touches your real database**.
- MongoDB binary is downloaded once on first run (~600 MB); cached for subsequent runs.

**Phase 2 validation test result (65 tests, 0 failures):**

```
ℹ tests 65
ℹ suites 18
ℹ pass 65
ℹ fail 0
ℹ duration_ms 32568
```

### Test Coverage

| Suite | Tests |
|---|---|
| Unit: priceCalculator | 3 (correct maths, whole rupees, endDate ≤ startDate throws) |
| Unit: bookingRef format | 1 (20 random samples all match `ED-YYMM-XXXX`) |
| Unit: DL normalisation | 1 (last-4 extraction, uppercased) |
| Unit: overlap predicate | 6 (before, after, same, partial, contained, adjacent) |
| Unit: JWT_SECRET length | 1 (≥ 32 chars in test env) |
| Unit: hubs config | 6 (city count, hub count, unknown city, wrong hub, correct hub, hub in wrong city) |
| GET /api/health | 1 |
| POST /api/auth/register | 4 (missing name, short password, success, duplicate) |
| POST /api/auth/login | 2 (wrong password, success) |
| GET /api/auth/me | 2 (no token, success) |
| GET /api/cars | 10 (list, type, category alias, search, q alias, sortBy, sort alias ×2, invalid sort, city filter) |
| GET /api/cars/:slug | 2 (found, 404) |
| GET /api/cars/:slug/booked-dates | 1 (404) |
| POST /api/bookings — validation | 14 (no auth, short Aadhaar, Aadhaar first-digit 0/1, valid first-digit 2, short DL, DL special chars, unknown city, wrong hub, hub in wrong city, car not in city, past date, same-day end, >30 days, exactly 30 days) |
| POST /api/bookings — successful creation | 4 (privacy, pricing, 409 conflict, non-overlap, unknown car) |
| GET /api/bookings/mine | 2 (no token, success with ordering) |
| GET /api/bookings/:reference | 3 (no token, 404, success) |
| 404 handler | 1 |

