# Development Roadmap: POS-Bengkel

## Phase 1: Foundation & Authentication
**Goal**: Establish the technical groundwork and secure access.
- [ ] **Setup**: Initialize Monorepo (Next.js Frontend, Express Backend).
- [ ] **Database**: Setup MySQL instance and basic connection.
- [ ] **Schema**: `users` table (Roles: Admin, Cashier, Mechanic).
- [ ] **Backend**: Authentication API (Login, JWT, Protect Middleware).
- [ ] **Frontend**: 
  - Login Page.
  - Basic Layout (Sidebar, Navbar, Theme).
  - Protected Route wrapper.

## Phase 2: Inventory Management (Core)
**Goal**: Manage the workshop's parts and services.
- [ ] **Schema**: `categories`, `products` (parts/services), `suppliers`.
- [ ] **Backend**: CRUD APIs for Products and Categories.
- [ ] **Frontend**:
  - Inventory Dashboard (List view with search/filter).
  - Add/Edit Product Modal.
  - Stock Adjustment interface.
  - Low Stock Alerts.

## Phase 3: Point of Sale (POS)
**Goal**: The main interface for daily transactions.
- [ ] **Schema**: `transactions`, `transaction_items`, `customers`.
- [ ] **Backend**: 
  - Transaction processing API (Atomic transactions: create record + deduct stock).
  - Customer lookup API.
- [ ] **Frontend**:
  - POS Layout (Product Grid + Cart Sidebar).
  - Add to Cart logic.
  - Checkout Modal (Payment integration placeholders).
  - Receipt generation/printing view.

## Phase 4: Dashboard & Reporting
**Goal**: Insights into business performance.
- [ ] **Backend**: Aggregation queries (Daily Sales, Revenue, Top Selling Items).
- [ ] **Frontend**:
  - Main Dashboard (Key metrics cards, Charts).
  - Reports Page (Date range filters, Export to CSV/PDF).

## Phase 5: Settings & Polish
**Goal**: Configuration and final user experience improvements.
- [ ] **Settings**: User management (Add/Remove staff), Workshop profile.
- [ ] **Network**: Configuration guide for Local IP access.
- [ ] **Testing**: End-to-end testing of critical flows.
