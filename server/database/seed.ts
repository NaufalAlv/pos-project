import { db } from '../src/config/db';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const migrateToUUID = () => {
    // Check if customers table exists and has id as INTEGER
    const custTableInfo = db.prepare("PRAGMA table_info(customers)").all() as any[];
    const hasGlobalUid = custTableInfo.some((col: any) => col.name === 'global_uid');
    
    if (custTableInfo.length > 0 && !hasGlobalUid) {
        console.log('UUID Migration: Upgrading schema to use UUIDs...');
        
        // 1. Rename existing tables
        db.exec('ALTER TABLE customers RENAME TO customers_old');
        db.exec('ALTER TABLE transactions RENAME TO transactions_old');
        db.exec('ALTER TABLE transaction_items RENAME TO transaction_items_old');
        
        // 2. Re-run schema to create new tables
        const schemaPath = path.resolve(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema);
        
        // 3. Migrate Customers
        const oldCustomers = db.prepare('SELECT * FROM customers_old').all() as any[];
        const customerMap = new Map<number, string>(); // oldId -> newUUID
        
        const insertCust = db.prepare(`
            INSERT INTO customers (global_uid, name, phone, plate_number, created_at)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        for (const cust of oldCustomers) {
            const newUid = crypto.randomUUID();
            customerMap.set(cust.id, newUid);
            insertCust.run(newUid, cust.name, cust.phone, cust.plate_number, cust.created_at);
        }
        
        // 4. Migrate Transactions
        const oldTransactions = db.prepare('SELECT * FROM transactions_old').all() as any[];
        const transactionMap = new Map<number, string>(); // oldTxId -> newTxUUID
        
        const insertTx = db.prepare(`
            INSERT INTO transactions (
                id, invoice_number, user_id, customer_id, total_amount, 
                payment_method, cash_handed, cash_change, adjustment_amount, 
                payment_status, reference_id, pump_id, is_deleted, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const tx of oldTransactions) {
            const newTxUid = crypto.randomUUID();
            transactionMap.set(tx.id, newTxUid);
            
            let newCustId = null;
            if (tx.customer_id) {
                newCustId = customerMap.get(tx.customer_id) || null;
            }
            
            insertTx.run(
                newTxUid, tx.invoice_number, tx.user_id, newCustId, tx.total_amount,
                tx.payment_method, tx.cash_handed || 0, tx.cash_change || 0, tx.adjustment_amount || 0,
                tx.payment_status || 'PAID', tx.reference_id, tx.pump_id, tx.is_deleted || 0, tx.created_at
            );
        }
        
        // 5. Migrate Transaction Items
        const oldItems = db.prepare('SELECT * FROM transaction_items_old').all() as any[];
        const insertItem = db.prepare(`
            INSERT INTO transaction_items (
                transaction_id, product_id, name, quantity, price, buy_price, subtotal
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const item of oldItems) {
            const newTxId = transactionMap.get(item.transaction_id);
            if (newTxId) {
                insertItem.run(
                    newTxId, item.product_id, item.name, item.quantity, 
                    item.price, item.buy_price || 0, item.subtotal
                );
            }
        }
        
        // 6. Drop old tables
        db.exec('DROP TABLE transaction_items_old');
        db.exec('DROP TABLE transactions_old');
        db.exec('DROP TABLE customers_old');
        
        console.log('UUID Migration Complete.');
    } else {
        // Just run schema
        const schemaPath = path.resolve(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema);
        console.log('Schema initialized.');
    }
};

const seed = async () => {
    try {
        // Run Migration and Schema
        migrateToUUID();

        // Check if users exist
        const checkUserStmt = db.prepare('SELECT * FROM users LIMIT 1');
        const userCount = checkUserStmt.get();

        if (!userCount) {
            console.log('No users found. Creating default admin...');

            const username = 'admin';
            const password = 'admin123';
            const hashedPassword = await bcrypt.hash(password, 10);
            const role = 'admin';

            const insertStmt = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
            insertStmt.run(username, hashedPassword, role);

            console.log('------------------------------------------------');
            console.log('Default Admin Created:');
            console.log(`Username: ${username}`);
            console.log(`Password: ${password}`);
            console.log('------------------------------------------------');
        } else {
            console.log('Users already exist. Skipping user seed.');
        }

        // Check if categories exist
        const checkCatStmt = db.prepare('SELECT * FROM categories LIMIT 1');
        if (!checkCatStmt.get()) {
            console.log('No categories found. Creating default categories...');
            const insertCat = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
            insertCat.run('Parts', 'Workshop spare parts and components');
            insertCat.run('Tools', 'Hand tools and machinery');
            insertCat.run('Services', 'Labor and maintenance services');
            console.log('Default categories created.');
        }

        // Check if products exist
        const checkProdStmt = db.prepare('SELECT * FROM products LIMIT 1');
        if (!checkProdStmt.get()) {
            console.log('No products found. Creating sample product...');
            const partsCat = db.prepare('SELECT id FROM categories WHERE name = ?').get('Parts') as { id: number };
            const insertProd = db.prepare('INSERT INTO products (name, sku, price, stock, category_id) VALUES (?, ?, ?, ?, ?)');
            insertProd.run('Universal Oil Filter', 'SKU-OIL-001', 75000, 50, partsCat.id);
            console.log('Sample product created.');
        }

        // Seed Feature Flags (Workshop Labs)
        const checkFlagStmt = db.prepare('SELECT * FROM feature_flags LIMIT 1');
        if (!checkFlagStmt.get()) {
            console.log('No feature flags found. Creating defaults...');
            const insertFlag = db.prepare('INSERT INTO feature_flags (key, enabled, description) VALUES (?, ?, ?)');
            insertFlag.run('sandbox_enabled', 0, 'Master toggle for Workshop Labs sandbox environment');
            insertFlag.run('gasoline_pump_sim', 0, 'Gasoline Pump IoT Digital Twin Simulation');
            console.log('Default feature flags created.');
        }

        // Seed Fuel Config (Workshop Labs - Pump Sim)
        const fuelTableInfo = db.prepare("PRAGMA table_info(fuel_config)").all() as any[];
        const hasTankCapacity = fuelTableInfo.some((col: any) => col.name === 'tank_capacity');
        if (!hasTankCapacity) {
            console.log('Migrating fuel_config: adding tank_capacity and refuel_speed...');
            db.exec('ALTER TABLE fuel_config ADD COLUMN tank_capacity REAL DEFAULT 10000');
            db.exec('ALTER TABLE fuel_config ADD COLUMN refuel_speed REAL DEFAULT 50');
            console.log('Migration complete.');
        }

        const checkFuelStmt = db.prepare('SELECT * FROM fuel_config LIMIT 1');
        if (!checkFuelStmt.get()) {
            console.log('No fuel config found. Creating defaults...');
            const insertFuel = db.prepare('INSERT INTO fuel_config (fuel_type, price_per_litre, tank_capacity, refuel_speed) VALUES (?, ?, ?, ?)');
            insertFuel.run('Pertamax', 12950, 10000, 50);
            insertFuel.run('Pertalite', 10000, 10000, 50);
            insertFuel.run('Solar', 6800, 8000, 40);
            console.log('Default fuel config created.');
        }

        // Migrate users: add is_active column if not present
        const userTableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
        const hasIsActive = userTableInfo.some((col: any) => col.name === 'is_active');
        if (!hasIsActive) {
            console.log('Migrating users: adding is_active column...');
            db.exec('ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
            console.log('Migration complete: users.is_active added.');
        }

        // Migrate transactions: add category column if not present
        const txTableInfo = db.prepare("PRAGMA table_info(transactions)").all() as any[];
        const hasCategory = txTableInfo.some((col: any) => col.name === 'category');
        if (!hasCategory) {
            console.log('Migrating transactions: adding category column...');
            db.exec('ALTER TABLE transactions ADD COLUMN category VARCHAR(50)');
            console.log('Migration complete: transactions.category added.');
        }

        // Seed Transaction Categories
        const checkTxCatStmt = db.prepare('SELECT * FROM transaction_categories LIMIT 1');
        if (!checkTxCatStmt.get()) {
            console.log('No transaction categories found. Creating defaults...');
            const insertTxCat = db.prepare('INSERT INTO transaction_categories (name, is_default) VALUES (?, ?)');
            insertTxCat.run('General', 1);
            insertTxCat.run('Service', 0);
            insertTxCat.run('Parts', 0);
            insertTxCat.run('Fuel Station', 0);
            insertTxCat.run('Towing', 0);
            console.log('Default transaction categories created.');
        }

        // Update existing fuel transactions to use "Fuel Station" category
        db.prepare("UPDATE transactions SET category = 'Fuel Station' WHERE pump_id IS NOT NULL AND category IS NULL").run();

        // Run FTS5 Rebuild to populate virtual tables with existing data
        console.log('Rebuilding FTS5 Search Indices...');
        try {
            db.exec("INSERT INTO customers_fts(customers_fts) VALUES('rebuild');");
            db.exec("INSERT INTO products_fts(products_fts) VALUES('rebuild');");
            console.log('FTS5 Search Indices Rebuilt.');
        } catch (ftsErr) {
            console.error('FTS Rebuild error (might be first run):', ftsErr);
        }

        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seed();
