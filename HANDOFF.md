# EasyDrive — Developer Handoff & Project Context Guide

> **Project Name:** EasyDrive  
> **Type:** Full-Stack Self-Drive Car Rental Platform (Indian Mobility Market)  
> **Target Audience:** Placement interview showcase / Student CV portfolio for Chirag (India, IST)  
> **Architecture:** Clean Vanilla JS Single-Page Application (SPA) frontend + Node.js/Express/MongoDB REST API backend  
> **Status:** Phase 1 Frontend Complete & Audited; Phase 2 Backend Complete (65/65 tests pass); **Phase 3a–3d Complete**; Ready for Phase 4  

---

## 1. Project Overview & Resume Bullets

EasyDrive is a production-grade, full-stack car rental booking web application designed specifically for the Indian metropolitan market. It provides transparent daily rental rates across 8 major Indian city hubs, includes a mandatory 250 km/day driving allowance with transparent extra-km rates, enforces strict user privacy (masking Indian Aadhaar numbers to the last 4 digits), and delivers a smooth responsive user experience.

### Core Resume Bullets This Project Supports
1. **Single-Page Application (SPA) Architecture:** Built a zero-dependency, framework-free SPA in modern Vanilla JavaScript (ES modules) with a custom hash-based client-side router (`#home`, `#catalogue`, `#bookings`, `#support`), persistent collapsible sidebar, and instant route transitions with zero full-page reloads.
2. **End-to-End Booking Flow via Fetch API:** Implemented a full rental reservation pipeline capturing vehicle selection, date ranges, pickup hubs, driving licence verification, and Aadhaar identity validation with seamless asynchronous HTTP communication.
3. **Secure Node.js & Express REST API:** Engineered a modular backend leveraging Express, Mongoose ODM, and MongoDB with structured schema validation, parameterized queries, and defensive error handling.
4. **JWT Authentication & Access Control:** Built stateless authentication with JSON Web Tokens (7-day validity), bcrypt password hashing (12 salt rounds), protected route middleware, and authenticated user session persistence.
5. **Scoped & Sorted Booking Retrieval:** Developed user-isolated booking management filtering trips strictly by authenticated user identity and ordering bookings chronologically by creation timestamp.
6. **Automated Reference & Server-Side Pricing Engine:** Implemented automated unique booking reference generation (`ED-YYMM-XXXX`), server-authoritative rental duration computation (`Math.ceil((end - start) / 86400000)`), and tamper-proof price calculation preventing client-side price modification.

---

## 2. Current Implementation Status

| Component / Feature | Status | Verification & Codebase Reality |
|---|---|---|
| **SPA Hash Router** | **Done** | Implemented in `client/js/router.js`. Listens to `hashchange` and `load`, mounts views dynamically into `#main-content`, resets scroll instantly, and triggers scroll-reveal observers. |
| **Persistent Desktop Sidebar** | **Done** | Implemented in `client/js/components/sidebar.js`. Active for screens $\ge$ 900px, 260px expanded, 72px collapsed, toggle button with ARIA attributes, tooltips, and `localStorage` persistence. |
| **Responsive Mobile Navigation** | **Done** | Sticky mobile header with inlined SVG logo mark, live text wordmark, and theme toggle; fixed bottom navigation bar with safe-area inset support (<900px). |
| **Theme System (Dark/Light)** | **Done** | Implemented in `client/js/state.js` and `client/css/tokens.css`. Defaults to dark mode (`#0B1218`), toggleable to light mode (`#F5F3EE`), synced with `<meta name="theme-color">`, wrapped in safe `try/catch` with an in-memory `Map` fallback. |
| **12-Car Fleet Dataset & Images** | **Done** | Stored in `client/assets/cars.json` and `client/assets/cars/*.webp`. All 12 local WebP images processed to uniform 800x500 px via `tools/process_cars.py` with `#F4EFE9` studio backdrop. |
| **Home Page Layout** | **Done** | Centered hero with two-line headline ("Easy to book. Easy to drive." / "Unrestricted freedom."), quick search bar, honest metrics with count-up animation, featured vehicles grid, 8-tile "Choose your city" strip, 3-step "How It Works" workflow, and demo footer. |
| **Catalogue & Filtering** | **Done (Phase 3b)** | Filters (city, category, search, sort) call `GET /api/cars` with AbortController. First load shows skeletons; filter changes dim existing cards until new results arrive; API error → error card + Retry button. |
| **Compare Dock & Modal** | **Done** | Floating dock active only on `#home` and `#catalogue` when 2+ cars are selected (max 3). Adds 140px bottom clearance to prevent overlapping. Modal features full spec matrix, focus trap, and Escape listener cleanup. |
| **Quick View Modal** | **Done** | Modal displaying detailed car specs, daily rate, deposit, mileage, features list, photo credit, accessible focus trap, and Escape listener cleanup. |
| **Interaction Effects** | **Done** | 6 performant interactions in `effects.css` and `effects.js`: card hover zoom, page fade & slide, image fade-in with skeleton shimmer, button press feedback, sticky filter bar (>=900px), and card cursor spotlight. Full `prefers-reduced-motion` support. |
| **Safe Storage & Error Fallback** | **Done** | `state.js` wraps all `localStorage` reads/writes in `try/catch` with an in-memory fallback store (`memoryStorage`), preventing crashes in private browsing. |
| **Repository `.gitignore`** | **Done** | Contains `node_modules/`, `.env`, `.env.*`, `!.env.example`, `.DS_Store`, `*.log`, `Thumbs.db`, `.vscode/`. Security tracking audit verified clean. |
| **Auth UI (Login / Sign Up)** | **Done (Phase 3a)** | Sign-in / create-account dialog (`authDialog.js`, `auth.css`): tabs, focus trap, Esc, inline field errors, server fieldErrors mapped to fields, loading state, toast on success. Sidebar shows avatar+name+logout when logged in. |
| **Auth Session** | **Done (Phase 3a)** | `api.js` fetch helper + `auth.js` session manager. `restoreSession()` called at boot before sidebar renders. Safe `localStorage` with in-memory Map fallback. 401 auto-clears session and re-opens sign-in dialog. |
| **Booking Submission** | **Done (Phase 3c)** | "Book" button opens auth dialog when logged out; when signed in opens booking modal: city/hub selector, date picker with server-blocked dates, Aadhaar+DL inputs with client validation, live price preview, POST /api/bookings, success screen with booking reference. |
| **My Bookings Screen** | **Done (Phase 3d)** | Live trip cards from `GET /api/bookings/mine` — car image, name, reference with copy button, hub, dates, duration, total, status + payment badges, masked Aadhaar/DL last-4. Loading skeletons, empty state, error + Retry, 401 auto-clear to auth gate. |
| **Backend REST API (`server/`)** | **Done (Phase 2)** | Express 4.21, Mongoose 8.9, JWT auth, Zod validation, Helmet, CORS, rate-limit. 9 endpoints, 65 tests (18 suites) all passing. Full booking validation: city/hub, car-city, past-date, 30-day max, Aadhaar 2-9, DL format, whole-rupee pricing, `CAR_NOT_AVAILABLE` 409. |
| **Razorpay Payment Gateway** | **Not Started** | Scheduled for **Phase 6** in test mode. |
| **Admin Dashboard** | **Not Started** | Scheduled for **Phase 5** for vehicle CRUD and booking management. |

