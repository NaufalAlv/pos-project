import { db } from '../config/db';

export interface User {
    id?: number;
    username: string;
    password?: string;
    role: 'admin' | 'cashier' | 'mechanic';
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

export const createUser = async (user: User): Promise<number | bigint> => {
    try {
        const stmt = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
        const info = stmt.run(user.username, user.password, user.role);
        return info.lastInsertRowid;
    } catch (error) {
        console.error('createUser Error:', error);
        throw error;
    }
};

export const getAllUsers = async (): Promise<User[]> => {
    try {
        const stmt = db.prepare('SELECT id, username, role, created_at FROM users');
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
