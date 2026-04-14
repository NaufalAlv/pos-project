import { Request, Response } from 'express';
import * as InventoryModel from '../models/Inventory';

export const getCategories = async (req: Request, res: Response) => {
    try {
        const categories = await InventoryModel.getAllCategories();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching categories', error });
    }
};

export const createCategory = async (req: Request, res: Response) => {
    try {
        const id = await InventoryModel.createCategory(req.body);
        res.status(201).json({ id, ...req.body });
    } catch (error) {
        res.status(500).json({ message: 'Error creating category', error });
    }
};

export const toggleCategory = async (req: Request, res: Response) => {
    try {
        await InventoryModel.toggleCategoryStatus(Number(req.params.id));
        res.json({ message: 'Category status toggled' });
    } catch (error) {
        res.status(500).json({ message: 'Error toggling category', error });
    }
};

export const getProducts = async (req: Request, res: Response) => {
    try {
        const products = await InventoryModel.getAllProducts();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products', error });
    }
};

export const createProduct = async (req: Request, res: Response) => {
    console.log('Creating product:', req.body);
    try {
        const id = await InventoryModel.createProduct(req.body);
        res.status(201).json({ id, ...req.body });
    } catch (error) {
        console.error('Error in createProduct controller:', error);
        res.status(500).json({ message: 'Error creating product', error });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    try {
        await InventoryModel.updateProduct(Number(req.params.id), req.body);
        res.json({ message: 'Product updated' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating product', error });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        await InventoryModel.deleteProduct(Number(req.params.id));
        res.json({ message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting product', error });
    }
};

export const restockProduct = async (req: Request, res: Response) => {
    try {
        const { quantity, buy_price } = req.body;
        if (!quantity || !buy_price) {
            return res.status(400).json({ message: 'Quantity and buy_price are required' });
        }
        await InventoryModel.restockProduct(Number(req.params.id), Number(quantity), Number(buy_price));
        res.json({ message: 'Product restocked successfully' });
    } catch (error) {
        console.error('Error in restockProduct controller:', error);
        res.status(500).json({ message: 'Error restocking product', error });
    }
};

export const getProductHistory = async (req: Request, res: Response) => {
    try {
        const history = await InventoryModel.getProductHistory(Number(req.params.id));
        res.json(history);
    } catch (error) {
        console.error('Error in getProductHistory controller:', error);
        res.status(500).json({ message: 'Error fetching product history', error });
    }
};

export const getGlobalHistory = async (req: Request, res: Response) => {
    try {
        const filters = {
            categoryId: req.query.categoryId as string,
            startDate: req.query.startDate as string,
            endDate: req.query.endDate as string,
            search: req.query.search as string
        };
        const history = await InventoryModel.getGlobalInventoryHistory(filters);
        res.json(history);
    } catch (error) {
        console.error('Error in getGlobalHistory controller:', error);
        res.status(500).json({ message: 'Error fetching global inventory history', error });
    }
};

