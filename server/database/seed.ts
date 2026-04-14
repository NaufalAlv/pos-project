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

        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seed();
