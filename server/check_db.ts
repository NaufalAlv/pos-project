import { db } from './src/config/db';

try {
    console.log('--- Table Info (users) ---');
    const columns = db.prepare("PRAGMA table_info(users)").all();
    console.log(columns);

    console.log('\n--- Sample Data (users) ---');
    const users = db.prepare("SELECT * FROM users LIMIT 1").all();
    console.log(users);
} catch (error) {
    console.error('Database check failed:', error);
}
