# SYSTEM_MAP.md

> **Last Updated:** v2.3.0 — 2026-04-21
> This file is the authoritative high-level navigation guide for the POS-Bengkel repository. It reflects the current architecture after the **Secure Enterprise Core** upgrade and must be updated alongside `changelog.md`.

---

## 1. Project Summary

- **App Objective:** A modular Workshop POS that has evolved into a privacy-first **MDM/CRM Enterprise Platform** — managing customer identity (Golden Record), loyalty, transaction audit trails, and real-time IoT fuel pump simulation — all over a local network.
- **Current Version:** `2.3.0`
- **Primary Stack:**
    | Layer | Technology |
    | :--- | :--- |
    | Frontend | React, Next.js 16 (App Router), Tailwind CSS v4, Lucide Icons, Axios |
    | Backend | Node.js, Express, Better-SQLite3 (WAL mode, sync API) |
    | Validation | Zod (API payload schemas) |
    | Identity | JWT Auth (users) + UUID (customer/transaction global identifiers) |
    | Security | AES-256-CBC (audit log encryption), Rate-limiting (`express-rate-limit`) |
    | Hardware Sim | Node.js IoT Gateway (Pump Controller) with Socket.io WebSocket |
- **Pattern:** Feature-based Modular Architecture with a **3-Layer Backend** (Routes → Controllers → Services) and a **Golden Record MDM** customer identity model.

---

## 2. Core Logic Flows (Execution Paths)

| Flow | Execution Path |
| :--- | :--- |
| **User Authentication** | `POST /api/auth/login` → `express.json()` → `authController.ts` → `User.ts` (Model) → `pos_bengkel.db` |
| **Transaction Creation** | `POST /api/transactions` → `authMiddleware.ts` → `validate.ts` (Zod) → `transactionController.ts` → **`transactionService.ts`** → `mdmService.ts` (identity) → `crmService.ts` (loyalty) → `pos_bengkel.db` |
| **Pump Injection** | `POST /api/transactions/pump-inject` → `pumpInjectMiddleware.ts` → `validate.ts` (Zod) → `transactionController.ts` → **`transactionService.ts`** → `pos_bengkel.db` (status: `PENDING`) |
| **Pump Finalization** | `POST /api/transactions/pump-finalize` → `authMiddleware.ts` → `validate.ts` (Zod) → `transactionController.ts` → **`transactionService.ts`** → `mdmService.ts` → `crmService.ts` → `pos_bengkel.db` (status: `PAID`) |
| **Customer MDM (Create/Resolve)** | `POST /api/customers` → `authMiddleware.ts` → `customerRoutes.ts` → **`mdmService.findOrCreateCustomer()`** → `pos_bengkel.db` |
| **Sensitive Field Unmask** | `POST /api/customers/:uid/unmask/:field` → `authMiddleware.ts` → `unmaskLimiter` (rate-limit) → role check (`permissions.ts`) → **`auditService.ts`** (log) → plaintext response |
| **360° CRM Timeline** | `GET /api/customers/:id/profile` → `authMiddleware.ts` → `customerRoutes.ts` → **`mdmService.getCustomerByUid()`** + **`crmService.getCustomerTimeline()`** → JSON response |
| **Report Generation** | `GET /api/reports/custom` → `authMiddleware.ts` → `reportController.ts` → `Transaction.ts` (Model) → `pos_bengkel.db` |

---

## 3. Module & File Registry

### Backend — `/server/src/`

