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
            console.log('Users already exist. Skipping seed.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seed();
