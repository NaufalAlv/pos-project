-- Enable Foreign Key constraints
PRAGMA foreign_keys = ON;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'cashier', 'mechanic')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    contact VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    sku VARCHAR(50) UNIQUE,
    category_id INTEGER,
    supplier_id INTEGER,
    stock INTEGER DEFAULT 0,
    price REAL DEFAULT 0,
    buy_price REAL DEFAULT 0,
    metadata TEXT DEFAULT '{}',
    brand_id INTEGER,
    unit_of_measure VARCHAR(20) DEFAULT 'pcs',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- Customers Table (MDM Golden Record)
CREATE TABLE IF NOT EXISTS customers (
    global_uid TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    plate_number VARCHAR(20),
    metadata TEXT DEFAULT '{}',
    loyalty_points INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER,
    customer_id TEXT,
    total_amount REAL NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer', 'qris', 'debit', 'cc')),
    cash_handed REAL DEFAULT 0,
    cash_change REAL DEFAULT 0,
    adjustment_amount REAL DEFAULT 0,
    payment_status TEXT DEFAULT 'PAID' CHECK (payment_status IN ('PAID', 'PENDING', 'CANCELLED')),
    reference_id TEXT,
    pump_id INTEGER,
    category VARCHAR(50),
    is_deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(global_uid) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);

-- Transaction Items Table
CREATE TABLE IF NOT EXISTS transaction_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT,
    product_id INTEGER,
    name TEXT,
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    buy_price REAL DEFAULT 0,
    subtotal REAL NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id);

-- Product Restocks Table
CREATE TABLE IF NOT EXISTS product_restocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    quantity INTEGER NOT NULL,
    buy_price REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Feature Flags Table (Workshop Labs Infrastructure)
CREATE TABLE IF NOT EXISTS feature_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    enabled INTEGER DEFAULT 0,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Fuel Configuration Table (Workshop Labs - Pump Sim)
CREATE TABLE IF NOT EXISTS fuel_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fuel_type TEXT NOT NULL UNIQUE,
    price_per_litre REAL NOT NULL,
    tank_capacity REAL DEFAULT 10000,
    refuel_speed REAL DEFAULT 50,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Transaction Categories Table
CREATE TABLE IF NOT EXISTS transaction_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs Table (Encrypted)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id TEXT NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_value_encrypted TEXT,
    new_value_encrypted TEXT,
    changed_by TEXT,
    ip_address VARCHAR(45),
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);

-- FTS5 Virtual Tables for Smart Search
CREATE VIRTUAL TABLE IF NOT EXISTS customers_fts USING fts5(
    global_uid UNINDEXED,
    name,
    phone,
    plate_number,
    content='customers',
    content_rowid='rowid'
);

CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
    id UNINDEXED,
    name,
    sku,
    description,
    metadata,
    content='products',
    content_rowid='id'
);

-- Triggers to keep FTS5 tables synced

-- Customers FTS Triggers
CREATE TRIGGER IF NOT EXISTS customers_ai AFTER INSERT ON customers BEGIN
    INSERT INTO customers_fts(rowid, global_uid, name, phone, plate_number)
    VALUES (new.rowid, new.global_uid, new.name, new.phone, new.plate_number);
END;
CREATE TRIGGER IF NOT EXISTS customers_ad AFTER DELETE ON customers BEGIN
    INSERT INTO customers_fts(customers_fts, rowid, global_uid, name, phone, plate_number)
    VALUES ('delete', old.rowid, old.global_uid, old.name, old.phone, old.plate_number);
END;
CREATE TRIGGER IF NOT EXISTS customers_au AFTER UPDATE ON customers BEGIN
    INSERT INTO customers_fts(customers_fts, rowid, global_uid, name, phone, plate_number)
    VALUES ('delete', old.rowid, old.global_uid, old.name, old.phone, old.plate_number);
    INSERT INTO customers_fts(rowid, global_uid, name, phone, plate_number)
    VALUES (new.rowid, new.global_uid, new.name, new.phone, new.plate_number);
END;

-- Products FTS Triggers
CREATE TRIGGER IF NOT EXISTS products_ai AFTER INSERT ON products BEGIN
    INSERT INTO products_fts(rowid, id, name, sku, description, metadata)
    VALUES (new.id, new.id, new.name, new.sku, new.description, new.metadata);
END;
CREATE TRIGGER IF NOT EXISTS products_ad AFTER DELETE ON products BEGIN
    INSERT INTO products_fts(products_fts, rowid, id, name, sku, description, metadata)
    VALUES ('delete', old.id, old.id, old.name, old.sku, old.description, old.metadata);
END;
CREATE TRIGGER IF NOT EXISTS products_au AFTER UPDATE ON products BEGIN
    INSERT INTO products_fts(products_fts, rowid, id, name, sku, description, metadata)
    VALUES ('delete', old.id, old.id, old.name, old.sku, old.description, old.metadata);
    INSERT INTO products_fts(rowid, id, name, sku, description, metadata)
    VALUES (new.id, new.id, new.name, new.sku, new.description, new.metadata);
END;
