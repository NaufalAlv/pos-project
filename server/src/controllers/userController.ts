import { Request, Response } from 'express';
import * as UserModel from '../models/User';
import bcrypt from 'bcryptjs';
import { auditLog } from '../services/auditService';
import { db } from '../config/db';

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await UserModel.getAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error });
    }
};

export const createUser = async (req: Request, res: Response) => {
    const actingUser = (req as any).user;
    try {
        const { username, password, role } = req.body;

        if (!username || !password || !role) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = await UserModel.createUser({ username, password: hashedPassword, role });

        auditLog({
            table_name: 'users',
            record_id: String(userId),
            action: 'CREATE',
            changed_by: String(actingUser?.id),
            ip_address: req.ip,
            reason: `Admin created new user "${username}" with role "${role}"`,
        });

        res.status(201).json({ id: userId, username, role });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    const actingUser = (req as any).user;
    try {
        const id = Number(req.params.id);

        // Guard: Prevent deletion of any admin-role user from the API
        const target = await UserModel.findUserById(id);
        if (!target) return res.status(404).json({ message: 'User not found' });
        if (target.role === 'admin') {
            return res.status(403).json({ message: 'Admin accounts cannot be deleted. Disable the account instead or remove it directly from the database.' });
        }

        await UserModel.deleteUser(id);

        auditLog({
            table_name: 'users',
            record_id: String(id),
            action: 'DELETE',
            changed_by: String(actingUser?.id),
            ip_address: req.ip,
            reason: `Admin deleted user "${target.username}"`,
        });

        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user', error });
    }
};

export const toggleUserStatus = async (req: Request, res: Response) => {
    const actingUser = (req as any).user;
    try {
        const id = Number(req.params.id);

        const target = await UserModel.findUserById(id);
        if (!target) return res.status(404).json({ message: 'User not found' });

        const newStatus = target.is_active === 1 ? 0 : 1;
        await UserModel.toggleUserStatus(id);

        auditLog({
            table_name: 'users',
            record_id: String(id),
            action: newStatus === 1 ? 'USER_ENABLED' : 'USER_DISABLED',
            changed_by: String(actingUser?.id),
            ip_address: req.ip,
            reason: `Admin ${newStatus === 1 ? 'enabled' : 'disabled'} user "${target.username}"`,
        });

        res.json({ message: `User ${newStatus === 1 ? 'enabled' : 'disabled'}`, is_active: newStatus });
    } catch (error) {
        res.status(500).json({ message: 'Error toggling user status', error });
    }
};

export const resetUserPassword = async (req: Request, res: Response) => {
    const actingUser = (req as any).user;
    try {
        const id = Number(req.params.id);
        const { new_password } = req.body;

        if (!new_password || new_password.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        const target = await UserModel.findUserById(id);
        if (!target) return res.status(404).json({ message: 'User not found' });

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await UserModel.resetUserPassword(id, hashedPassword);

        auditLog({
            table_name: 'users',
            record_id: String(id),
            action: 'PASSWORD_RESET',
            changed_by: String(actingUser?.id),
            ip_address: req.ip,
            reason: `Admin reset password for user "${target.username}"`,
        });

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error resetting password', error });
    }
};

export const getUserActivity = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;

        const target = await UserModel.findUserById(Number(id));
        if (!target) return res.status(404).json({ message: 'User not found' });

        const logs = db.prepare(`
            SELECT id, table_name, record_id, action, ip_address, reason, created_at
            FROM audit_logs
            WHERE changed_by = ?
            ORDER BY created_at DESC
            LIMIT 200
        `).all(id) as any[];

        res.json({ user: target, activity: logs });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user activity', error });
    }
};
