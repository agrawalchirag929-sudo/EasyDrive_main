# Project Context: EasyDrive

> **Project Name:** EasyDrive  
> **Target Audience:** Placement interview showcase / Student CV portfolio  
> **Quality Standard:** Senior engineering practices with beginner-readable, well-commented code

---

## 1. Project Summary
**EasyDrive** is a premium, full-stack car rental booking web application tailored for the Indian mobility market. It features a responsive Single Page Application (SPA) frontend built without external UI frameworks and an Express/Node.js/MongoDB backend adhering to security, validation, and privacy standards (including strict Aadhaar masking to preserve user confidentiality).

---

## 2. Tech Stack (Strict Constraints)

### Frontend
- **Markup & Styling:** Semantic HTML5, Vanilla CSS3 (Custom CSS Properties / Design Tokens, CSS Grid, Flexbox). No UI libraries or CSS frameworks.
- **Scripting:** Modern Vanilla JavaScript (ES modules, native Fetch API, hash-based client-side router).
- **Typography:** Google Fonts — **Sora** (headings & display) and **Inter** (body & UI controls).
- **Themes:** Dark mode by default with Light mode toggle, persisted via `localStorage`.

### Backend
- **Runtime & Framework:** Node.js, Express.js.
- **Database & ODM:** MongoDB with Mongoose.
- **Authentication & Security:** JWT (JSON Web Tokens with 7-day expiration), bcrypt password hashing, `helmet`, `express-rate-limit`, `cors`.
- **Validation:** Zod for request body and query parameter validation schemas.
- **Configuration:** Environment variables managed via `dotenv` (`MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGINS`, `TAX_RATE`, `PORT`).
- **Payment Gateway:** Razorpay (test mode) in Phase 6.

---

## 3. Core Architectural & Business Decisions

### 3.1. Design Tokens & Visual Hierarchy (`tokens.css`)
- **Theme Selection:** Defaults to user's system preference (`prefers-color-scheme`), with explicit user toggle persisted in `localStorage`.
- **Dark Palette (Default):**
  - Background: `#0B1218`
  - Surface: `#101820`
  - Text Primary: `#F5F3EE`
  - Muted Text: `#9AA8B3`
  - Border: `#22313D`
- **Light Palette:**
  - Background: `#F5F3EE`
  - Surface: `#FFFFFF`
  - Text Primary: `#101820`
  - Muted Text: `#55636E`
  - Border: `#E4DFD3`
- **Brand & Status Colors:**
  - Brand Orange (buttons, accents, active states, large text): `#D97736` (both modes)
  - Brand Text (WCAG AA Contrast for small orange text/badges/links):
    - Dark Mode: `#D97736` (high contrast against dark surface)
    - Light Mode: `#A8501A` (ensures >= 5.5:1 contrast against `#FFFFFF` / `#F5F3EE`)
  - On-Brand Text (text on orange buttons): `#101820` (both modes, high AA contrast)
  - Success Green: `#22C55E`
  - Error Red: `#EF4444`
  - Hero Gradient: Subtle warm gradient built from bg, surface, and a faint orange glow.
- **Typography (Google Fonts):**
  - Headings & Live Wordmark: **Outfit** (weights 500, 600, 700, 800)
  - Body Text & UI: **DM Sans** (weights 400, 500, 600, 700)

### 3.2. Logo & Wordmark Architecture
- **Inlined SVG Logo Mark:** `client/assets/logo-mark.svg` inlined in HTML components to leverage CSS variables:
  - Stroke: `var(--brand)` (`#D97736`)
  - Window Fill: `var(--logo-window)` (Dark: `#F5F3EE` / Light: `#101820`)
  - Wheel Fill: `var(--logo-wheel)` (Dark: `#101820` / Light: `#F5F3EE`)
  - Wheel Ring: `var(--logo-ring)` (Dark: `#F5F3EE` / Light: `#101820`)