| Path/File | Main Public Exports | Role & Responsibility |
| :--- | :--- | :--- |
| `index.ts` | Express App | Entry point: route mounting, global middleware, Log Scrubber, error handler. |
| `config/db.ts` | `db` (Better-SQLite3) | Database singleton with WAL mode. |
| `config/permissions.ts` | `FIELD_VISIBILITY`, `canUnmask()` | RBAC map defining which roles can unmask which sensitive fields. |
| `middleware/authMiddleware.ts` | `authenticateToken` | JWT verification for protected routes. |
| `middleware/validate.ts` | `validatePayload(schema)` | Generic Zod schema validation wrapper. |
| `middleware/pumpInjectMiddleware.ts` | `validatePumpInjection` | Service JWT + localhost-origin enforcement for pump injection. |
| **`services/mdmService.ts`** | `findOrCreateCustomer`, `resolveIdentity`, `getCustomerByUid` | **Golden Record identity engine** — deduplicates and manages customer master data. |
| **`services/crmService.ts`** | `getCustomerTimeline`, `calculateLoyalty`, `addLoyaltyPoints` | **CRM layer** — loyalty calculation (10k IDR = 1pt) and 360° timeline aggregation. |
| **`services/auditService.ts`** | `auditLog`, `encryptField`, `decryptField` | **AES-256-CBC** encrypted audit logging for CRUD and unmask events. |
| **`services/transactionService.ts`** | `createTransaction`, `finalizePumpTransaction`, etc. | **Orchestration layer** — joins MDM and CRM logic into the full transaction lifecycle. |
| `controllers/transactionController.ts` | Request handlers | Thin layer: parses HTTP, delegates to `transactionService`. |
| `controllers/transactionCategoryController.ts` | Request handlers | CRUD for transaction categories (10-limit enforcement). |
| `routes/customerRoutes.ts` | Express Router | Full customer CRUD + CRM profile + unmask endpoints (all auth-protected). |
| `routes/transactionRoutes.ts` | Express Router | Transaction CRUD + pump workflow endpoints with Zod validation. |
| `routes/transactionCategoryRoutes.ts` | Express Router | Endpoints for managing categories. |
| `database/schema.sql` | — | Canonical schema: UUID PKs, `metadata` JSON column, `transaction_categories` lookup. |
| `database/seed.ts` | — | Auto-migrates legacy integer IDs → UUIDs on first run. Seeds defaults. |

### Frontend — `/client/src/`

| Path/File | Role & Responsibility |
| :--- | :--- |
| `app/customers/page.tsx` | Customer list with `MaskedField` for phone, CRM link (`/crm/:id`), loyalty display. |
| `app/crm/[id]/page.tsx` | **360° CRM Profile page** — Identity card, loyalty meter, filterable Activity Timeline. |
| `app/pos/page.tsx` | Main POS sales interface with customer resolution and checkout. |
| `app/inventory/page.tsx` | Product management with stock ledger history and restock modal. |
| `app/sandbox/page.tsx` | Feature-flag-gated launchpad for experimental modules (Pump HMI). |
| `components/ui/MaskedField.tsx` | **Privacy component** — masks sensitive fields, fetches plaintext via unmask API with role check + auto-hide timer. |
| `components/ui/Card.tsx` | Base card with `shadow-premium` (via `globals.css` utility class). |
| `utils/api.ts` | Axios instance with JWT interceptors. |
| `utils/permissions.ts` | Client-side mirror of `FIELD_VISIBILITY` for gating Eye icon visibility before server call. |

### Pump Controller — `/pump-controller/src/`

| Path/File | Role & Responsibility |
| :--- | :--- |
| `index.ts` | HTTP/Socket server entry: manages pump map, tank manager, transaction bridge. |
| `pumpStateMachine.ts` | Encapsulates pump lifecycle (IDLE → AUTHORIZED → PUMPING → COMPLETED → FAULT/LOCKED). |
| `transactionBridge.ts` | POSTs completed pump sessions to POS API; buffers offline with 30s retry loop. |
| `bufferManager.ts` | **Schema v2.0.0** — UUID-keyed offline buffer (`data/buffer.json`); auto-migrates legacy v1 format. |
| `storageTankManager.ts` | Per-fuel-type underground tank simulation with refueling and deduction. |
| `chaosEngine.ts` | Fault injection simulator (LOW_PRESSURE, NOZZLE_JAM, TANK_EMPTY). |
| `telemetryEmitter.ts` | Socket.io broadcaster of pump + tank telemetry at ~60fps. |

---

## 4. State & Identity Management

- **Session State:** Standard React `useState` + `localStorage` for JWT persistence. No Zustand.
- **Master Identity (Golden Record):**
    - Table: `customers` with `global_uid TEXT PRIMARY KEY` (UUID v4).
    - `mdmService.findOrCreateCustomer()` is the **single entry point** for customer resolution — it deduplicates by phone → name before creating.
    - All transactions link to `customers.global_uid` via `transactions.customer_id`.
