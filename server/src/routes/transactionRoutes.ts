import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import * as transactionController from '../controllers/transactionController';

const router = Router();

router.post('/', authenticateToken, transactionController.createTransaction);
router.get('/', authenticateToken, transactionController.getTransactions);
router.get('/:id', authenticateToken, transactionController.getTransaction);
router.delete('/:id', authenticateToken, transactionController.deleteTransaction);

export default router;
