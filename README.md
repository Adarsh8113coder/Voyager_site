# Travel Globe

An interactive 3D globe (React + TypeScript + React Three Fiber) that shows the cities
you've visited, lets you pick an origin and destination, and shows estimated flight
info between them, with a curved animated flight route on the globe.

## Quick start

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

To type-check / build for production:

```bash
npm run build
npm run preview
```

## What's real vs. sample data

- **Geography** (countries, cities, coordinates, capitals, IATA airport codes) is a
  curated static dataset in `src/data/`, bundled with the app — no external
  geocoding calls at runtime.
- **Flight info** (duration, price, airline, schedule) is **not** pulled from a real
  airline API by default. `src/services/flightService.ts` generates a deterministic
  distance-based estimate and labels every result `source: 'estimated'` or
  `'demo'`. The UI always shows a "Sample / estimated data" / "Demo flight data"
  badge for this. **No fabricated data is ever presented as live.**
- **Currency conversion** uses a small static FX table (also clearly not "live").

## Connecting a real flight API

1. Copy `.env.example` to `.env` and fill in your provider's key/base URL:
   ```
   VITE_FLIGHT_API_KEY=your-key-here
   VITE_FLIGHT_API_BASE_URL=https://api.your-flight-provider.com
   ```
   Never commit `.env` or put a key directly in source — it's already gitignored.
2. Implement the two stub functions at the bottom of `src/services/flightService.ts`:
   - `fetchLiveFlightInfo` — single route lookup, used by the flight info card.
   - `fetchLiveFlightResults` — multi-result search, used by the trip planner.
   They already have a working `fetch(...)` skeleton pointed at your base URL; map
   your provider's response shape onto `FlightInfo` / `FlightResult` from
   `src/types/flight.ts`.
3. That's it — once both env vars are set, `isLiveApiConnected` flips to `true` and
   every consumer of the service (flight card, trip planner) automatically switches
   from estimated/demo data to your live API, including the "Live data" badge.

The same pattern applies if you want to swap in a real geocoding/city dataset or a
live FX-rate API — the `services/` and `data/` folders are the only places that
need to change; the UI just consumes typed data.

## Project structure

```
src/
  components/
    Globe/
      TravelGlobe.tsx    Canvas, camera, orchestrates markers + route
      Earth.tsx           Sphere + grid + atmosphere glow
      CityMarker.tsx       Single city marker (visited/origin/destination/default)
      FlightRoute.tsx      Curved arc + animated aircraft dot
    Search/
      LocationSearch.tsx  Reusable searchable city/country selector
    Flight/
      FlightCard.tsx       Route flight-info summary card
      FlightSearch.tsx     Trip planner form + results list
    Travel/
      TravelHistory.tsx    Add/remove visited cities, grouped by country
      TravelStats.tsx       Stats dashboard
    Country/
      CountryPanel.tsx     Country detail panel on marker click
  services/
    flightService.ts      Flight data abstraction (estimate now, real API later)
    locationService.ts    Distance math + geography lookups
    statsService.ts        Derives travel stats from visited history
  data/
    countries.ts / cities.ts   Curated geography dataset
    visitedSeed.ts               Demo initial travel history
  hooks/
    useTravelHistory.ts    In-memory visited-cities state (add/remove)
  types/
    travel.ts / flight.ts  Shared TypeScript types
  utils/
    geo.ts                  lat/lng ↔ 3D vector + great-circle arc math
  App.tsx                  Layout, state wiring, panel/tab UI
```

## Features implemented

- Drag to rotate, scroll/pinch to zoom the globe (OrbitControls)
- Click a city marker or search to focus the globe and open its country panel
- Visited cities render differently (glowing cyan) from unvisited ones
- Origin/destination pickers with a searchable dropdown
- Animated curved flight route + moving aircraft dot between origin and destination
- Flight info card: duration, distance, stops, estimated price, currency selector,
  clearly labeled as sample/estimated data
- Trip planner with date/passengers/cabin and a demo results list
- Travel history: add/remove visited cities, grouped by country
- Travel stats: countries/cities/continents visited, total distance, most-visited
  country, longest trip, latest destination — all computed from real state, not
  hardcoded
- Country detail panel: capital, continent, visited status, "Plan trip" CTA for
  unvisited countries
- `prefers-reduced-motion` respected (stars and marker/aircraft animation pause)
- Responsive layout: floating glass panel on desktop, bottom sheet on mobile