---

## 3. Directory & File Structure

```text
MAIN2.0/
├── .gitignore                     # Ignores .env, node_modules, logs, OS files; allows .env.example
├── .env.example                   # Environment configuration template (PORT, MONGO_URI, JWT_SECRET)
├── PROJECT_CONTEXT.md             # Master project context, phase roadmaps, and audit logs
├── HANDOFF.md                     # This file — standalone context for AI assistants and developers
├── client-server.js               # Zero-dependency local Node static server for client/ preview
├── docs/
│   ├── API.md                     # Full backend API reference (Phase 2)
│   └── PHASE2_PROMPT.md           # Exact Phase 2 backend specification prompt to follow
├── client/
│   ├── index.html                 # Root HTML document, meta tags, Google Fonts, and layout anchors
│   ├── css/
│   │   ├── tokens.css             # Design tokens: palettes, typography, spacing, radii, glows, shadows
│   │   ├── base.css               # Reset, CSS variables application, typography base, scrollbars
│   │   ├── components.css         # Sidebar, cards, buttons, modals, compare dock, tables, forms, footer
│   │   ├── effects.css            # Interaction effects: hover zoom, page fade, spotlight, sticky bar
│   │   └── auth.css               # Phase 3a — dialog, tabs, inputs, auth header states, bookings gate
│   ├── js/
│   │   ├── app.js                 # App orchestrator: restoreSession → sidebar → router → global events
│   │   ├── router.js              # Hash router: route table, dynamic view mounting, scroll restoration
│   │   ├── state.js               # Reactive pub/sub store, safe storage with in-memory fallback
│   │   ├── effects.js             # Runtime scripts for spotlight, sticky observer, image skeletons
│   │   ├── api.js                 # Phase 3a — shared fetch helper, ApiError, Bearer token, 401 handler
│   │   ├── auth.js                # Phase 3a — login/register/logout/restoreSession/subscribe
│   │   ├── components/
│   │   │   ├── sidebar.js         # Desktop sidebar + mobile nav — Phase 3a: auth header state
│   │   │   ├── authDialog.js      # Phase 3a — accessible sign-in/create-account dialog, focus trap
│   │   │   ├── carCard.js         # Car card rendering, Quick View modal, focus trap, specs summary
│   │   │   ├── compareModal.js    # Floating compare dock, comparison table modal, focus trap
│   │   │   ├── skeleton.js        # Shimmer skeleton markup generator for async card loading states
│   │   │   └── toast.js           # Accessible toast notification component (info, success, warning, error)
│   │   └── pages/
│   │       ├── home.js            # Centered hero, quick search form, metrics, featured cars, city tiles, steps
│   │       ├── catalogue.js       # Fleet grid, category tabs, multi-city/text filtering, unclipped selects
│   │       ├── bookings.js        # Phase 3a — auth gate when logged out; Phase 1 placeholder when logged in
│   │       └── support.js         # 3-card contact grid, animated FAQ accordion, helpline simulation
│   └── assets/
│       ├── logo-mark.svg          # Primary scalable vector logo mark (inlined dynamically in JS)
│       ├── logo-mark.svg.svg      # Legacy logo asset backup
│       ├── cars.json              # 12-car local JSON database with full specs, cities, and pricing
│       └── cars/
│           ├── README.md          # Fleet photo registry, attribution specs, and image dimensions
│           ├── _source/           # 12 raw source studio JPG images before processing
│           └── *.webp             # 12 processed 800x500 WebP vehicle images (quality 85)
└── server/
    ├── package.json
    ├── .env.example               # Env template — copy to .env and fill real values
    ├── index.js                   # Express app entry point; exports app for tests
    ├── config/
    │   └── db.js                  # Mongoose connect() & disconnect()
    ├── models/
    │   ├── User.js                # User schema — passwordHash never returned
    │   ├── Car.js                 # Fleet schema with slug, cities[], pricePerDay
    │   └── Booking.js             # Reservation — aadhaarLast4, dlLast4 only
    ├── middleware/
    │   ├── auth.js                # requireAuth JWT Bearer verification
    │   ├── validate.js            # validateBody / validateQuery Zod wrappers
    │   └── errorHandler.js        # notFoundHandler + globalErrorHandler
    ├── routes/
    │   ├── auth.js                # POST /register, POST /login, GET /me
    │   ├── cars.js                # GET /, GET /:slug, GET /:slug/booked-dates
    │   └── bookings.js            # POST /, GET /mine, GET /:reference
    ├── utils/
    │   ├── bookingRef.js          # Generates unique ED-YYMM-XXXX references
    │   ├── priceCalculator.js     # Math.ceil duration, TAX_RATE from env
    │   └── schemas.js             # All Zod schemas in one auditable file
    ├── seed/
    │   └── seedCars.js            # Upserts 12 cars from client/assets/cars.json
    └── tests/
        └── api.test.js            # 65 tests, 18 suites (mongodb-memory-server, Node native runner)

*(Note: client/ and client-server.js were not touched in Phase 2)*

---

## 4. Architectural Patterns & Data Flow

### 4.1. Client-Side Hash Routing
- **Routes:** `#home`, `#catalogue`, `#bookings`, `#support`.
- **Mechanism:** Listens for `hashchange` and initial `DOMContentLoaded`/`load`. Matches the window hash against the route registry in `router.js` and calls the page render function.
- **Why Hash Routing:** Works natively on static hosts and local development without requiring server URL rewrite rules (e.g., Apache `.htaccess`, Nginx `try_files`, or Express catch-all routes). Hashes are never sent to the server in HTTP requests, completely preventing 404 errors during page reloads.
- **Scroll Behavior:** Resets scroll to `{ top: 0, left: 0, behavior: 'instant' }` on every route change, preventing the browser from inheriting previous scroll offsets.

