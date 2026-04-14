import { db } from '../config/db';

export interface Customer {
    id: number;
    name: string;
    phone: string | null;
    plate_number: string | null;
    created_at: string;
}

export const searchCustomersByPhone = (phone: string): Customer[] => {
    const stmt = db.prepare('SELECT * FROM customers WHERE phone LIKE ? AND (is_deleted = 0 OR is_deleted IS NULL) LIMIT 10');
    return stmt.all(`${phone}%`) as Customer[];
};

export const getCustomerById = (id: number): Customer | undefined => {
    const stmt = db.prepare('SELECT * FROM customers WHERE id = ?');
    return stmt.get(id) as Customer | undefined;
};

export const getAllCustomers = (): Customer[] => {
    const stmt = db.prepare('SELECT * FROM customers WHERE is_deleted = 0 OR is_deleted IS NULL ORDER BY created_at DESC');
    return stmt.all() as Customer[];
};

export const createCustomer = (name: string, phone?: string, plate_number?: string): number => {
    const stmt = db.prepare('INSERT INTO customers (name, phone, plate_number) VALUES (?, ?, ?)');
    const info = stmt.run(name, phone || null, plate_number || null);
    return info.lastInsertRowid as number;
};

export const updateCustomer = (id: number, name: string, phone?: string, plate_number?: string): void => {
    const stmt = db.prepare('UPDATE customers SET name = ?, phone = ?, plate_number = ? WHERE id = ?');
    stmt.run(name, phone || null, plate_number || null, id);
};

export const deleteCustomer = (id: number): void => {
    const stmt = db.prepare('UPDATE customers SET is_deleted = 1 WHERE id = ?');
    stmt.run(id);
};
