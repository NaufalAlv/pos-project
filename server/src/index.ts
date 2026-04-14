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
console.log('All routes loaded.');

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    if (Object.keys(req.body).length > 0) {
        console.log('Body:', JSON.stringify(req.body, null, 2));
    }
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);

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