### 4.2. Global Reactive State (`state.js`)
- Uses a lightweight Publish/Subscribe pattern:
  - `getState()`: Returns read-only snapshot of current application state.
  - `subscribe(listener)`: Subscribes components to state changes. Returns an unsubscribe function.
  - `notify(changeType, payload)`: Broadcasts state mutations to all registered listeners.
- **Current State Schema:**
  ```javascript
  {
    theme: 'dark' | 'light',
    cars: [],                       // Loaded from cars.json (or /api/cars in Phase 3)
    favorites: Set(carId),          // Set of car ID strings
    compareList: [],                // Array of car ID strings (max 3)
    filters: {
      city: 'All',                  // 'All' or specific city name
      type: 'All',                  // 'All' or category ('SUV', 'Sedan', etc.)
      searchQuery: '',              // Trimmed, case-insensitive keyword search
      startDate: '',                // ISO date string
      endDate: '',                  // ISO date string
      sortBy: 'featured'            // 'featured' | 'price-asc' | 'price-desc' | 'rating'
    },
    currentRoute: '#home'           // Active hash
  }
  ```

### 4.3. Safe Storage Handling
- Keys used in `localStorage`:
  1. `easydrive_theme`: Stored as `'dark'` or `'light'`.
  2. `easydrive_favorites`: Stored as JSON stringified array of car IDs (e.g., `["maruti-swift", "hyundai-creta"]`).
  3. `easydrive_sidebar_collapsed`: Stored as `'true'` or `'false'` (managed in `sidebar.js`).
- **Defensive Fallback:** All storage access in `state.js` and `sidebar.js` is wrapped in `try/catch`. If storage is blocked (e.g., Safari private browsing, disabled cookies, or quota limits), the system automatically falls back to an in-memory `Map` (`memoryStorage`), ensuring zero runtime crashes.

### 4.4. How `cars.json` is Used Today
1. `client/js/app.js` fetches `./assets/cars.json` on boot, parses the JSON array, and calls `setCars(carsData)`.
2. `home.js` reads `getState().cars`, filters `car.isFeatured === true`, and renders the top 6 featured cars.
3. `catalogue.js` runs `getFilteredCars()`, evaluating category, city availability in `car.cities[]`, debounced search across `brand`, `name`, and `type`, and sort order.
4. `carCard.js` and `compareModal.js` look up vehicles by `id` directly from `getState().cars`.

### 4.5. Mock & Placeholder Touchpoints to Replace in Phase 3
1. **Fleet Catalog Source (`client/js/app.js`):**
   - *Current:* `fetch('./assets/cars.json')`.
   - *Phase 3 Replacement:* `fetch('/api/cars')` to load live database records from MongoDB.
2. **Booking Trigger (`client/js/app.js`):**
   - *Current:* `[data-action="book"]` event listener displays a toast notification.
   - *Phase 3 Replacement:* Opens an interactive booking modal prefilled with car details, prompts for rental dates, pickup hub, driver details (Aadhaar/DL), calculates real-time duration and price, and sends `POST /api/bookings`.
3. **Authentication Buttons (`client/js/components/sidebar.js`):**
   - *Current (Phase 3a — Done):* Sidebar shows "Sign In" when logged out and avatar+name+"Log out" when logged in. `authDialog.js` handles full login/register flow via `POST /api/auth/login` and `POST /api/auth/register`. JWT stored in `localStorage` via `auth.js`.
4. **My Bookings Dashboard (`client/js/pages/bookings.js`):**
   - *Current:* Renders a static empty state card.
   - *Phase 4 Replacement:* Issues authenticated `fetch('/api/bookings')` with Bearer token, rendering real upcoming/past booking cards with cancellation triggers.
5. **Quick Search Bar (`client/js/pages/home.js`):**
   - *Current:* Updates client-side filter state and navigates to `#catalogue`.
   - *Phase 3 Replacement:* Preserves selected date range and city across navigation, carrying values directly into booking calculation.

---

## 5. Design System & CSS Token Specifications

All design tokens are defined in `client/css/tokens.css` and applied across `base.css`, `components.css`, and `effects.css`.

### 5.1. Color Palettes
- **Brand Orange (Universal):**
  - `--brand`: `#D97736` (Warm terracotta orange for primary CTA buttons, active icons, large accents)
  - `--brand-hover`: `#C56527` (Darker warm orange for hover and active button states)
  - `--brand-light`: `rgba(217, 119, 54, 0.12)` (Subtle tinted orange for badge backdrops and icon containers)
  - `--on-brand`: `#101820` (High-contrast dark charcoal text on orange CTA buttons)
- **Brand Text (WCAG AA Compliant for Small Text & Links):**
  - Dark Mode: `--brand-text: #D97736` (High contrast against dark surface)
  - Light Mode: `--brand-text: #A8501A` (Strictly guarantees $\ge 4.5:1$ contrast against `#FFFFFF` and `#F5F3EE`)
- **Status Indicators:**
  - `--success`: `#22C55E`
  - `--error`: `#EF4444`
  - `--warning`: `#F59E0B`
