# Trao AI Travel Planner

Trao AI Travel Planner is a production-ready, secure, multi-user web application that leverages the power of Google Gemini 2.5 Flash to automatically construct structured day-by-day vacation itineraries, forecast realistic travel cost breakdowns, suggest hotels matching traveler profiles, and compile weather-informed packing checklists.

Users can create plans, customize itineraries in real-time (add, edit, or remove activities), and dynamically regenerate specific days of the trip using guided AI instructions.

---

## 1. Chosen Tech Stack & Justification

* **Frontend:** Next.js (v13.4 with App Router, TypeScript, and Tailwind CSS)
  * *Justification:* Next.js provides robust server-side rendering capability, file-system routing, and built-in API optimizations. TypeScript ensures type-safety, preventing interface mismatch issues between client structures and Mongoose schemas. Tailwind CSS allows us to implement high-end visual systems (glassmorphism, vibrant dark-mode gradients, and smooth transition animations) cleanly.
* **Backend:** Node.js with Express.js
  * *Justification:* Node/Express acts as an efficient API Gateway. The event-driven, non-blocking I/O model handles REST requests rapidly. By choosing JavaScript/CommonJS for the backend, we maintain simplicity and fast compilation.
* **Database:** MongoDB (via Mongoose ODM)
  * *Justification:* Trip itineraries, budgets, and checklists are hierarchical documents that are highly nested and naturally map to MongoDB's flexible BSON document model.
* **AI Engine:** Google Gemini 2.5 Flash API
  * *Justification:* Gemini 2.5 Flash is highly responsive, offers rapid generation speeds, and natively supports strict JSON mime-type schema constraints.

---

## 2. High-Level Architecture & Data Flow

Client requests are secured via token headers, routed through the Express API layer, authenticated via JWT middleware, and saved into user-isolated MongoDB collections.

```
┌────────────────────────────────────────────────────────┐
│                   Next.js Client (UI)                  │
│    (Auth States, Create Form, Dynamic Trip Dashboard)   │
└───────────┬────────────────────────────────▲───────────┘
            │                                │
      REST Calls                       JSON Responses
 (JWT in Auth Header)           (Strict User-Isolated Data)
            │                                │
┌───────────▼────────────────────────────────┼───────────┐
│               Express.js REST API Server               │
│   ┌────────────────────────────────────────────────┐   │
│   │               Auth Middleware                  │   │
│   │     (Verifies JWT, Attaches req.user context)   │   │
│   └───────────────────────┬────────────────────────┘   │
│                           │                            │
│           ┌───────────────┴───────────────┐            │
│           ▼                               ▼            │
│   ┌───────────────┐               ┌───────────────┐    │
│   │  Trip Routes  │               │  User Routes  │    │
│   └───────┬───────┘               └───────┬───────┘    │
└───────────┼───────────────────────────────┼────────────┘
            │                               │
            ├───────────────┐               │
            ▼               ▼               ▼
 ┌───────────────────┐ ┌─────────┐ ┌─────────────────┐
 │ Google Gemini API │ │ MongoDB │ │  MongoDB Users  │
 │ (LLM Generation)  │ │  Trips  │ │  (Hashed Pass)  │
 └───────────────────┘ └─────────┘ └─────────────────┘
```

---

## 3. Database Modeling & User Isolation

### Database Schema Design
We use two collections: `users` and `trips`.

1. **User Schema (`backend/models/User.js`):**
   * Stores lowercase, unique email addresses.
   * Stores passwords securely using a one-way hash (`bcryptjs`).
2. **Trip Schema (`backend/models/Trip.js`):**
   * Linked to its owner via `userId` (`mongoose.Schema.Types.ObjectId` referencing `User`).
   * Nested `itinerary` array consisting of objects containing `dayNumber` and a sub-document array of `activities` (each activity has a title, description, cost, and time of day).
   * Detailed `estimatedBudget` ledger object.
   * `hotels` recommendations list.
   * `packingList` collection representing the Weather-Aware checklist items.

### Strict User Isolation
* All read, write, edit, and deletion requests pass through `backend/middleware/auth.js`.
* The middleware extracts the signed JWT from the request authorization headers, decodes the token, and attaches the active traveler's ID (`req.user.id`) to the request context.
* Trip controllers query the database using compound filters, ensuring no user can read or write documents where `userId !== req.user.id`:
  ```javascript
  const trip = await Trip.findOne({ _id: tripId, userId: req.user.id });
  ```

---

## 4. AI Agent Design & Prompt Engineering

* **API Endpoints:** Communicates directly with Google Gemini `generateContent` using structured REST inputs.
* **Prompt Constraints:** The LLM is forced to output a single, raw, parseable JSON payload matching the Mongoose schemas.
* **Mime Type Enforcement:** Configured with `responseMimeType: "application/json"`.
* **API Key Resilience:** Includes progressive exponential backoff (retrying up to 5 times) to withstand rate-limiting issues.
* **Graceful Fallbacks:** If the Gemini API key is missing or fails, the backend seamlessly falls back to a rules-based mock generator. This matches traveler preferences and yields highly realistic travel data, making the system 100% testable under any network conditions.