- **Live Text Wordmark:** `<span class="brand-wordmark"><span class="wordmark-easy">easy</span><span class="wordmark-drive">drive</span></span>` (lowercase, Outfit 700). Used in sidebar header, mobile top header, and footer.
- **Favicon:** Scalable SVG favicon generated from the logo mark. Dynamic `<meta name="theme-color">` synced to active theme.

### 3.3. 12-Car Fleet Specifications & Local Image Rules
- **No Remote URLs:** Zero Unsplash or third-party URLs. All imagery points to local WebP files: `assets/cars/<name>.webp`.
- **Exact 12 Vehicles:**
  1. `maruti-swift` (Hatchback, Petrol, Manual, 5 seats)
  2. `hyundai-i20` (Hatchback, Petrol, Manual, 5 seats)
  3. `honda-city` (Sedan, Petrol, Automatic, 5 seats)
  4. `hyundai-verna` (Sedan, Petrol, Automatic, 5 seats)
  5. `hyundai-creta` (SUV, Diesel, Automatic, 5 seats)
  6. `mahindra-thar` (SUV, Diesel, Manual, 4 seats)
  7. `mahindra-xuv700` (SUV, Diesel, Automatic, 7 seats)
  8. `toyota-fortuner` (SUV, Diesel, Automatic, 7 seats)
  9. `toyota-innova-crysta` (MPV, Diesel, Automatic, 7 seats)
  10. `tata-nexon-ev` (EV, Electric, Automatic, 5 seats)
  11. `mg-zs-ev` (EV, Electric, Automatic, 5 seats)
  12. `mercedes-c-class` (Luxury, Petrol, Automatic, 5 seats)
- **Fleet Attributes:** Each vehicle record includes `id, brand, name, type, fuel, transmission, seats, pricePerDay, kmPerDay (250 km/day default), extraKmRate, mileage, rating, features[], badge, credit, image`.
- **Card Media Standards:** Fixed 16:10 aspect ratio (`aspect-ratio: 16 / 10`), `object-fit: contain`, and a stage background of `#F4EFE9` (CSS variable `--car-stage`) across both light and dark themes so the studio cream background blends seamlessly. If an image fails to load (`onerror`), renders a clean branded SVG fallback placeholder with car silhouette and "Photo coming soon".
- **Image Processing Pipeline (`tools/process_cars.py`):**
  - Raw source studio JPGs stored in `client/assets/cars/_source/`.
  - Samples frame color from pixel (3, 3) (outer frame ~RGB(246, 245, 240) rather than pure white).
  - Detects inner rectangle: bounding box of pixels whose maximum per-channel difference from the frame color is > 3.
  - Insets that box by 3px on every side to eliminate frame borders and edge fringing.
  - Crops to the inset box.
  - Samples backdrop color as the median RGB of a 20x20 patch at 12px inside the crop's top-left corner (~RGB(244, 239, 233)).
  - Centers crop on a 16:10 canvas filled with that backdrop color (`canvas width = crop width / 0.92`, `canvas height = width / 1.6`), seamlessly extending the cream studio background top and bottom.
  - Resizes with Lanczos resampling to 800x500 px and exports as WebP quality 85 to `client/assets/cars/<slug>.webp`.
  - Calculates median backdrop color across all 12 images: `#F4EFE9`.
- **Known Asset Replacement Requirement:** `toyota-fortuner.webp` needs replacing because the plate text is misspelled in the source capture.
- **Registry:** `client/assets/cars/README.md` documents source files in `_source/`, 800x500 WebP outputs, and photo credits. Photo credits are currently set to "Demo image" in `cars.json` and displayed inside the Quick View modal.

### 3.4. Smart Compare Dock Rules
- Compare floating dock appears **only on Home (`#home`) and Catalogue (`#catalogue`)**.
- Appears **only when 2 or more cars (2+) are selected**.
- Adds bottom clearance padding (`.has-compare-dock`) so content is never covered. Works on mobile down to 390px.