- **Dark Mode Palette (Default `:root` / `[data-theme="dark"]`):**
  - `--bg`: `#0B1218`
  - `--surface`: `#101820`
  - `--surface-elevated`: `#16202A`
  - `--surface-glass`: `rgba(16, 24, 32, 0.90)`
  - `--text`: `#F5F3EE`
  - `--muted`: `#9AA8B3`
  - `--border`: `#22313D`
  - `--border-focus`: `#D97736`
  - `--card-hover-border`: `rgba(217, 119, 54, 0.45)`
  - `--car-stage`: `#F4EFE9` (Studio cream backdrop matching processed car images)
  - Inlined Logo Tokens: `--logo-window: #F5F3EE`, `--logo-wheel: #101820`, `--logo-ring: #F5F3EE`
  - Glow Tokens: `--glow-hero: radial-gradient(circle at 50% 32%, rgba(217, 119, 54, 0.16) 0%, transparent 65%)`, `--glow-soft: 0 0 20px rgba(217, 119, 54, 0.16)`, `--shadow-brand: 0 4px 18px rgba(217, 119, 54, 0.35)`
- **Light Mode Palette (`[data-theme="light"]`):**
  - `--bg`: `#F5F3EE`
  - `--surface`: `#FFFFFF`
  - `--surface-elevated`: `#EDEAE3`
  - `--surface-glass`: `rgba(255, 255, 255, 0.92)`
  - `--text`: `#101820`
  - `--muted`: `#55636E`
  - `--border`: `#E4DFD3`
  - `--border-focus`: `#D97736`
  - `--card-hover-border`: `rgba(217, 119, 54, 0.5)`
  - `--car-stage`: `#F4EFE9`
  - Inlined Logo Tokens: `--logo-window: #101820`, `--logo-wheel: #F5F3EE`, `--logo-ring: #101820`
  - Glow Tokens: `--glow-hero: radial-gradient(circle at 50% 32%, rgba(217, 119, 54, 0.18) 0%, transparent 65%)`, `--shadow-brand: 0 4px 16px rgba(217, 119, 54, 0.25)`

### 5.2. Typography & Fonts
- **Headings & Live Wordmark:** `'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` (Weights: 500, 600, 700, 800).
- **Body & Controls:** `'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` (Weights: 400, 500, 600, 700).
- Font scale tokens: `--text-xs: 0.75rem` (12px), `--text-sm: 0.875rem` (14px), `--text-base: 1rem` (16px), `--text-lg: 1.125rem` (18px), `--text-xl: 1.25rem` (20px), `--text-2xl: 1.5rem` (24px), `--text-3xl: 1.875rem` (30px), `--text-4xl: 2.25rem` (36px), `--text-5xl: 3rem` (48px).

### 5.3. Layout Dimensions & Breakpoints
- **Sidebar Dimensions:** Expanded width `--sidebar-width: 260px`; collapsed width `--sidebar-collapsed-width: 72px`.
- **Mobile Controls:** Mobile top header height `--mobile-header-height: 58px`; bottom nav height `--bottom-nav-height: 64px`.
- **Container Limit:** `--max-content-width: 1200px`.
- **Primary Layout Breakpoint (900px):**
  - $\ge 900\text{px}$ (Desktop): App shell uses CSS flex layout (`.app-container`). Desktop persistent sidebar is visible. Sticky filter bar on Catalogue is active. "How It Works" and Support grids display strictly in 3 columns.
  - $< 900\text{px}$ (Mobile/Tablet): App shell switches to single-column block layout (`display: block`). Desktop sidebar hides. Sticky mobile top header and fixed bottom navigation bar become visible. Main content wrapper receives $16\text{px}$ horizontal padding and $88\text{px} + \text{env(safe-area-inset-bottom)}$ clearance. Grids collapse cleanly to single-column flow without orphan cards.

### 5.4. Interaction Effects (`effects.css` & `effects.js`)
1. **Card Hover Zoom:** On devices with `@media (hover: hover) and (pointer: fine)`, hovering `.car-card` elevates the card by `translateY(-4px)` with enhanced drop shadow, while `.car-img-zoom-wrap` scales smoothly to `1.06` over $0.7\text{s}$ using cubic-bezier easing.
2. **Page Fade & Slide:** Route changes apply `.page-fade-in` running a $280\text{ms}$ animation (`opacity: 0 \to 1`, `translateY(10px) \to 0`).
3. **Image Fade-In & Shimmer:** Images render initially at `opacity: 0` with `blur(8px)` over a skeleton shimmer placeholder. Once loaded (`onload`), `loaded` class fades the image in over $600\text{ms}$. Pre-cached images instantly receive `instant-loaded` to bypass transitions. A $600\text{ms}$ failsafe timer ensures no image is permanently stuck in a loading state.
4. **Button Micro-Interactions:** Primary brand buttons display a soft brand shadow on hover and an active click compression of `transform: scale(0.95)`. Action arrows inside buttons (`.btn-arrow`) smoothly nudge $4\text{px}$ to the right on hover.
5. **Sticky Filter Bar:** On the Catalogue page at viewports $\ge 900\text{px}$, an `IntersectionObserver` watches a sentinel element. When scrolled past $6\text{px}$, the filter bar receives `.is-stuck`, applying a translucent backdrop blur (`14px`) and subtle shadow.
6. **Card Cursor Spotlight:** A global `pointermove` listener on devices with fine pointer tracking updates `--mx` and `--my` coordinates on `.car-card`, projecting a subtle radial orange glow (`rgba(217, 119, 54, 0.20)`) following the user's cursor.
7. **Accessibility (`prefers-reduced-motion: reduce`):** Resets all animation durations to $0.001\text{ms}$, disables all `transform` zooms, eliminates blur filters, and removes skeleton shimmers, guaranteeing full WCAG 2.1 compliance for motion-sensitive users.

---

## 6. Data Specifications: Fleet, Slugs, Cities & Hubs

