# Changelog

## [1.3.0] - 2026-04-14
### Added
- **Global Inventory Movements**: New dedicated page for viewing all stock transactions across the shop.
- **Advanced Filtering & Sorting**: Both Inventory and History pages now support searching, category filtering, and clickable column headers for sorting (High ↔ Low).
- **UI Refactor (Action Menu)**: Replaced row action buttons with a single `MoreVertical` (triple dots) button that opens a compact 2x2 clustered icon menu for History, Restock, Edit, and Delete.
- **Navigation**: Added "View All Movements" shortcut to the Inventory dashboard.

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