- **Sensitive Fields:**
    - `phone` stored in plaintext, masked in UI, served via unmask endpoint.
    - `tax_id` stored AES-256 encrypted in the `metadata` JSON column as `tax_id_encrypted`.
- **Loyalty:** `customers.loyalty_points` (INT) — 1 point per 10,000 IDR transaction value.

---

## 5. Data & Environment

- **Config Files:**
    | File | Key Variables |
    | :--- | :--- |
    | `server/.env` | `PORT`, `JWT_SECRET`, `DB_NAME`, `AUDIT_SECRET_KEY` (32-byte AES key) |
    | `server/.env.example` | Same keys with placeholder values |
    | `client/.env` | `NEXT_PUBLIC_API_URL` |
    | `pump-controller/.env` | `PORT`, `PUMP_SERVICE_SECRET`, `POS_API_URL`, `PUMP_DEVICE_ID`, `NUM_PUMPS` |

- **Schema Overview:**
    | Group | Tables |
    | :--- | :--- |
    | Identity / MDM | `users`, `customers` (UUID PK, `metadata` JSON, `loyalty_points`) |
    | Operational | `transactions` (UUID PK), `transaction_items`, `product_restocks` |
    | Catalog | `products`, `categories`, `transaction_categories` |
    | Security | `audit_logs` (AES-256 encrypted payload) |
    | Labs/Config | `feature_flags`, `fuel_config` (`tank_capacity`, `refuel_speed`) |

- **Key Artifacts:**
    - Database: `server/database/pos_bengkel.db` (SQLite, WAL mode)
    - Pump Buffer: `pump-controller/data/buffer.json` (UUID schema v2.0.0)

---

## 6. External Integration & Ports

| Port | Service | Notes |
| :--- | :--- | :--- |
| `5000` | Core POS API | Business logic, MDM/CRM, audit. Listens on `0.0.0.0`. |
| `5001` | Pump Controller | IoT simulation, Socket.io telemetry. Listens on `0.0.0.0`. |
| `3000` | Next.js Frontend | Dev server. Listens on `0.0.0.0` via `-H 0.0.0.0`. |

- **Socket.io:** Pump Controller → Frontend: `state_change`, pump telemetry, tank levels (~60fps).
- **Service JWT:** Pump Controller → POS API `/pump-inject`: signed with `PUMP_SERVICE_SECRET`.

---

## 7. Security Architecture

| Layer | Mechanism |
| :--- | :--- |
| **Transport Auth** | JWT Bearer tokens (user sessions) |
| **Service Auth** | Short-lived service JWTs (`PUMP_SERVICE_SECRET`, 5-min expiry) |
| **Payload Validation** | Zod schemas on all mutating endpoints |
| **Log Privacy** | Log Scrubber middleware redacts `password`, `phone`, `tax_id` from server stdout |
| **Field Masking** | `MaskedField` component + rate-limited server unmask endpoint |
| **RBAC** | `FIELD_VISIBILITY` map (`admin > manager > cashier > mechanic > viewer`) |
| **Audit Trail** | AES-256-CBC encrypted `audit_logs` for every CREATE/UPDATE/DELETE/UNMASK |
| **Input Sanitization** | Parameterized queries (Better-SQLite3 prepared statements) throughout |

---

## 8. Risks & Blind Spots

- **Pre-Migration Databases:** `seed.ts` auto-migrates integer IDs → UUIDs on first run. The `customerRoutes.ts` falls back to `String(c.id)` if `global_uid` is not yet populated, preventing hard crashes.
- **`AUDIT_SECRET_KEY`:** Must be a 32-byte hex string. If missing, AES encryption will fail silently or throw. Required in all environments.
- **Local Configs:** Developers must manually create `.env` files in all three sub-projects (`client/`, `server/`, `pump-controller/`) for the system to function.
- **Network Visibility:** All three services listen on `0.0.0.0`. Static IP configuration is required for stable production access.
- **No ORM:** Direct SQL via Better-SQLite3 prepared statements — schema changes require manual `schema.sql` edits and `seed.ts` migrations.
- **CRM Timeline Completeness:** `crmService.getCustomerTimeline()` aggregates from `transactions`. Fuel events show `source: PUMP_GATEWAY`; workshop services show `source: POS`. Manual entries are not yet supported.
