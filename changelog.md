# Changelog

## [2.2.1] - 2026-04-15
### Fixed
- **Pending payments now stored in dedicated container**: Pending pump payments are fetched from the POS database (`GET /transactions/pump-pending`) and displayed independently of pump state. Resetting a pump no longer removes pending payments from the queue.
- **Pump reset no longer breaks checkout**: Checkout modal receives `pendingTxId` directly from the DB query — no fragile session_id matching. Payment can be completed even after the pump has been reset to IDLE.

### Added
- **Authorize mode selector**: Three pump authorization modes:
  - **Free Pump**: Unlimited dispensing (manual stop)
  - **By Litre**: Set target litres (e.g., 10L) — pump auto-stops when reached
  - **By Rp**: Set target currency amount (e.g., Rp 50,000) — auto-calculates litres and auto-stops
- Auto-calculation preview: shows estimated cost/litres before authorization
- Progress bar during preset pumping with percentage indicator
- PRESET badge on pump card header when using a target

### Changed
- `PumpStateMachine.authorize()` now accepts optional `targetLitres` and `targetCost` parameters
- `PumpStateMachine.updateTelemetry()` returns `boolean` — `true` signals target reached for auto-stop
- `TelemetryEmitter` handles auto-stop when preset target is reached
- `PumpCheckoutModal` no longer searches for pending transactions — receives `pendingTxId` as prop
- Checkout button removed from PumpHMI card — checkout only via Pending Payments queue

## [2.2.0] - 2026-04-15
### Added
- **Multi-Pump Stations**: Run N simultaneous pumping stations (default: 2, configurable via `NUM_PUMPS` env).
  - Each pump has independent state machine (IDLE/AUTHORIZED/PUMPING/COMPLETED/FAULT/LOCKED).
  - REST endpoints parameterized by `:pumpId` (e.g., `/api/pump/1/authorize`).
  - Aggregated telemetry: Socket.io broadcasts `pumps[]` array with per-pump status.
  - Per-pump chaos engine: inject faults independently per station.
  - Pump HMI cards rendered side-by-side in a responsive grid.

- **Semi-Automatic Transaction Workflow**: Complete audit trail for gasoline sales.
  - Completed pump sessions create `PENDING` transactions in POS database.
  - "Pending Checkout" queue shows all pumps awaiting payment.
  - **PumpCheckoutModal**: Cashier checkout with bill summary, customer selection (guest/existing/new), payment method (cash/transfer/QRIS/debit/CC), and cash change calculation.
  - `POST /api/transactions/pump-finalize`: Finalizes pending tx with payment method, customer, and user.
  - `GET /api/transactions/pump-pending`: Lists all pending pump transactions.
  - Transactions include `pump_id` for per-station tracking in reports.

### Changed
- **Database Schema**: Added `pump_id`, `payment_status`, `reference_id`, `cash_handed`, `cash_change`, `adjustment_amount` columns to `transactions` table. Migration runs automatically via seed.
- **Deprecated Components**: Old single-pump HMI components (NozzleAnimation, FlowAnimation, DigitalCounter, PumpControls, ChaosPanel, StatusIndicator) stubbed out — all functionality now lives in the new `PumpHMI` card component.


## [2.1.0] - 2026-04-15
### Added
- **Fuel Storage Tank Simulation**: Underground tank capacity tracking integrated with pump controller.
  - `StorageTankManager` class — per-fuel-type tank with capacity, level, and refueling simulation.
  - Configurable `tank_capacity` (L) and `refuel_speed` (L/s) per fuel type from Settings page.
  - Database migration: added `tank_capacity` and `refuel_speed` columns to `fuel_config`.
  - Pump controller fetches fuel configs from POS API on startup to auto-initialize tanks.
  - Tank deduction during pumping — auto-stops when tank empties.
  - Refueling simulation: tanker delivery fills at configurable speed, auto-completes at capacity.
  - Pump LOCKED state: pump blocked during refueling, auto-unlocks when delivery finishes.
  - New REST endpoints: `GET /api/tank/status`, `POST /api/tank/refuel`, `/refuel/cancel`, `/set-level`, `/reload-config`.
  - `TANK_EMPTY` chaos mode fault — drains active tank to 0.
  - SVG `TankGauge` component — animated vertical bar gauges per fuel type (green/amber/red), refuel pulse, LOW/FILL badges.
  - `TankControlPanel` — refuel/cancel controls, progress bars, manual level slider for testing, PUMP LOCKED indicator.
  - Settings page expanded: inline editing for tank capacity and refuel speed per fuel type.