### 6.1. Schema of `cars.json`
Every vehicle record contains the following properties:
- `id` (string): Unique slug identifier.
- `brand` (string): Manufacturer name (e.g., `"Maruti Suzuki"`, `"Hyundai"`).
- `name` (string): Specific vehicle model variant (e.g., `"Swift ZXi+"`, `"Creta SX (O)"`).
- `type` (string): Vehicle category (`"Hatchback"`, `"Sedan"`, `"SUV"`, `"MPV"`, `"EV"`, `"Luxury"`).
- `fuel` (string): Powertrain type (`"Petrol"`, `"Diesel"`, `"Electric"`).
- `transmission` (string): Gearbox type (`"Manual"`, `"Automatic"`).
- `seats` (number): Seating capacity (4, 5, or 7).
- `pricePerDay` (number): Daily rental charge in INR (e.g., `1399`, `7999`).
- `kmPerDay` (number): Standard daily driving allowance (`250`).
- `extraKmRate` (number): Overage rate per kilometre in INR (e.g., `9`, `12`, `25`).
- `mileage` (string): Fuel economy or range (e.g., `"22.5 km/l"`, `"465 km Range"`).
- `rating` (number): Star rating out of 5.0 (e.g., `4.8`, `5.0`).
- `features` (string[]): Key vehicle features (5 entries per vehicle).
- `badge` (string): Visual highlight badge (e.g., `"Popular Economy"`, `"Top Rated SUV"`).
- `credit` (string): Image attribution (`"Demo image"`).
- `image` (string): Relative asset path to 800x500 WebP (`"assets/cars/<slug>.webp"`).
- `cities` (string[]): Array of all 8 supported Indian metropolitan cities.
- `pickupLocations` (string[]): Default hub categories (`"Airport Terminal"`, `"Main Railway Station"`, `"City Centre Hub"`).
- `securityDeposit` (number): Refundable deposit amount in INR (e.g., `2000`, `12000`).
- `isFeatured` (boolean): Flag determining inclusion in Home page featured grid.

### 6.2. The Exact 12 Vehicle Slugs
1. `maruti-swift` — Maruti Suzuki Swift ZXi+ (Hatchback, Petrol, Manual, 5 seats, ₹1,399/day)
2. `hyundai-i20` — Hyundai i20 Asta (O) (Hatchback, Petrol, Manual, 5 seats, ₹1,599/day)
3. `honda-city` — Honda City ZX (Sedan, Petrol, Automatic, 5 seats, ₹2,399/day)
4. `hyundai-verna` — Hyundai Verna SX (O) Turbo (Sedan, Petrol, Automatic, 5 seats, ₹2,599/day)
5. `hyundai-creta` — Hyundai Creta SX (O) (SUV, Diesel, Automatic, 5 seats, ₹2,799/day)
6. `mahindra-thar` — Mahindra Thar LX 4x4 (SUV, Diesel, Manual, 4 seats, ₹3,299/day)
7. `mahindra-xuv700` — Mahindra XUV700 AX7 Luxury (SUV, Diesel, Automatic, 7 seats, ₹3,999/day)
8. `toyota-fortuner` — Toyota Fortuner 4x4 AT (SUV, Diesel, Automatic, 7 seats, ₹4,899/day)
9. `toyota-innova-crysta` — Toyota Innova Crysta ZX (MPV, Diesel, Automatic, 7 seats, ₹3,899/day)
10. `tata-nexon-ev` — Tata Nexon EV Empowered (EV, Electric, Automatic, 5 seats, ₹2,699/day)
11. `mg-zs-ev` — MG ZS EV Exclusive Plus (EV, Electric, Automatic, 5 seats, ₹3,199/day)
12. `mercedes-c-class` — Mercedes-Benz C-Class C200 (Luxury, Petrol, Automatic, 5 seats, ₹7,999/day)

### 6.3. The 8 Supported Cities & Metropolitan Hubs (Exact Client Spellings)
1. **Delhi NCR:** IGI Airport T3, New Delhi Station, Connaught Place
2. **Mumbai:** CSMIA Airport (T2), BKC, Mumbai Central
3. **Bengaluru:** KIA Airport, Majestic Station, Koramangala
4. **Chennai:** Chennai Airport, Central Station, T. Nagar
5. **Kolkata:** NSCBI Airport, Howrah Station, Park Street
6. **Hyderabad:** RGIA Airport, Secunderabad Station, Hitec City
7. **Pune:** Pune Airport, Pune Junction, Koregaon Park
8. **Ahmedabad:** SVPI Airport, Kalupur Station, SG Highway

---

## 7. Current Booking Form & Submission Workflow

### 7.1. Existing Home Search Form (`#home-quick-search-form`)
- **Container:** Located in the centered hero section of `client/js/pages/home.js`.
- **Form Controls:**
  1. `select[name="city"]`: Dropdown with option `All` ("All 8 Cities") and individual options for the 8 cities.
  2. `input[type="date"][name="startDate"]`: Defaults to tomorrow (`min = tomorrow`).
  3. `input[type="date"][name="endDate"]`: Defaults to 4 days from today (`min = tomorrow`).
  4. `select[name="type"]`: Dropdown for "All Types", "Hatchback", "Sedan", "SUV", "MPV", "EV", "Luxury".
  5. `button[type="submit"]`: "Find Cars" button.
- **Current Behavior on Submit:**
  1. Intercepts `submit` event via `e.preventDefault()`.
  2. Extracts form values using `new FormData(searchForm)`.
  3. Invokes `updateFilters({ city, type, startDate, endDate })`.
  4. Sets `window.location.hash = '#catalogue'`, navigating to the Catalogue page with the active filters applied.

### 7.2. Existing "Book" Buttons
- **Locations:** On each car card (`.car-card`), inside the Quick View modal, and in the Compare modal spec table.
- **Current Behavior on Click:**
  1. Handled globally via event delegation in `client/js/app.js` (`[data-action="book"]`).
  2. Extracts `carId` from button attributes.
  3. Retrieves vehicle details from state.
  4. Displays an accessible toast notification:  
     `Selected [Car Name]. Full booking flow with live price calculation connects in Phase 3!`

---

## 8. Working Rules & Engineering Constraints

### 8.1. Working Rules (Pair-Programming Standards)
- **Do only what I ask:** Strictly adhere to the requested task. Do not implement unrequested features, unsolicited refactoring, or out-of-scope edits. Ask before introducing suggestions.
- **Work phase by phase:** Adhere strictly to the roadmap. If something belongs to a later phase (e.g., Phase 3 API integration, Phase 4 cancellation UI, Phase 6 Razorpay), do NOT touch or start it now.
- **Never ask me for secrets:** Never ask for real passwords, private keys, database credentials, or secret tokens. Always provide `.env.example` templates with placeholders and instruct the user where to supply local values.
- **Keep explanations short because I am learning:** Explain briefly *why* specific choices are made without overwhelming theory or verbose preamble. Focus on practical learning.

