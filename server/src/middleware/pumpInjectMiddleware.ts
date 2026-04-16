import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/db';

interface PumpInjectRequest extends Request {
    pumpData?: any;
}

/**
 * Middleware to validate pump controller service JWT,
 * enforce origin restrictions, check idempotency, and sanitize data.
 */
export const validatePumpInjection = (req: PumpInjectRequest, res: Response, next: NextFunction) => {
    // 1. Validate Service JWT
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Pump service token required' });
    }

    const pumpSecret = process.env.PUMP_SERVICE_SECRET;
    if (!pumpSecret) {
        console.error('PUMP_SERVICE_SECRET is not configured');
        return res.status(500).json({ message: 'Pump service not configured' });
    }

    try {
        const decoded = jwt.verify(token, pumpSecret);
        req.pumpData = decoded;
    } catch (err) {
        console.error('Pump JWT Verification Error:', err);
        return res.status(403).json({ message: 'Invalid pump service token' });
    }

    // 2. Validate Origin (localhost only)
    const origin = req.headers['origin'] || req.headers['referer'] || '';
    const remoteAddr = req.ip || req.socket.remoteAddress || '';
    
    // Allow localhost connections (IPv4 and IPv6)
    const isLocalhost = remoteAddr === '127.0.0.1' || 
                        remoteAddr === '::1' || 
                        remoteAddr === '::ffff:127.0.0.1' ||
                        remoteAddr.includes('127.0.0.1');
    
    if (!isLocalhost) {
        console.warn(`Pump inject attempt from non-localhost: ${remoteAddr}`);
        return res.status(403).json({ message: 'Pump injection only allowed from localhost' });
    }

    // 3. Check Idempotency (external_transaction_id)
    const { external_transaction_id } = req.body;
    if (!external_transaction_id) {
        return res.status(400).json({ message: 'external_transaction_id is required for idempotency' });
    }

    const existing = db.prepare(
        'SELECT id FROM transactions WHERE reference_id = ?'
    ).get(external_transaction_id);
    
    if (existing) {
        return res.status(409).json({ 
            message: 'Transaction already exists (idempotency check)', 
            existing_id: (existing as any).id 
        });
    }

    // 4. Sanitize numeric values
    const { litres_dispensed, total_cost } = req.body;
    
    if (typeof litres_dispensed !== 'number' || litres_dispensed < 0 || litres_dispensed > 9999) {
        return res.status(400).json({ message: 'Invalid litres_dispensed value' });
    }
    
    if (typeof total_cost !== 'number' || total_cost < 0 || total_cost > 999999999) {
        return res.status(400).json({ message: 'Invalid total_cost value' });
    }

    next();
};
