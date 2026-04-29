import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUser, findUserByUsername } from '../models/User';
import { auditLog } from '../services/auditService';

export const register = async (req: Request, res: Response) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) return res.status(400).json({ message: 'All fields are required' });

    try {
        const existingUser = await findUserByUsername(username);
        if (existingUser) return res.status(400).json({ message: 'Username already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = await createUser({ username, password: hashedPassword, role });

        res.status(201).json({ message: 'User created', userId });
    } catch (error: any) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const login = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    try {
        const user = await findUserByUsername(username);
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        // Check if the account is active before even verifying password
        if ((user as any).is_active === 0) {
            auditLog({
                table_name: 'users',
                record_id: String(user.id),
                action: 'LOGIN_BLOCKED',
                changed_by: String(user.id),
                ip_address: req.ip || req.socket?.remoteAddress,
                reason: `Login attempt blocked — account "${username}" is disabled`,
            });
            return res.status(403).json({ message: 'Account is disabled. Contact an administrator.' });
        }

        const isMatch = await bcrypt.compare(password, user.password || '');
        if (!isMatch) {
            auditLog({
                table_name: 'users',
                record_id: String(user.id),
                action: 'LOGIN_FAILED',
                changed_by: String(user.id),
                ip_address: req.ip || req.socket?.remoteAddress,
                reason: `Failed login attempt for user "${username}" — incorrect password`,
            });
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '1d' });

        // Audit the login event
        auditLog({
            table_name: 'users',
            record_id: String(user.id),
            action: 'LOGIN',
            changed_by: String(user.id),
            ip_address: req.ip || req.socket?.remoteAddress,
            reason: `User "${username}" logged in successfully`,
        });

        res.json({ token, role: user.role, username: user.username });
    } catch (error: any) {
        console.error('Login Error:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message,
            stack: error.stack 
        });
    }
};
