import express from 'express';
import { getTransactionCategories, createTransactionCategory, deleteTransactionCategory } from '../controllers/transactionCategoryController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getTransactionCategories);
router.post('/', createTransactionCategory);
router.delete('/:id', deleteTransactionCategory);

export default router;
