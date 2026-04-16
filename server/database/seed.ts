import { db } from '../src/config/db';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const seed = async () => {
    try {
        // Run Schema
        const schemaPath = path.resolve(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema);
        console.log('Schema initialized.');

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
        // Migration: add tank_capacity and refuel_speed if missing
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

        // Migration: add pump_id to transactions if missing
        const txTableInfo = db.prepare("PRAGMA table_info(transactions)").all() as any[];
        const hasPumpId = txTableInfo.some((col: any) => col.name === 'pump_id');
        if (!hasPumpId) {
            console.log('Migrating transactions: adding pump_id...');
            db.exec('ALTER TABLE transactions ADD COLUMN pump_id INTEGER');
            console.log('Migration complete.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seed();
