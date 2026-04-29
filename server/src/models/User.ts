import { db } from '../config/db';

export interface User {
    id?: number;
    username: string;
    password?: string;
    role: 'admin' | 'cashier' | 'mechanic';
    is_active?: number;
    created_at?: string;
}

export const findUserByUsername = async (username: string): Promise<User | null> => {
    try {
        const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
        const user = stmt.get(username) as User | undefined;
        return user || null;
    } catch (error) {
        console.error('findUserByUsername Error:', error);
        throw error;
    }
};

export const findUserById = async (id: number): Promise<User | null> => {
    try {
        const stmt = db.prepare('SELECT id, username, role, is_active, created_at FROM users WHERE id = ?');
        const user = stmt.get(id) as User | undefined;
        return user || null;
    } catch (error) {
        console.error('findUserById Error:', error);
        throw error;
    }
};

export const createUser = async (user: User): Promise<number | bigint> => {
    try {
        const stmt = db.prepare('INSERT INTO users (username, password, role, is_active) VALUES (?, ?, ?, 1)');
        const info = stmt.run(user.username, user.password, user.role);
        return info.lastInsertRowid;
    } catch (error) {
        console.error('createUser Error:', error);
        throw error;
    }
};

export const getAllUsers = async (): Promise<User[]> => {
    try {
        const stmt = db.prepare('SELECT id, username, role, is_active, created_at FROM users');
        return stmt.all() as User[];
    } catch (error) {
        console.error('getAllUsers Error:', error);
        throw error;
    }
};

export const deleteUser = async (id: number): Promise<void> => {
    try {
        const stmt = db.prepare('DELETE FROM users WHERE id = ?');
        stmt.run(id);
    } catch (error) {
        console.error('deleteUser Error:', error);
        throw error;
    }
};

export const toggleUserStatus = async (id: number): Promise<void> => {
    try {
        const stmt = db.prepare('UPDATE users SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?');
        stmt.run(id);
    } catch (error) {
        console.error('toggleUserStatus Error:', error);
        throw error;
    }
};

export const resetUserPassword = async (id: number, hashedPassword: string): Promise<void> => {
    try {
        const stmt = db.prepare('UPDATE users SET password = ? WHERE id = ?');
        stmt.run(hashedPassword, id);
    } catch (error) {
        console.error('resetUserPassword Error:', error);
        throw error;
    }
};
