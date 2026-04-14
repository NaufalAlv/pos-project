# Changelog

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
