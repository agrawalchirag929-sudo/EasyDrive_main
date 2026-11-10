# Phase 2 Specification: Backend Setup (Express, MongoDB, Mongoose, JWT)

> **Status:** Ready for Implementation (Specification Frozen)  

---

## 1. Specification Overview
- **Stack:** Node.js 20, Express 4.21, Mongoose 8.9, Zod 3.24, Helmet, Express-Rate-Limit, Morgan, CORS, Dotenv, Bcryptjs, JsonWebToken.
- **Frontend Isolation:** Client files in `client/` and `client-server.js` are untouched.
- **Fleet in MongoDB:** Cars live in MongoDB (collection `cars`) and are seeded from `client/assets/cars.json` with `cities[]`.
- **Cancellation Postponed:** Cancellation, admin dashboard, invoices, and payment integration are strictly postponed to later phases.

---

## 2. Directory Structure (`server/`)
```text
server/
├── package.json
├── .env.example
├── index.js                      # Express app setup, middlewares, routes, port listener
├── config/
│   └── db.js                     # Mongoose connection & disconnect helpers
├── models/
│   ├── User.js                   # User schema (email uniqueness, phone validation, safe toJSON)
│   ├── Car.js                    # Fleet schema with cities[], pickupLocations[], pricing
│   └── Booking.js                # Reservation schema with aadhaarLast4, dlLast4, server pricing
├── middleware/
│   ├── auth.js                   # requireAuth JWT verification middleware
│   ├── validate.js               # validateBody & validateQuery Zod wrappers
│   └── errorHandler.js           # notFoundHandler & globalErrorHandler
├── routes/
│   ├── auth.js                   # POST /register, POST /login, GET /me
│   ├── cars.js                   # GET /, GET /:slug, GET /:slug/booked-dates
│   └── bookings.js               # POST /, GET /mine, GET /:reference
├── utils/
│   ├── bookingRef.js             # Generates unique ED-YYYYMMDD-XXXX
│   ├── priceCalculator.js        # Server durationDays and totalCost calculator
│   └── schemas.js                # Zod validation schemas
├── seed/
│   └── seedCars.js               # Populates MongoDB with 12 cars from cars.json
└── tests/
    └── api.test.js               # Automated unit & integration tests (Node native test runner)
```

---

## 3. Non-Negotiable Hard Rules
1. **Aadhaar Privacy Rule:** Validate 12-digit string (`/^\d{12}$/`). Store ONLY last 4 digits as `aadhaarLast4`. Never log, store, or return the full number.
2. **Driving Licence Privacy Rule:** Accept alphanumeric DL, store ONLY last 4 characters as `dlLast4`.
3. **Environment Security:** `server/.env` is NEVER committed. `.env.example` has placeholder values only.
4. **JWT Authentication:** 7-day token expiration (`7d`).
5. **Passwords:** Encrypted with `bcryptjs` (salt rounds = 12). `passwordHash` is never returned in any response.
6. **Authoritative Pricing:** `durationDays` and `totalCost` calculated server-side using database `pricePerDay`.
7. **Overlapping Booking Prevention:** Rejects booking with `409 Conflict` if existing booking for `carSlug` overlaps:  
   `existingStartDate < requestedEndDate && existingEndDate > requestedStartDate`.
8. **Consistent Response Shape:**
   - Success: `{ success: true, data: ... }`
   - Error: `{ success: false, message: "...", errors?: [...] }`

---

## 4. REST Endpoints Summary
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Server status & timestamp |
| `POST`| `/api/auth/register` | No | Register new account (Zod validated, bcrypt) |
| `POST`| `/api/auth/login` | No | Authenticate user, return JWT |
| `GET` | `/api/auth/me` | Yes | Get authenticated profile |
| `GET` | `/api/cars` | No | Query fleet (supports `city`, `type`, `search`, `sortBy`) |
| `GET` | `/api/cars/:slug` | No | Get single car by slug |
| `GET` | `/api/cars/:slug/booked-dates` | No | Get active confirmed booking ranges |
| `POST`| `/api/bookings` | Yes | Create reservation (overlap check, server pricing, last-4 masking) |
| `GET` | `/api/bookings/mine` | Yes | List authenticated user's bookings (newest first) |
| `GET` | `/api/bookings/:reference` | Yes | Get single booking details (ownership enforced) |
