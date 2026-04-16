import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { validatePumpInjection } from '../middleware/pumpInjectMiddleware';
import * as transactionController from '../controllers/transactionController';

const router = Router();

// Pump Controller injection endpoint — uses service JWT, not user auth
router.post('/pump-inject', validatePumpInjection, transactionController.createPumpTransaction);

// Pump checkout queue — requires user auth
router.get('/pump-pending', authenticateToken, transactionController.getPendingPumpTransactions);
router.post('/pump-finalize', authenticateToken, transactionController.finalizePumpTransaction);


router.post('/', authenticateToken, transactionController.createTransaction);
router.get('/', authenticateToken, transactionController.getTransactions);
router.get('/:id', authenticateToken, transactionController.getTransaction);
router.delete('/:id', authenticateToken, transactionController.deleteTransaction);


export default router;