## [2.0.0] - 2026-04-15
### Added
- **Workshop Labs Framework**: Feature-flag-driven sandbox environment for experimental modules.
  - `feature_flags` SQLite table with API endpoints (`GET/PUT /api/feature-flags`).
  - `fuel_config` SQLite table with full CRUD (`GET/POST/PUT /api/fuel-config`).
  - Master Sandbox Toggle in Settings page with animated toggle switches.
  - Fuel Price Configuration panel in Settings (Pertamax, Pertalite, Solar with inline editing).
  - Conditional "Sandbox" nav item in Sidebar — appears only when sandbox is enabled, with pulsing green indicator.
  - `/sandbox` Launchpad page — module cards with lazy loading via `React.lazy` + `Suspense`.
  - `src/experimental/` directory for isolated sandbox modules.
- **Gasoline Pump Controller Service** (`pump-controller/` — Port 5001):
  - Finite state machine: `IDLE → AUTHORIZED → PUMPING → COMPLETED → FAULT`.
  - Socket.io WebSocket server broadcasting telemetry at ~60fps.
  - REST API: `/api/pump/authorize`, `/start`, `/stop`, `/reset`, `/status`, `/chaos`.
  - Transaction bridge: Injects completed pump sessions into POS ledger via signed JWT.
  - Buffer manager: `buffer.json` persistence for offline resilience with 30s retry loop.
  - Chaos engine: `LOW_PRESSURE` and `NOZZLE_JAM` fault simulation.
- **Animated HMI (Human-Machine Interface)**:
  - SVG nozzle animation with spring-eased off-hook transition and drip particles.
  - SVG flow animation with animated dash-array simulating liquid movement.
  - LCD-style digital counter (litres 3-decimal, Rp cost) with glow effects.
  - Contextual pump controls with fuel selector (dynamic from POS API).
  - Live packet log — terminal-style auto-scrolling JSON payload display.
  - Packet replay — export/import sessions as JSON, playback at 20fps with progress bar.
  - Chaos mode panel with fault trigger/clear buttons.
  - WebSocket connection status indicator with state badges.
- **Transaction Pipeline & Security**:
  - `POST /api/transactions/pump-inject` endpoint with dedicated middleware.
  - Service JWT validation (PUMP_SERVICE_SECRET).
  - Localhost-only origin enforcement for pump injection.
  - Idempotency check via `reference_id` to prevent double-entry.
  - Numeric sanitization (negative values, overflow protection).
  - Pump transactions visible in main Transactions page with `Fuel_Sim` badge.
- **Multi-Service Ecosystem**:
  - Root `package.json` with `concurrently` — single `npm run dev` starts all 3 services.
  - Color-coded terminal output: POS (blue), PUMP (yellow), CLIENT (green).

## [1.3.5] - 2026-04-14
### Changed
- **Network Discovery**: Configured the Next.js frontend to broadcast on all network interfaces (`-H 0.0.0.0`).
- **Distributed API Configuration**: Shifted from `localhost` hardcoding to dynamic IP-based backend targeting. Created `client/.env` to allow cross-device login functionality.
- **Broadcast Status**: Confirmed backend is listening on `0.0.0.0` to allow multi-device workshop access.

## [1.3.4] - 2026-04-14
### Fixed
- **Stale Server Routes**: Resolved an issue where saving a new customer would consistently return a `404 Not Found` error. The problem was caused by a stale Node.js process failing to load the newly registered `/api/customers` routes.
- **Server Process Management**: Performed a full restart of the server on port 5000 to ensure all API endpoints are correctly synchronized and listening for client requests.

## [1.3.3] - 2026-04-14
### Added
- **Custom Service Billing**: New "Add Service" feature in POS to bill for non-inventory items (Labor, Tips, Towing).
- **Cash Handing Logic**: Real-time "Change to Return" calculator in the checkout sidebar.
- **Financial Auditing**: "Cash Handed" and "Change" are now stored in the database for every transaction, enabling full cash-drawer reconciliation.
- **Item Snapshots**: The POS now saves the exact name of items at the time of sale, ensuring receipts remain accurate even if inventory names change.
- **Improved Receipt Layout**: Updated the physical and digital receipts to show cash handover details.