---

## 5. Feature Breakdown & Justifications

### 5.1 Interest-Based AI Itinerary Personalization

#### Why Built?
Generic AI travel plans treat all travelers the same — an adventure enthusiast and a food critic would receive near-identical itineraries for the same destination, making the trip feel impersonal and misaligned with their actual preferences.

#### Functionality
* During trip creation, users select from interest categories: **Food & Dining**, **Culture & History**, **Adventure & Outdoors**, and **Shopping**.
* These interests are passed directly into the Gemini AI prompt, instructing it to prioritize matching activities. For example:
  * A **Food** interest leads to culinary tours, local street food walks, and cooking class inclusions.
  * An **Adventure** interest triggers hiking, zip-lining, snorkeling, and outdoor sports.
  * A **Culture** interest generates museum visits, heritage site tours, and traditional performance shows.
* The fallback mock generator also respects these interests and maps them to a pre-defined library of themed activity templates.

---

### 5.2 AI Weather-Aware Packing Assistant

#### Why Built?
Travelers routinely struggle to pack appropriate clothing, gear, and transit documents matching both the custom scheduled activities (e.g., hiking shoes for mountains vs. swimwear for beaches) and the climate of the destination.

#### Functionality
* The assistant evaluates the destination and generates a tailored packing list.
* The packing items are divided into **Documents**, **Clothing**, **Gear**, and **Other**.
* The dashboard lists these items as checkable cards. Checking or unchecking items immediately updates the MongoDB database, persisting packing states across page reloads.

---

### 5.3 Inline Activity Editor (Add, Edit & Remove)

#### Why Built?
AI-generated plans are starting points, not final answers. Travelers need the freedom to correct inaccuracies, add personal activities (e.g., visiting a friend), or remove activities that no longer apply — without regenerating the entire itinerary.

#### Functionality
* **Add Activity:** A collapsible form on each day card allows users to insert custom activities with a title, description, estimated cost (in their selected currency), and time of day (Morning / Afternoon / Evening).
* **Edit Activity:** Every activity has an inline Edit button that expands an edit form directly on the card — no modal popups needed. Changes are persisted to the database on save.
* **Remove Activity:** Each activity has a delete button with a loading spinner while the request processes. The budget breakdown auto-recalculates after any activity change.
* All operations are API-persisted, meaning changes survive page refreshes.

---

### 5.4 Per-Day AI Regeneration with Custom Instructions

#### Why Built?
Sometimes a single day of the trip just doesn't work. Instead of discarding and regenerating the entire plan, travelers should be able to surgically improve just that one day based on specific feedback.

#### Functionality
* Every day card has an **✨ AI Modify** button.
* Users can type a natural language instruction (e.g., *"Change this day to have outdoor hiking and mountain views instead"*).
* The Gemini API is called with the original day context and the user's modification instruction, returning a brand-new set of activities for that day only.
* The trip's budget is automatically recalculated based on the new activity costs.

---

### 5.5 Destination-Aware Budget Localization

#### Why Built?
Many AI travel apps generate cost estimates anchored to Western European or US price levels, making budgets wildly inaccurate for destinations in South and Southeast Asia or other lower-cost regions. A "Low Budget" trip to Hyderabad is fundamentally different from a "Low Budget" trip to London.

#### Functionality
* The backend detects whether the destination is in a lower cost-of-living region (e.g., India, Thailand, Bali, Vietnam, Nepal) using keyword matching on the destination name.
* When detected, a **cost multiplier** of `0.35×` is applied to activity costs, accommodation rates, food budgets, and transport estimates for Low/Medium tiers (`0.5×` for High tier).
* The Gemini AI prompt was also enhanced with explicit, tier-specific numeric cost guidelines so the LLM produces region-aware estimates, not generic global defaults.

---

### 5.6 Multi-Currency Budget Display

#### Why Built?
When planning an international trip, users think in their home currency — not just USD. Displaying costs in only one currency creates friction and makes the app less useful for a global audience.

#### Functionality
* A currency selector on the dashboard allows users to switch between **USD, EUR, GBP, INR, and JPY**.
* All displayed costs — per-activity, per-category, and the total budget — are dynamically converted using fixed exchange rates.
* The underlying data is always stored in USD in the database, ensuring consistency and accurate re-conversion at any time.

---

### 5.7 Live Interactive Map with Transport Route Visualization

#### Why Built?
A travel planner without a geographic context is harder to use. Travelers need to visualize where they are going, understand the journey from their origin, and see the transport distance before committing to a plan.