### 3.5. Supported Cities & Hubs (Indian Market)
Eight major metropolitan hubs, each seeded with 2–3 strategic pickup/dropoff points (Airport, Railway Station, City Centre):
1. **Delhi NCR:** IGI Airport T3, New Delhi Railway Station, Connaught Place
2. **Mumbai:** Chhatrapati Shivaji Maharaj Int'l Airport (T2), Mumbai Central, Bandra Kurla Complex (BKC)
3. **Bengaluru:** Kempegowda Int'l Airport, Majestic Railway Station, Koramangala
4. **Chennai:** Chennai Int'l Airport, Chennai Central Station, T. Nagar
5. **Kolkata:** Netaji Subhash Chandra Bose Airport, Howrah Station, Park Street
6. **Hyderabad:** Rajiv Gandhi Int'l Airport, Secunderabad Station, Hitec City
7. **Pune:** Pune Airport, Pune Junction Railway Station, Koregaon Park
8. **Ahmedabad:** Sardar Vallabhbhai Patel Airport, Kalupur Railway Station, SG Highway

### 3.6. Data Models & Relationships
- **User:** `name`, `email`, `passwordHash`, `role` (`user` | `admin`), `phone`, timestamps.
- **Car:** `name`, `brand`, `modelYear`, `type` (Hatchback, Sedan, SUV, MPV, EV, Luxury), `fuel` (Petrol, Diesel, Electric, Hybrid), `transmission` (Manual, Automatic), `seats`, `pricePerDay`, `kmPerDay`, `extraKmRate`, `images`, `city`, `pickupLocations`, `features`, `isAvailable`, `ratingAverage`, timestamps.
- **Booking:** `bookingReference` (Format: `ED-YYMM-XXXX`), `userId`, `carId`, `startDate`, `endDate`, `pickupLocation`, `drivingLicenceNumber`, `aadhaarLast4` (**strict privacy: full 12 digits never logged/stored**), `totalDays`, `basePrice`, `taxAmount`, `securityDeposit`, `totalAmount`, `status` (`confirmed` | `active` | `completed` | `cancelled`), `paymentStatus` (`pending` | `paid` | `failed` | `refunded`), timestamps.
- **Review:** `userId`, `carId`, `bookingId`, `rating` (1–5), `comment`, timestamps.

### 3.7. Overlapping Booking Prevention
- Server-side query rejects new booking creation if an active booking (`confirmed` or `active`) exists for the same `carId` where:
  `existingStartDate < requestedEndDate && existingEndDate > requestedStartDate`.

### 3.8. Sensitive Data Handling
- **Aadhaar Privacy Rule:** Client and server validate the 12-digit Indian Aadhaar pattern (Verhoeff/regex check), but the backend controller strictly extracts and persists `aadhaar.slice(-4)` as `aadhaarLast4`. No full Aadhaar is saved to MongoDB, passed in API responses, or recorded in console logs.

### 3.9. Free Cancellation Window
- **Business Rule:** Cancellation is free until 6 hours before the booking start time (to be enforced in the backend booking cancellation controller). Bookings cancelled after this window may be subject to standard retention fees.

---

## 4. Planned Project Directory Structure

