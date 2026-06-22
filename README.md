# Trao AI Travel Planner

Trao AI Travel Planner is a production-ready, secure, multi-user web application that leverages the power of Google Gemini 2.5 Flash to automatically construct structured day-by-day vacation itineraries, forecast realistic travel cost breakdowns, suggest hotels matching traveler profiles, and compile weather-informed packing checklists.

Users can create plans, customize itineraries in real-time (add/remove activities), and dynamically regenerate specific days of the trip using guided AI instructions.

---

## 1. Chosen Tech Stack & Justification

* **Frontend:** Next.js (v13.4 with App Router, TypeScript, and Tailwind CSS)
  * *Justification:* Next.js provides robust server-side rendering capability, file-system routing, and built-in API optimizations. TypeScript ensures type-safety, preventing interface mismatch issues between client structures and Mongoose schemas. Tailwind CSS allows us to implement high-end visual systems (glassmorphism, vibrant dark-mode gradients, and smooth transition animations) cleanly.
* **Backend:** Node.js with Express.js
  * *Justification:* Node/Express acts as an efficient API Gateway. The event-driven, non-blocking I/O model handles REST requests rapidly. By choosing JavaScript/CommonJS for the backend, we maintain simplicity and fast compilation.
* **Database:** MongoDB (via Mongoose ODM)
  * *Justification:* Tripping itineraries, budgets, and checklists are hierarchical documents that are highly nested and naturally map to MongoDB’s flexible BSON document model.
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

## 5. Creative Feature: AI Weather-Aware Packing Assistant

### Why Built?
Travelers routinely struggle to pack appropriate clothing, gear, and transit documents matching both the custom scheduled activities (e.g., hiking shoes for mountains vs. swimwear for beaches) and the climate of the destination.

### Functionality
* The assistant evaluates the destination and generates a tailored packing list.
* The packing items are divided into "Documents", "Clothing", "Gear", and "Other".
* The dashboard lists these items as checkable cards. Checking or unchecking items immediately updates the MongoDB database, persisting packing states across page reloads.

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
   Create a `.env` file inside the `backend` directory (a preloaded Atlas cluster string is already written in your `.env` for quick review):
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://...
   JWT_SECRET=super_secure_secret_key
   GEMINI_API_KEY=your_gemini_api_key
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

## 7. Key Design Decisions & Trade-Offs

1. **Native HTTP Calls for Gemini Integration:** Instead of adding heavy SDK libraries that risk dependency mismatch on older Node.js versions, we implemented a pure, native JavaScript `https` post helper.
2. **Co-located Monorepo vs. Separated Repos:** Co-locating backend and frontend in a single repository simplifies codebase maintenance, simplifies development scripts, and ensures the schema matches on both sides.
3. **No External Icon Packages:** We used pure SVGs and emojis for visual indicators. This keeps bundle sizes light, speeds up initial rendering, and avoids icon-library engine issues during compilation.

---

## 8. Known Limitations

* **Offline Capabilities:** The application relies on active internet access to query the remote MongoDB cluster and contact the Google Gemini API.
* **Checklist Custom Addition:** Packing lists are generated dynamically by the AI. Currently, users can toggle checked statuses, but adding custom personal items to the checklist must be done via the edit controllers (future capability).
