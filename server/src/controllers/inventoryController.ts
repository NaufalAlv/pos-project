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