#### Functionality
* An embedded **Leaflet.js** map renders on the trip dashboard, showing both the origin and destination pins.
* When a source city is entered during trip creation, the backend geocodes both locations using OpenStreetMap's Nominatim API and calculates the Haversine distance.
* The transport cost is calculated from this real distance using per-km rates for the selected transport mode (Flight, Train, Bus, or Driving).

---

### 5.8 Shareable Trip Link (Public Mode)

#### Why Built?
Travel planning is a collaborative activity. Users may want to share their itinerary with family members, friends joining the trip, or post it in online communities without giving them account access.

#### Functionality
* Users can toggle a **Make Public** switch on their trip card.
* When enabled, a unique shareable URL (e.g., `/share/[tripId]`) is generated and displayed.
* Anyone with the link can view the trip in a read-only mode — without needing to log in — seeing the full itinerary, budget breakdown, hotels, packing list, and climate info.

---

### 5.9 PDF Export via Browser Print

#### Why Built?
Digital itineraries are convenient but unreliable in areas with poor mobile data connectivity. Travelers need an offline-ready, printable format for airport gates, border crossings, or areas without internet access.

#### Functionality
* An **Export PDF** button is available on each itinerary card.
* Clicking it triggers the browser's native print dialog, pre-styled to cleanly print the itinerary without navigation elements, buttons, or dark backgrounds interfering.
* CSS `no-print` class is applied to all interactive controls (Add, Edit, Remove, AI Modify buttons) so the printed output is clean and professional.

---

## 6. Setup & Installation Instructions

### Prerequisites
* Node.js v16+
* Running MongoDB instance or MongoDB Atlas Connection string (pre-configured in `.env`)
* Google Gemini API Key

### Local Quickstart

1. **Clone and Navigate:**
   ```bash
   cd ai-travel-planner
   ```

2. **Configure Environment:**
   Create a `.env` file inside the `backend` directory:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://...
   JWT_SECRET=super_secure_secret_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

   Create a `.env.local` file inside the `frontend` directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

3. **Install Dependencies:**
   Install both servers co-located:
   ```bash
   npm run install:all
   ```

4. **Run Locally:**
   * Start Backend Server:
     ```bash
     npm run dev:backend
     ```
   * Start Next.js Frontend Server:
     ```bash
     npm run dev:frontend
     ```
   * Access the client application at `http://localhost:3000`.

---

## 7. Deployment Guide

This project is designed for separate deployments to avoid serverless function timeout issues with AI generation.

### Backend → Render

1. Create a **Web Service** on [Render](https://render.com).
2. Set **Root Directory** to `backend`.
3. **Build Command:** `npm install`
4. **Start Command:** `npm start`
5. Add environment variables: `MONGO_URI`, `JWT_SECRET`, `GEMINI_API_KEY`.
6. Deploy and copy the provided public URL (e.g., `https://your-app.onrender.com`).

### Frontend → Vercel

1. Create a **New Project** on [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. **Framework Preset:** `Next.js` (auto-detected).
4. Add environment variable:
   * **Key:** `NEXT_PUBLIC_API_URL`
   * **Value:** `https://your-app.onrender.com` *(Render URL from above)*
   * **Environments:** Select all — `Production`, `Preview`, and `Development`.
5. Deploy.

> **Why Separate?** Vercel Hobby plan limits serverless functions to a 10-second execution window. Gemini API calls for multi-day itinerary generation can take 10–20 seconds, which would cause gateway timeouts on Vercel. Render's persistent web service has no such limit.

---

## 8. Key Design Decisions & Trade-Offs

1. **Native HTTP Calls for Gemini Integration:** Instead of adding heavy SDK libraries that risk dependency mismatch on older Node.js versions, we implemented a pure, native JavaScript `https` post helper.
2. **Co-located Monorepo vs. Separated Repos:** Co-locating backend and frontend in a single repository simplifies codebase maintenance, simplifies development scripts, and ensures the schema matches on both sides.
3. **No External Icon Packages:** We used pure SVGs and emojis for visual indicators. This keeps bundle sizes light, speeds up initial rendering, and avoids icon-library engine issues during compilation.
4. **Costs Stored in USD:** All budget figures are stored in USD in MongoDB and converted at display time. This provides a single source of truth, avoids stale conversion issues, and allows currency switching without re-fetching data from the server.
5. **Fallback Mock Generator:** The system is engineered to be fully demonstrable without a Gemini API key, ensuring evaluators and reviewers can assess the full feature set under any network or quota conditions.

---

## 9. Known Limitations

* **Offline Capabilities:** The application relies on active internet access to query the remote MongoDB cluster and contact the Google Gemini API.
* **Checklist Custom Addition:** Packing lists are generated dynamically by the AI. Currently, users can toggle checked statuses, but adding custom personal items to the checklist must be done via the edit controllers (future capability).
* **Exchange Rate Updates:** Currency conversion rates are currently hardcoded at fixed values. Real-time FX rates would require integration with a currency API for fully accurate conversions.
