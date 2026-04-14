import Database from 'better-sqlite3';
import path from 'path';

// ensure the database file is placed in the right directory relative to this file's execution path
// For development (src/config), __dirname is something like server/src/config
const dbPath = path.resolve(__dirname, '../../database/pos_bengkel.db');

const db = new Database(dbPath, {
    verbose: console.log
});

// Enable Write-Ahead Logging for better concurrent performance
db.pragma('journal_mode = WAL');

// Provide an easy way to start/wrap transactions similar to the old pool logic, 
// though better-sqlite3 does this synchronously.
export { db };