### 8.2. Non-Negotiable Privacy & Business Rules
1. **Aadhaar Privacy Rule:** Indian Aadhaar numbers consist of 12 digits. Both client and server must validate that the submitted value matches `/^\d{12}$/`. However, the backend must strictly extract and persist ONLY the last 4 digits (`aadhaarLast4 = aadhaar.slice(-4)`). Full 12-digit Aadhaar numbers must NEVER be logged to console, written to log files, persisted in MongoDB, or returned in API responses.
2. **Driving Licence Privacy Rule:** Accept alphanumeric DL inputs, validate format on client and server, and store strictly the last 4 characters (`dlLast4`).
3. **Environment Security:** `server/.env` must NEVER be committed to Git. The `.gitignore` at the repository root strictly ignores `.env` and `.env.*` while allowing `.env.example`.
4. **Authoritative Pricing:** Rental duration (`durationDays`) and total rental cost (`totalCost`) must always be calculated server-side in the booking controller. The server must never trust financial calculations submitted from the client.
5. **Overlapping Booking Prevention:** The booking creation controller must verify that the requested car is not already reserved for an overlapping window. A conflict exists if:  
   `existingStartDate < requestedEndDate && existingEndDate > requestedStartDate` for bookings with status `confirmed` or `active`.
6. **Free Cancellation Policy:** Cancellation is 100% free until 6 hours before the rental start timestamp. This must be strictly enforced in the cancellation controller (`startDate - now > 6 * 3600 * 1000`).
7. **Standard Mileage Allowance:** All vehicles include a mandatory 250 km/day allowance. Overage is billed at the vehicle's specific `extraKmRate` (ranging from ₹9/km for economy hatchbacks to ₹25/km for luxury sedans).

---

## 9. Comprehensive Development Roadmap

