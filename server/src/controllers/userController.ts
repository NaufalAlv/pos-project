import { Request, Response } from 'express';
import * as UserModel from '../models/User';
import bcrypt from 'bcryptjs';

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await UserModel.getAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error });
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        const { username, password, role } = req.body;

        // Basic validation
        if (!username || !password || !role) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = await UserModel.createUser({ username, password: hashedPassword, role });

        res.status(201).json({ id: userId, username, role });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        await UserModel.deleteUser(Number(req.params.id));
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user', error });
    }
};
