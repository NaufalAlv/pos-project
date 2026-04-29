import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/db';

interface AuthRequest extends Request {
    user?: any;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET as string, (err, user) => {
        if (err) {
            console.error('JWT Verification Error:', err.message);
            return res.sendStatus(403);
        }

        // Immediate active-status check: query DB on every authenticated request
        const dbUser = db.prepare('SELECT id, role, is_active FROM users WHERE id = ?').get((user as any).id) as any;
        if (!dbUser || dbUser.is_active === 0) {
            return res.status(403).json({ message: 'Your account has been disabled. Please contact an administrator.' });
        }

        req.user = user;
        next();
    });
};