### Phase 2: Backend REST API (Ready to Start)
> **Specification:** Full spec prompt defined in [`docs/PHASE2_PROMPT.md`](file:///c:/Users/Lenovo/OneDrive/Desktop/web_d/MAIN2.0/docs/PHASE2_PROMPT.md). Follow this document strictly when implementing `server/`.

- Initialize `server/` with `package.json`, `index.js`, and `.env.example`.
- Configure Express 4.21 / Node.js 20 with `helmet`, `cors`, `express-rate-limit`, `morgan`, and `zod`.
- Connect to MongoDB via Mongoose 8.9 (`MONGO_URI`).
- Implement Mongoose models:
  - `User`: `name`, `email` (unique, lowercase), `passwordHash`, `phone` (optional Indian mobile validation; register accepts only name, email, password), `role`, timestamps, safe `toJSON`.
  - `Car`: `id` (slug), `brand`, `name`, `type`, `fuel`, `transmission`, `seats`, `pricePerDay`, `kmPerDay`, `extraKmRate`, `mileage`, `rating`, `features`, `badge`, `credit`, `image`, `cities` (array of all 8 metros), `pickupLocations`, `securityDeposit`, `isFeatured`.
  - `Booking`: `ref` (unique, `ED-YYMM-XXXX`), `userId`, `userEmail`, `carSlug`, `carName`, `pickupCity`, `pickupLocation`, `startDate`, `endDate`, `durationDays`, `pricePerDay`, `extraKmRate`, `totalCost`, `aadhaarLast4`, `dlLast4`, `status` (`confirmed` | `cancelled`), timestamps.
- Implement REST API routes:
  - `POST /api/auth/register`: Validate inputs, bcrypt hash password (12 rounds), return JWT (7-day expiry) + user info.
  - `POST /api/auth/login`: Validate credentials, return JWT + user info.
  - `GET /api/auth/me` (Protected): Return authenticated user profile.
  - `GET /api/cars`: Query fleet from MongoDB with `city`, `type`, `search`, and `sortBy` filters.
  - `GET /api/cars/:slug`: Return single vehicle record by slug.
  - `GET /api/cars/:slug/booked-dates`: Return active confirmed booking date ranges for datepicker blocking.
  - `POST /api/bookings` (Protected): Verify JWT, validate dates and 12-digit Aadhaar, check overlapping reservations (409 Conflict), compute duration and total cost on server, generate reference, persist `aadhaarLast4` and `dlLast4`, return booking confirmation.
  - `GET /api/bookings/mine` (Protected): Return bookings belonging to `req.user._id`, sorted by `createdAt` descending.
  - `GET /api/bookings/:reference` (Protected): Return single booking details by reference (ownership verified).
  - *Cancellation endpoint postponed to Phase 4 as per roadmap.*
- Fleet seed script (`server/seed/seedCars.js`) reading `client/assets/cars.json` to populate MongoDB with all 12 cars.
- Comprehensive automated test suite (`server/tests/api.test.js`) — 65 tests, 18 suites — using `mongodb-memory-server` (never real DB). Covers all booking validation rules, privacy, pricing, unit logic.

### Phase 3a: Frontend Auth Integration (Completed ✅)
- `client/js/api.js` — shared fetch helper (base URL `http://localhost:5000`, Bearer token, `{success,data}` envelope unwrap, `ApiError` with `{status, message, fieldErrors}`, network error "Cannot reach the server. Is the API running?", 401 auto-handler).
- `client/js/auth.js` — `login`, `register`, `logout`, `restoreSession` (validates stored token with `GET /api/auth/me` on boot), `subscribe`/`onChange`. Safe `localStorage` with in-memory Map fallback. Never logs token or passwords.
- `client/js/components/authDialog.js` — single-instance dialog (`role=dialog`, `aria-modal`, focus trap, Esc, focus return). Tabs: "Sign In" / "Create Account". Fields: name (register only), email, password + show/hide eye toggle. Client validation mirrors server rules. Maps server `fieldErrors` to form fields. Loading state on submit. Toast "Welcome, \<name\>! 👋" on success.
- `client/css/auth.css` — dialog, tabs, inputs, inline field errors, header auth states (mobile + sidebar), Bookings gate, `prefers-reduced-motion` support.
- `client/index.html` — added `auth.css?v=3a` link.
- `client/js/app.js` — `await restoreSession()` before `renderSidebar`; Book button opens auth dialog when logged out.
- `client/js/components/sidebar.js` — `_refreshAuthUi()` surgically swaps `#sidebar-auth-row` and `#mobile-auth-wrap` on auth change without full re-render.
- `client/js/pages/bookings.js` — auth gate when logged out; Phase 1 placeholder when logged in.

### Phase 3b: Catalogue & Home from API (Completed ✅)
- `client/js/api.js` — added `adaptCar(apiCar)` (maps `slug→id`), `fetchCars(filters, {signal})`, `fetchCar(slug)`.
- `client/js/app.js` — replaced `fetch('./assets/cars.json')` with `fetchCars()`. On error logs a short message and keeps `state.cars = []`; each page shows its own error UI.
- `client/js/pages/catalogue.js` — fully rewritten. City/category/search/sort filters all send `GET /api/cars?city=&category=&q=&sort=` to the API. `AbortController` cancels stale requests on rapid filter changes. First load: skeleton loaders. Subsequent filter changes: dims existing cards (opacity 0.4) while new request is in-flight. API error: friendly error card + Retry button. Empty result: "No vehicles match…" + "Clear filters". Count text, sticky filter bar, pills, Phase 1 scroll-reveal and image effects all preserved.
- `client/js/pages/home.js` — updated: featured cars section shows skeletons while loading, error card + Retry button if API fails (Retry re-fetches and re-renders). `import { fetchCars }` added.
- `client/assets/cars.json` — **not deleted**; seed script reads it.

### Phase 3c: Booking Form (Completed ✅)
- `client/js/api.js` — added `fetchBookedDates(slug)` and `createBooking(payload)` (uses `authPost`, never logs Aadhaar/DL/token).
- `client/js/components/bookingModal.js` — new accessible booking modal: city select (filtered to car.cities[]), hub select (driven by CITY_HUBS mirror), date picker with min/max and 30-day cap, Aadhaar (12-digit, first digit 2–9) + DL (4–20 alphanumeric) inputs, live price preview (subtotal + 18% GST estimate, **no deposit line**), server-blocked date conflict check, `POST /api/bookings` submit, success confirmation screen showing only server-returned values (`bookingReference`, `durationDays`, `subtotal`, `taxAmount`, `totalCost`, `aadhaarLast4`, `dlLast4`). Aadhaar and DL are zeroed from state and DOM immediately after the HTTP request completes (success or error) — they never reach localStorage, sessionStorage, app state, the URL, or console logs.

> [!IMPORTANT]
> **CITY_HUBS sync rule:** `const CITY_HUBS` at the top of `client/js/components/bookingModal.js` is a client-side mirror of `server/config/hubs.js`. Whenever hubs are added, renamed, or removed in the server config, the identical change **must** be applied to the client constant in the same commit. The two files are the single source of truth for city → hub mapping on each tier.
- `client/js/app.js` — Book button now calls `openBookingModal(car, bookBtn)` when logged in.
- `client/css/booking.css` — new CSS file: backdrop, panel, sections, fieldsets, inputs, price preview, success screen; responsive to 390px; `prefers-reduced-motion` support.
- `client/index.html` — added `<link rel="stylesheet" href="css/booking.css?v=3c" />`.

### Phase 3d: My Bookings (Completed ✅)
- `client/js/api.js` — added `fetchMyBookings()` (uses `authGet`; returns `data.bookings[]` newest-first).
- `client/js/pages/bookings.js` — fully rewritten: fetches on every visit; loading skeletons (3 cards); trip cards with car image (from loaded fleet by `carSlug`, neutral SVG placeholder if missing), car name, booking reference + copy button (toast "Reference copied"), pickup city + hub, start/end dates formatted with `timeZone:'UTC'` to prevent IST day-shift, duration, total (Indian rupee grouping), status badge, payment badge, masked Aadhaar/DL last-4. Empty state with "Explore Cars" link. Error state with Retry. 401 → auth gate. Logged-out gate unchanged from Phase 3a.
- `client/css/booking.css` — appended trip card styles: `.trip-card`, `.trip-list`, `.trip-badges`, `.trip-badge--*`, `.trip-copy-btn`, `.trip-details`, `.trip-identity-note`, responsive to 390px.

### Phase 4: My Bookings & Cancellation Management
- Update `#bookings` route to display user's live bookings fetched from `GET /api/bookings`.
- Render trip cards showing status badges (`confirmed`, `cancelled`), booking reference, pickup hub, and cost summary.
- Add "Cancel Booking" button with confirmation modal checking the 6-hour cancellation window.
- Add downloadable HTML/PDF receipt generator and QR code confirmation card.

### Phase 5: Admin Dashboard
- Protected admin routes for vehicle CRUD (add, edit, toggle availability).
- Booking management dashboard with date range filters and platform revenue analytics.
- Review system: allow verified users to leave star ratings and comments.

### Phase 5b: Car Owner Listing Feature (Host Program)
- "Host with EasyDrive" feature allowing car owners to list personal vehicles for rent, review booking requests, and track earnings.

### Phase 6: Razorpay Payment Integration (Test Mode)
- Integrate Razorpay Checkout SDK in test mode (`rzp_test_...`).
- Backend order creation endpoint (`POST /api/payments/create-order`) and signature verification endpoint (`POST /api/payments/verify`).

### Phase 7: Final Polish & Placement Preparation
- Lighthouse 90+ audit across Performance, Accessibility, Best Practices, and SEO.
- Cross-browser and small-device testing down to 360px viewport.
- Comprehensive interview documentation and architecture diagrams in root `README.md`.

---

## 10. Known Issues & Parked Items

1. **Toyota Fortuner Plate Text:** The source capture (`client/assets/cars/_source/10_toyota_fortuner.jpg`) contains a slight plate text misspelling artifact. Reprocessing with a clean source photo is parked for later asset polish.
2. **Dark Mode Mobile Browser UI:** Verify dynamic `<meta name="theme-color">` matches `#0B1218` (dark) and `#F5F3EE` (light) across Safari iOS and Chrome Android status bars.
3. **Quick View & Compare Visual Audit:** Periodically review table cell wrapping and modal padding on intermediate tablet viewports (768px to 1024px).
4. **360px Small Viewport Audit:** Ensure long vehicle badges (e.g., "7-Seater Luxury") truncate cleanly with ellipsis and do not cause horizontal page overflow on compact devices (e.g., Samsung Galaxy S8 / iPhone SE).

---

## 11. How to Run the Project Locally

### Static Frontend Server
To preview and test the complete frontend single-page application:
```powershell
# From project root (MAIN2.0)
node client-server.js
```
- Serves the `client/` directory at `http://localhost:3000`.
- Includes automated MIME-type mapping, CORS headers, and SPA fallback to `index.html`.

### Image Processing Pipeline (Pillow)
To re-process or generate car images from `client/assets/cars/_source/`:
```powershell
# Prerequisites: Python 3 with Pillow and NumPy installed
python tools/process_cars.py
```
- Reads raw captures from `client/assets/cars/_source/`.
- Crops frame borders, samples studio backdrop, centers on 16:10 aspect canvas, and exports 800x500 WebPs to `client/assets/cars/`.

### Backend REST API (Phase 2 — Complete)

Start the backend:
```powershell
# From project root (MAIN2.0)
cd server
npm install
# Copy .env.example → .env and fill in MONGODB_URI, JWT_SECRET, CLIENT_ORIGINS, TAX_RATE
copy .env.example .env
# Seed the fleet from client/assets/cars.json (safe to re-run)
npm run seed
# Start dev server (auto-restarts on file changes via node --watch)
npm run dev
```
- API runs on `http://localhost:5000` (or the `PORT` value in your `.env`).
- Connects to the MongoDB URI from `MONGODB_URI`.

### Running Tests
```powershell
cd server
npm test
```
- Uses Node's built-in `node:test` runner — no additional test framework needed.
- Uses `mongodb-memory-server` (devDependency) — **never touches your real database**.
- MongoDB binary is downloaded once on first run (~600 MB) and cached.
- **Result as of Phase 2 completion:** 65 tests pass, 0 fail (18 suites).

### Testing Phase 3a Auth (Browser)

Start both servers, then open **http://localhost:3000** and follow these steps:

1. Click **"Sign In"** in the sidebar footer → auth dialog opens on the Sign In tab.
2. Submit empty → inline validation errors appear on each field.
3. Enter a short password (< 8 chars) → "Password must be at least 8 characters".
4. Enter a password with no number → "Password must contain at least one number".
5. Switch to **"Create Account"** tab, fill name / email / valid password → submit.
   - Dialog closes, toast **"Welcome, \<name\>! 👋"** appears, header shows avatar + name.
6. **Refresh the page** → still logged in (`restoreSession` validates token with the API).
7. Click **"Log out"** → header reverts to "Sign In".
8. Click "Sign In", enter correct email + password → success.
9. Enter wrong password → "Invalid email or password." shown as an inline error.
10. Navigate to **#bookings** while **logged out** → lock icon + "Sign In to See Your Bookings".
11. Navigate to **#bookings** while **logged in** → Phase 1 placeholder.
12. Click any **"Book"** button on a car card while logged out → auth dialog opens.
13. Test at **390 px** viewport width → dialog fills screen, all tabs and fields work.

> **If you see a CORS error:** confirm `CLIENT_ORIGINS=http://localhost:3000` is set in
> `server/.env`. The default `.env.example` already includes it. Do not edit server code.

### Testing Phase 3b Catalogue from API (Browser)

Both servers must be running (`npm start` in `server/`, `node client-server.js` from project root).

1. Open **http://localhost:3000** → navigate to **#catalogue**.
2. Confirm **12 cars** load (skeleton loaders show briefly, then all 12 cards appear).
3. Set city filter to **"Kolkata"** → Mahindra Thar must **not** appear (it doesn't serve Kolkata).
4. Set city to **"All"**, type **"fortuner"** in the search box → only the Toyota Fortuner appears after the 300 ms debounce.
5. Clear search, sort by **"Price: Low to High"** → Maruti Swift (₹1,399/day) should be first.
6. Click any **city tile** on the Home page (e.g. "Mumbai") → navigates to `#catalogue` pre-filtered to Mumbai.
7. **Error state test:** Stop the API (`Ctrl+C` in the server terminal), then click **Retry** in the catalogue error card → error message appears, Retry button is present.
8. Restart the API → click Retry → 12 cars reload correctly.
9. Confirm **Quick View**, **Compare**, **Favourite**, and **theme toggle** still work normally.
10. Test at **390 px** viewport width → filter bar collapses, cards stack to 1 column, all features work.

---

## 12. Phase 2 Backend: API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Server status & ISO timestamp |
| `POST` | `/api/auth/register` | No | `{name, email, password}` → JWT + user |
| `POST` | `/api/auth/login` | No | `{email, password}` → JWT + user |
| `GET` | `/api/auth/me` | Bearer | Authenticated user profile |
| `GET` | `/api/cars` | No | Fleet list (`city`, `type`, `search`, `sortBy` filters) |
| `GET` | `/api/cars/:slug` | No | Single car by slug |
| `GET` | `/api/cars/:slug/booked-dates` | No | Future confirmed booking date ranges |
| `POST` | `/api/bookings` | Bearer | Create reservation (server pricing, overlap check, privacy masking) |
| `GET` | `/api/bookings/mine` | Bearer | Authenticated user's bookings (newest first) |
| `GET` | `/api/bookings/:reference` | Bearer | Single booking by reference (ownership enforced) |

### Rate Limiting
- **`/api/auth` only:** 10 requests per 15 minutes per IP.
- All other routes: unlimited.

### Response Shape (Consistent)
```json
// Success
{ "success": true,  "data": { ... } }
// Error
{ "success": false, "message": "...", "errors": [{ "field": "...", "message": "..." }] }
```

### Privacy Rules (Enforced Server-Side)
- **Aadhaar:** Full 12-digit number validated by Zod, then only `aadhaar.slice(-4)` stored as `aadhaarLast4`. Full number is never logged, stored, or returned.
- **Driving Licence:** Full value validated, only `dl.slice(-4)` stored as `dlLast4`.
- **passwordHash:** `select: false` on schema + `toJSON` transform — never returned in any response.

### Booking Reference Format
`ED-YYMM-XXXX` — e.g. `ED-2610-A3F7`
- `YY` = 2-digit year (26 for 2026)
- `MM` = 2-digit month (10 for October)
- `XXXX` = 4 uppercase hex characters (random, collision-checked)
