import { Request, Response } from 'express';
import { db } from '../config/db';

export const getTransactionCategories = async (req: Request, res: Response) => {
    try {
        const categories = db.prepare('SELECT * FROM transaction_categories ORDER BY is_default DESC, name ASC').all();
        res.json(categories);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching transaction categories', error: error.message });
    }
};

export const createTransactionCategory = async (req: Request, res: Response) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'Category name is required' });

        // Limit to 10 categories
        const count = db.prepare('SELECT COUNT(*) as count FROM transaction_categories').get() as { count: number };
        if (count.count >= 10) {
            return res.status(400).json({ message: 'Maximum of 10 transaction categories allowed' });
        }

        db.prepare('INSERT INTO transaction_categories (name) VALUES (?)').run(name);
        res.status(201).json({ message: 'Transaction category created' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error creating transaction category', error: error.message });
    }
};

export const deleteTransactionCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const category = db.prepare('SELECT * FROM transaction_categories WHERE id = ?').get(id) as any;
        if (!category) return res.status(404).json({ message: 'Category not found' });
        if (category.is_default) return res.status(400).json({ message: 'Cannot delete default category' });

        db.prepare('DELETE FROM transaction_categories WHERE id = ?').run(id);
        res.json({ message: 'Transaction category deleted' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error deleting transaction category', error: error.message });
    }
};
