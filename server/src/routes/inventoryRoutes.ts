import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import * as inventoryController from '../controllers/inventoryController';

const router = Router();

// Categories
router.get('/categories', authenticateToken, inventoryController.getCategories);
router.post('/categories', authenticateToken, inventoryController.createCategory);
router.patch('/categories/:id/toggle', authenticateToken, inventoryController.toggleCategory);

// Products
router.get('/products', authenticateToken, inventoryController.getProducts);
router.post('/products', authenticateToken, inventoryController.createProduct);
router.put('/products/:id', authenticateToken, inventoryController.updateProduct);
router.delete('/products/:id', authenticateToken, inventoryController.deleteProduct);
router.post('/products/:id/restock', authenticateToken, inventoryController.restockProduct);
router.get('/products/:id/history', authenticateToken, inventoryController.getProductHistory);
router.get('/history/global', authenticateToken, inventoryController.getGlobalHistory);

export default router;