```text
MAIN2.0/
├── client/
│   ├── index.html
│   ├── css/
│   │   ├── tokens.css
│   │   ├── base.css
│   │   ├── components.css
│   │   └── effects.css
│   ├── js/
│   │   ├── app.js
│   │   ├── router.js
│   │   ├── state.js
│   │   ├── effects.js
│   │   ├── components/
│   │   │   ├── sidebar.js
│   │   │   ├── carCard.js
│   │   │   ├── compareModal.js
│   │   │   ├── skeleton.js
│   │   │   └── toast.js
│   │   └── pages/
│   │       ├── home.js
│   │       ├── catalogue.js
│   │       ├── bookings.js
│   │       └── support.js
│   └── assets/
│       ├── logo-mark.svg
│       ├── cars.json
│       └── cars/
│           ├── README.md
│           ├── _source/
│           └── *.webp
├── server/
│   ├── package.json
│   ├── .env.example              # Placeholder env template (never commit .env)
│   ├── index.js                  # Express app: middlewares, routes, port listener
│   ├── config/
│   │   └── db.js                 # Mongoose connect() & disconnect() helpers
│   ├── models/
│   │   ├── User.js               # User schema (passwordHash never serialised)
│   │   ├── Car.js                # Fleet schema with cities[], pickupLocations[]
│   │   └── Booking.js            # Reservation schema with aadhaarLast4, dlLast4
│   ├── middleware/
│   │   ├── auth.js               # requireAuth JWT verification middleware
│   │   ├── validate.js           # validateBody & validateQuery Zod wrappers
│   │   └── errorHandler.js       # notFoundHandler & globalErrorHandler
│   ├── routes/
│   │   ├── auth.js               # POST /register, POST /login, GET /me
│   │   ├── cars.js               # GET /, GET /:slug, GET /:slug/booked-dates
│   │   └── bookings.js           # POST /, GET /mine, GET /:reference
│   ├── utils/
│   │   ├── bookingRef.js         # Generates unique ED-YYMM-XXXX references
│   │   ├── priceCalculator.js    # Server-side duration & totalCost calculator
│   │   └── schemas.js            # Zod validation schemas
│   ├── seed/
│   │   └── seedCars.js           # Upserts 12 cars from client/assets/cars.json
│   └── tests/
│       └── api.test.js           # 65 tests (18 suites, Node native test runner, mongodb-memory-server)
├── tools/
│   └── process_cars.py
├── .env.example
├── README.md
└── PROJECT_CONTEXT.md
```

---

## 5. Development Phases Roadmap

