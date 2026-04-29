import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import cors from 'cors';

const app: Express = express();
const port = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
    console.warn('WARNING: JWT_SECRET is not defined in environment variables!');
}

console.log('Loading auth routes...');
import authRoutes from './routes/authRoutes';
console.log('Loading inventory routes...');
import inventoryRoutes from './routes/inventoryRoutes';
console.log('Loading transaction routes...');
import transactionRoutes from './routes/transactionRoutes';
console.log('Loading analytics routes...');
import analyticsRoutes from './routes/analyticsRoutes';
console.log('Loading user routes...');
import userRoutes from './routes/userRoutes';
console.log('Loading report routes...');
import reportRoutes from './routes/reportRoutes';
console.log('Loading customer routes...');
import customerRoutes from './routes/customerRoutes';
console.log('Loading feature flag routes...');
import featureFlagRoutes from './routes/featureFlagRoutes';
console.log('Loading fuel config routes...');
import fuelConfigRoutes from './routes/fuelConfigRoutes';
console.log('Loading search routes...');
import searchRoutes from './routes/searchRoutes';
console.log('Loading audit routes...');
import auditRoutes from './routes/auditRoutes';
console.log('Loading system routes...');
import systemRoutes from './routes/systemRoutes';
import transactionCategoryRoutes from './routes/transactionCategoryRoutes';
import { auditLog } from './services/auditService';
console.log('All routes loaded.');

// CORS: Allow all origins for general API, but pump-inject is restricted in its middleware
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
        // Log Scrubber for Secure Enterprise Core
        const scrubbedBody = JSON.parse(JSON.stringify(req.body));
        const sensitiveKeys = ['password', 'phone', 'phone_number', 'tax_id', 'bank_account', 'plate_number', 'metadata', 'old_value_encrypted', 'new_value_encrypted'];
        
        const scrub = (obj: any) => {
            if (!obj || typeof obj !== 'object') return;
            for (const key in obj) {
                if (sensitiveKeys.includes(key.toLowerCase())) {
                    obj[key] = '***REDACTED***';
                } else if (typeof obj[key] === 'object') {
                    scrub(obj[key]);
                }
            }
        };
        
        scrub(scrubbedBody);
        console.log('Body:', JSON.stringify(scrubbedBody, null, 2));
    }
    next();
});

// Global Mutation Audit Middleware
// Logs all authenticated POST/PUT/PATCH/DELETE requests to audit_logs.
// This runs AFTER route-level auth, so req.user is available.
app.use((req: any, res: any, next: any) => {
    const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (MUTATION_METHODS.includes(req.method) && req.user) {
        // Skip auth endpoint to avoid double-logging (authController already logs LOGIN)
        if (!req.path.startsWith('/api/auth')) {
            auditLog({
                table_name: req.path.split('/')[3] || 'unknown', // e.g. /api/transactions → 'transactions'
                record_id: req.params?.id || 'bulk',
                action: `${req.method}:${req.path}`,
                changed_by: String(req.user?.id || 'unknown'),
                ip_address: req.ip,
                reason: `API mutation via ${req.method} ${req.path}`,
            });
        }
    }
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/feature-flags', featureFlagRoutes);
app.use('/api/fuel-config', fuelConfigRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/transaction-categories', transactionCategoryRoutes);
app.use('/api/audit', auditRoutes);
app.get('/', (req: Request, res: Response) => {
    res.send('POS-Bengkel API is running');
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const server = app.listen(Number(port), '0.0.0.0', () => {
    console.log(`[server]: Server is running and broadcasting at http://0.0.0.0:${port}`);
    console.log(`[server]: Locally accessible at http://localhost:${port}`);
});

server.on('close', () => {
    console.log('Server listener closed!');
});

server.on('error', (err) => {
    console.error('Server listener error:', err);
});