## Known simplifications

- Country click selection is driven by the nearest city marker rather than full
  country polygon hit-testing (rendering real country border geometry on a sphere
  is a much larger undertaking); this is a deliberate scope cut, not a missing
  feature.
- The Earth surface is a procedurally generated placeholder texture (no external
  image dependency), not a satellite photo — swap in a real texture in
  `Earth.tsx` if you want a photographic look.

---

## Update: worldwide city dataset

`src/data/world-data.json` now holds **192 countries and 33,586 cities** (every city with
population ≥ ~15,000 from GeoNames, plus all 192 capitals). Rows are compact arrays:
`[id, name, countryCode, lat, lng, population, isCapital, iata]`. IATA codes exist for
capitals only. Cities are drawn as a single WebGL `Points` object for performance.
Data © GeoNames (CC BY 4.0) — keep this attribution if you publish the app.

---

## Update: hotel & tourist packages

Selecting any of the 33,586 cities now shows a **Hotel packages** and **Tourist packages**
tab (`src/components/PackagesPanel.tsx`) with 3 options each. Prices, hotel names, perks
and tour highlights are generated deterministically per city
(`src/utils/packages.ts` — seeded so the same city always shows the same packages), since
there's no live inventory or booking API connected. They're clearly labeled as sample data.
To wire in real prices later, replace `hotelPackagesFor` / `tourPackagesFor` with calls to
a hotel/tours API, keeping the same return shape.

---

## Update: real landmark names for 147 major cities

`src/data/landmarks.json` hand-lists 2–4 real, well-known landmarks for 147 major
world cities (capitals + top tourist destinations — Paris, Tokyo, Cairo, Rio, etc.).
For these cities:
- **Tourist packages** show actual landmark names as highlights (e.g. "Visit Eiffel Tower"),
  not generic text.
- **Hotel packages** use real international hotel chain names (Ibis, Hilton, Four Seasons,
  etc.) paired with the city name, instead of made-up hotel names.
A "Real landmarks for this city" badge appears in the panel for these cities.

All other cities (~33,400 of them) keep the generic generated names as before, since
real landmark data for every single city worldwide isn't available in any free dataset —
adding it would require a paid places API. See `hasCuratedLandmarks()` in
`src/utils/packages.ts` to extend the curated list yourself.

---

## Registration, Book Now & Admin (MongoDB)

There are **no user accounts or passwords**. Visitors fill in a **Register** box (Full name + Email ID) once,
then can use **Book now** on flights, hotels and tours. You see everything on the **/admin** page.

The app works with no setup (bundled data); connecting MongoDB turns on registration, bookings and the editable admin.

### How it's built
Small serverless functions in `/api` (plain file names — no brackets): `register`, `bookings`, `packages`,
`world`, `health`, `admin`. They talk to MongoDB Atlas with the official driver.

### 1. MongoDB Atlas (free M0 cluster)
Create a cluster, add a database user, allow `0.0.0.0/0` under Network Access, and copy the connection string.
If the password contains `@` or other symbols, URL-encode them (`@` → `%40`).

### 2. Environment variables (Vercel → Project → Settings → Environment Variables)
| Name | Value |
|---|---|
| `MONGODB_URI` | your full connection string |
| `MONGODB_DB` | `travel_globe` |
| `ADMIN_KEY` | a long private key you invent — you type it on `/admin` |

Add them for **Production, Preview and Development**, then **redeploy** (`vercel --prod --force`).
`JWT_SECRET` is no longer used — you can delete it.

### 3. Load the city data (one time)
```
$env:MONGODB_URI="mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?appName=Cluster0"
node scripts/seed.mjs
```

### 4. Use the admin page
Open `https://your-site/admin`, enter your `ADMIN_KEY`.
- **Registrations** — everyone who registered: full name, email, date.
- **Bookings** — each booking with who made it, what, and price.
- **Countries / Cities / Hotel packages / Tour packages** — add, edit, delete. Search runs on the server, so you can find any of the 33,586 cities.

### Notes
- A booking is a saved record only — no payment is taken, and prices are sample data.
- Emails are **not verified**: anyone can type any email. Fine for a demo; add email verification before a public launch.
- The admin key is a shared secret, not a login. Anyone who has it sees all registrations — keep it private and change it in Vercel if it leaks.
- `npm run dev` (Vite) does not run `/api`; use `vercel dev` to test the backend locally.