| Phase | Description | Status |
|---|---|---|
| **Phase 1** | Frontend Shell: Setup, tokens, SPA router, persistent sidebar, hero section, car cards with mock `cars.json`, compare modal skeleton. | **Completed** |
| **Phase 1c** | Rebrand & UI Polish: Warm terracotta palette (#D97736), live wordmark, SVG logo mark, 12-car local image schema, Quick View modal, 2+ compare dock rule, honest metrics. | **Completed** |
| **Phase 1d** | Polish Pass: Centered hero, Home order (Hero -> Stats -> Featured -> How It Works), restrained glows/shadows, :focus-visible focus ring, all 8 cities per car, 140px compare padding & full Clear reset, 6-hr cancellation rule. | **Completed** |
| **Phase 1e** | Layout & Polish Fixes: 8-tile "Choose your city" strip with catalogue filter link, Compare icon-button on image, clean car card footer (price + taxes, Specs link, single Book button), silhouette-only missing image placeholder, WCAG AA `--brand-text: #A8501A`, container-based 3-card grids, scroll-reveal & stats count-up animations, skeleton loaders. | **Completed** |
| **Phase 1f** | Hero Headline, Collapsible Sidebar & Smooth Scroll: Two-line hero headline (Line 1: "Easy to book. Easy to drive.", Line 2: "Unrestricted freedom."), no chip; collapsible desktop sidebar (screens >= 900px, 72px collapsed, toggle button, tooltips, localStorage persistence, 250ms transition, mobile unaffected); smooth scroll (`scroll-behavior: smooth`, `scroll-margin-top`, instant route scroll reset, themed scrollbars, prefers-reduced-motion). | **Completed** |
| **Phase 1g** | Real Car Images & Processing Pipeline: Python Pillow script (`tools/process_cars.py`) for automated crop detection, cream color sampling, 16:10 aspect framing with 4% margins, 800x500 WebP generation, #F3EFE8 stage background in cards/Quick View/Compare modal, all credits set to "Demo image". | **Completed** |
| **Phase 1h** | Fix Faint Rectangle Behind Car Images: Updated `tools/process_cars.py` with pixel (3,3) frame color sampling, max per-channel difference > 3 detection, 3px inset, 20x20 patch backdrop sampling, 16:10 extension, reprocessed all 12 car images to 800x500 WebP, and set card/Quick View/Compare stage background to median hex `#F4EFE9` (`--car-stage`) in light and dark themes. | **Completed** |
| **Phase 1i** | Mobile Layout Fix (<900px): Root cause identified as `.app-container` `display: flex` allocating 290px empty column to top bar and squeezing main content; converted shell to single-column (`display: block` below 900px), full-width sticky mobile header, full-width fixed bottom nav with safe-area padding, 16px side padding and 88px+safe-area bottom clearance, inline-block hero sentence spans preventing mid-sentence breaks, 1-col search card, 2x2 stats row, 1-col (<520px) / 2-col (520-899px) city tiles, 1-col car cards on Home / 2-col on Catalogue (640-899px), shrinkable badges, wrapping spec items, and non-overlapping footers with zero horizontal scroll across 360px-899px. | **Completed** |
| **Phase 1j** | Interaction Effects: Six interaction effects using only `transform` and `opacity` animations (zero layout shift). 1) Card hover zoom (`translateY(-4px)`, mode-aware shadow, image scale `1.06` over `.7s`, no double lift); 2) Page fade and slide (`opacity 0 -> 1`, `translateY(10px) -> 0` over 280ms); 3) Image fade-in (shimmer skeleton, 600ms opacity & blur fade-in, instant swap for cached images, width/height attributes); 4) Button feedback (soft brand hover shadow, active `scale(.95)`, arrow nudge 4px right); 5) Sticky filter bar on Catalogue (>=900px only, stuck past 6px scroll via IntersectionObserver sentinel, translucent blur background, soft shadow); 6) Card spotlight (radial-gradient cursor follower via pointermove `--mx`/`--my`, non-interfering layer). Reduced motion support throughout. | **Completed** |
| **Phase 1k** | Car Card Image Area Regression Fix: Restored exact card media layout and positioning rules. Resolved regression where `effects.css` set `position: relative` on `.car-badge` and `.car-media-actions` and left `.car-img-zoom-wrap` unanchored, collapsing the car image to half width and dragging badges/buttons to the vertical center. Fixed stage `aspect-ratio: 16/10; overflow: hidden`, zoom wrapper `position: absolute; inset: 0`, image `width: 100%; height: 100%; object-fit: contain; object-position: center; display: block` (~92% car width centered), badge `position: absolute; top: 14px; left: 14px; max-width: calc(100% - 110px)`, and actions `position: absolute; top: 14px; right: 14px; gap: 8px`. Verified at 1920, 1366, 900, and 390px in light and dark mode with all 6 interaction effects preserved. | **Completed** |
| **Phase 1l** | Catalogue Filter & Visibility Fix: Diagnosed and resolved blank cards issue during search/category/city filtering caused by newly rendered `.reveal-on-scroll` elements lacking observer registration and staying at `opacity: 0`. Added automatic `.revealed` application on filtered renders, re-initialized `initScrollReveal` and `initImageHandlers`, implemented CSS/JS 600ms reveal & image failsafes, case-insensitive trimmed multi-word search across brand and model, singular/plural grammar ("Showing 1 vehicle" / "Showing 12 vehicles"), and empty state with "Clear filters" button restoring all 12 cars. | **Completed** |
| **Phase 1n** | Audit Fixes: Quick View Escape handler & listener cleanup; focus trap & restoration for both Quick View and Compare popups (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`); `localStorage` try/catch wrapping with in-memory fallback in `state.js`; `.gitignore` with secrets & temp rules and `git ls-files` security tracking audit. | **Completed** |
| **Phase 2** | Backend: Express REST API, Mongoose models (User, Car, Booking), JWT auth, strict Aadhaar/DL privacy, overlap prevention, seed script, API docs, automated test suite. | **Completed** |
| **Phase 3a** | Frontend Auth Integration: `api.js` fetch helper, `auth.js` session management, auth dialog UI (sign-in / create-account, focus trap), sidebar auth state, Bookings auth gate. | **Completed** |
| **Phase 3b** | Catalogue & Home from API: `fetchCars` / `fetchCar` in `api.js`; app.js loads fleet from `GET /api/cars`; catalogue filters (city, category, search, sort) call API; AbortController; skeleton/dim/error states; Retry button. | **Completed** |
| **Phase 3c** | Booking form modal wired to `POST /api/bookings`: city+hub selector, date picker, blocked dates from API, Aadhaar/DL client validation, live price preview, success screen. | **Completed** |
| **Phase 3d** | My Bookings page: `GET /api/bookings/mine` history, trip cards with status badges. | **Completed** |
| **Phase 4** | My Bookings, Cancellation flow, QR code confirmation, downloadable PDF/HTML invoice, skeleton loaders, toast notifications. | Pending |
| **Phase 5** | Admin Dashboard: Car CRUD, booking management, platform analytics, reviews system, dark/light theme polish. | Pending |
| **Phase 6** | Razorpay Payment Integration (Test Mode). | Pending |
| **Phase 7** | Final Polish: Responsive testing, Lighthouse 90+ audit, interview documentation, README with architecture diagrams. | Pending |

---

## 6. Current Phase Status
- **Current Phase:** Phase 4 (Ready to Start).
- **Status:** Phase 3d My Bookings complete. Phase 3c booking form modal complete. Phase 3b catalogue/home from API complete. Phase 3a auth integration complete. Phase 2 backend complete. All **65 tests pass** (0 failures, 18 suites).

### Phase 3d Deliverables (Completed):
- `client/js/api.js` — added `fetchMyBookings()` using `authGet('/api/bookings/mine')`.
- `client/js/pages/bookings.js` — fully rewritten: fetches live bookings on every visit; skeleton loaders; trip cards (car image from fleet, copy-reference button, UTC-formatted dates, Indian rupee totals, status + payment badges, masked Aadhaar/DL last-4); empty state; error + Retry; 401 → auth gate.
- `client/css/booking.css` — appended trip card styles, responsive to 390px.

### Phase 3c Deliverables (Completed):
- `client/js/api.js` — added `fetchBookedDates(slug)` and `createBooking(payload)`. Aadhaar/DL never logged.
- `client/js/components/bookingModal.js` — accessible booking modal: city select (car-filtered), hub select (CITY_HUBS mirror), date picker with min/max/30-day cap, blocked-date conflict check, Aadhaar (12-digit, first digit 2–9) + DL (4–20 alphanumeric) inputs, live price preview (days × rate + 18% GST estimate), `POST /api/bookings`, success confirmation screen with booking reference.
- `client/js/app.js` — Book button opens `openBookingModal(car, bookBtn)` when signed in.
- `client/css/booking.css` — new file: backdrop, panel, sections, inputs, price preview, success screen, responsive to 390px, `prefers-reduced-motion`.
- `client/index.html` — added `<link rel="stylesheet" href="css/booking.css?v=3c" />`.

### Phase 3b Deliverables (Completed):
- `client/js/api.js` — added `fetchCars(filters, {signal})`, `fetchCar(slug)`, and `adaptCar()` adapter (maps `slug→id`, preserves all existing card fields).
- `client/js/app.js` — replaced `fetch('./assets/cars.json')` with `fetchCars()`. On error logs a short message; `state.cars` stays `[]` and each page shows its own error UI.
- `client/js/pages/catalogue.js` — fully rewritten: filters (city, category, q, sort) all call `GET /api/cars` with matching query params; `AbortController` cancels stale requests; first load shows skeleton loaders; filter changes dim existing cards (opacity 0.4) until new results arrive; API error shows friendly error card + Retry button; empty-filter result shows "Clear filters"; count text, sticky filter bar, and all Phase 1 effects preserved.
- `client/js/pages/home.js` — updated: featured cars section shows skeleton while loading, friendly error card + Retry button if API fails; Retry re-fetches and re-renders.
- `client/assets/cars.json` — **not deleted**; seed script still reads it.

### Phase 3a Deliverables (Completed):
- `client/js/api.js` — shared fetch helper (base URL `http://localhost:5000`, Bearer token, `{success,data}` envelope unwrap, `ApiError` with `fieldErrors`, 401 handler slot).
- `client/js/auth.js` — `login`, `register`, `logout`, `restoreSession` (validates stored token with `/api/auth/me` on boot), `subscribe`/`onChange`. Safe `localStorage` with in-memory Map fallback. Never logs token or passwords.
- `client/js/components/authDialog.js` — single-instance accessible dialog (tabs: Sign In / Create Account), `role=dialog`, `aria-modal`, focus trap, Esc close, focus return to trigger. Fields: name (register only), email, password + show/hide. Client-side validation mirrors server rules (email format, ≥8 chars, letter+number). Maps server `fieldErrors` to form fields. Loading state on submit. Toast "Welcome, \<name\>! 👋" on success.
- `client/css/auth.css` — dialog, tabs, inputs, inline field errors, header auth states, mobile auth pill, Bookings gate, `prefers-reduced-motion` support.
- `client/index.html` — added `<link rel="stylesheet" href="css/auth.css?v=3a" />`.
- `client/js/app.js` — `import { restoreSession }` + `await restoreSession()` before `renderSidebar`; Book button opens auth dialog when logged out.
- `client/js/components/sidebar.js` — logged-out shows "Sign In"; logged-in shows avatar + name + "Log out". Works in collapsed sidebar. Subscribes to auth changes without full re-render.
- `client/js/pages/bookings.js` — auth gate (lock icon, "Sign In to See Your Bookings") when logged out; Phase 1 placeholder when logged in.

### Phase 2 Deliverables (Completed):
- `server/` initialized with Express 4.21, Mongoose 8.9, JWT, Zod, Helmet, Morgan, CORS, express-rate-limit.
- User, Car, and Booking Mongoose models implemented.
- Auth, Cars, and Bookings REST endpoints implemented.
- Rate limit: 10 req / 15 min per IP on `/api/auth` only.
- Booking reference format: `ED-YYMM-XXXX` (2-digit year + 2-digit month + 4 hex chars).
- Upsert seed script from `client/assets/cars.json` (never deletes).
- **65 automated tests** (18 suites) via Node native test runner (`npm test`) — all pass, 0 failures.
- Tests use `mongodb-memory-server` — never touch the real database.
- Booking validation: city/hub match, car availability in city, past-date guard (Asia/Kolkata), 30-day max, Aadhaar first-digit 2–9, DL alphanumeric format.
- `GET /api/cars` accepts aliases: `category`→`type`, `q`→`search`, `sort`→`sortBy`, `price_asc`/`price_desc` sort values.
- Pricing: `subtotal`, `taxAmount`, `totalCost` are all whole rupees (`Math.round`). `paymentStatus` defaults to `"pending"`.
- Conflict returns HTTP 409 with stable `code: "CAR_NOT_AVAILABLE"`.

---

## 7. What Is Next
- **Phase 3d: My Bookings**:
  - Replace the Bookings page placeholder with live data from `GET /api/bookings/mine`.
  - Trip cards with booking reference, dates, hub, status badge, and cost summary.


---

## 8. Known Issues / Technical Debt
- **Asset Replacement Pending:** `toyota-fortuner.webp` needs replacing because the plate text is misspelled in the source capture.
