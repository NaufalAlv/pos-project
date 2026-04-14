# Point of Sale (POS) System with Inventory Management

A comprehensive Point of Sale system built with Node.js, Express, and React, featuring real-time updates, inventory tracking, and detailed reporting.

## Features

- **Dashboard**: Overview of sales, inventory value, and recent transactions.
- **POS Interface**: Fast and efficient checkout process with real-time product search.
- **Inventory Management**:
  - Add, edit, and delete products.
  - Track stock levels and valuation.
  - Restock products with buy price tracking.
- **Reporting**: Generate sales reports with filters.
- **User Management**: Secure login system.
- **Real-time Updates**: Live updates across all connected clients.

## Tech Stack

### Backend
- **Node.js**
- **Express.js**
- **SQLite**
- **Socket.IO**

### Frontend
- **React**
- **TypeScript**
- **Tailwind CSS**
- **Radix UI**

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd pos-project
    ```

2.  **Install Backend Dependencies**
    ```bash
    cd server
    npm install
    ```

3.  **Install Frontend Dependencies**
    ```bash
    cd ../client
    npm install
    ```

### Usage

1.  **Start the Backend**
    ```bash
    cd server
    npm run dev
    ```

2.  **Start the Frontend**
    ```bash
    cd ../client
    npm run dev
    ```

The application will be accessible at `http://localhost:3000`.

## Database

The database is automatically initialized with the necessary tables (`users`, `products`, `categories`, `transactions`, `product_restocks`) on the first run.

## Development Roadmap

### Upcoming: Custom Report Generation Phase
The next major feature development phase focuses on an advanced, highly customizable reporting engine:
- **Granular Data Retrieval**: Reports will break down data at the item level, offering precise margins based on historical `buy_price` and active `sell_price`.
- **Dynamic Filtering**: Allowing administrators to filter sales data by specific Date Ranges (Today, This Week, Month, Custom), Payment Methods, and Product Categories.
- **Aggregated Analytics**: Generating formal report views containing total transactions processed, cumulative revenue, and calculated net profit over the filtered period.
- **Export & Print**: Integrated layout optimizations allowing the generated reports to be directly exported or printed seamlessly from the browser.

## License

[MIT](LICENSE)