## [1.3.2] - 2026-04-14
### Added
- **"NEW ITEM" Logic**: The inventory ledger now automatically identifies and labels the first stock entry for any product, distinguishing initial stock-up from subsequent restocks.
- **Enhanced Transaction Summary**: The Transaction Report now includes a comprehensive footer summary calculating total Quantity, Cost, Revenue, Margin, and Average Unit Prices over the selected period.
- **Professional Print Mode**: Completely overhauled print CSS (@media print) to ensure high-density tables (including Buy/Sell/Margin) fit perfectly on A4/Letter without cutting off.
- **Financial Color Coding**: Inventory transactions now use Red/Negative (-) for purchases and Green/Positive (+) for sales to represent cash flow direction.

### Changed
- **Renaming**: Rebranded "Inventory Movements" to **Inventory Transactions** and "Custom Analytical Report" to **Transaction Report** for professional consistency.
- **Action Menu Portal**: Refactored the 2x2 action menu to use React Portals, allowing it to "stand outside" table containers and prevent layout shifting or clipping.


## [1.3.0] - 2026-04-14

## [1.2.1] - 2026-04-14
### Added
- **Stock Ledger History**: Added a detailed movement log for products.
- New "History" action button in Inventory table which opens a chronological timeline of all stock-in (Restocks) and stock-out (Sales) events including quantity, price, and invoice references.

## [1.2.0] - 2026-04-14
### Added
- **Custom Report Generation**: Completely overhauled the `/reports` dashboard.
- **Granular Data Engine**: Reports now breakdown sales at the item level to calculate historically accurate margins via saved `buy_price`.
- **Analytics Filters**: Added extensive filter controls (Date Presets, Specific Payment Methods, Specific Categories).
- **Analytical Metrics**: Report results now display aggregated performance summaries (Total Items, Total Revenue, Net Profit) alongside the itemized table.

## [1.1.2] - 2026-04-14
### Added
- **Inventory Restock Logger**: Added a dedicated `product_restocks` table to track incoming stock and historical buy prices.
- **Moving Average Costing**: Automatic recalculation of inventory valuation based on a moving average cost formula when restocking items.
- "Restock" `(+)` action button in the Inventory table for managing stock additions cleanly.

### Changed
- Locked down `SKU`, `Category`, `Stock`, and `Buy Price` fields in the "Edit Product" modal to ensure accounting accuracy via the explicit Restock flow.

## [1.1.1] - 2026-04-14
### Added
- Real-time inventory statistics cards (Valuation, Total Stock, Active Categories, Different Products).
- `GET /api/analytics/inventory` backend endpoint for comprehensive stock metrics.

### Fixed
- Valuation statistics showing Rp 0 by adding the missing "Buy Price / Cost" field to the Product management modal.

## [1.1.0] - 2026-04-14
### Added
- "Manage Categories" modal to Inventory allowing creation and togles of category statuses.
- Simulated loading visual feedback in POS and Inventory when executing DB transactions.
- `/api/analytics/health` backend endpoint for real-time dashboard connection status.
- Dashboard buttons integration ("View All", "Quick Actions", "Generate Report").

### Changed
- POS product selection uses grayscale and disables interaction for inactive categories.
- Inventory component replaces raw text input for category ID with a dynamic dropdown.
- System Time on Dashboard layouts uses Datetime format `YYYY-MM-DD HH:mm:ss`.

## [1.0.1] - 2026-04-14
### Added
- Comprehensive error logging to `authController.ts` and `User.ts` model.
- Startup environment checks in `index.ts` (JWT secret check).
- Detailed request logging (including body) for debugging purposes.
- `client/.env.example` for easier API URL configuration.
- `run_instructions.md` for project initialization on new devices.
- Improved `seed.ts` with default categories and sample products.

### Fixed
- Potential race condition by moving `dotenv.config()` to the absolute top of the server entry point.
- Ghost process issue by identifying and killing orphaned server processes on port 5000.
- `TypeError` in request logger that crashed the server on requests without a body (e.g., getting dashboard stats).
- Foreign Key constraint failure by ensuring default categories exist before adding products.
