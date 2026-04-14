import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import * as inventoryController from '../controllers/inventoryController';

const router = Router();

// Categories
router.get('/categories', authenticateToken, inventoryController.getCategories);
router.post('/categories', authenticateToken, inventoryController.createCategory);

// Products
router.get('/products', authenticateToken, inventoryController.getProducts);
router.post('/products', authenticateToken, inventoryController.createProduct);
router.put('/products/:id', authenticateToken, inventoryController.updateProduct);
router.delete('/products/:id', authenticateToken, inventoryController.deleteProduct);

export default router;
