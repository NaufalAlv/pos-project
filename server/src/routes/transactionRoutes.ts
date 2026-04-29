import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { validatePumpInjection } from '../middleware/pumpInjectMiddleware';
import * as transactionController from '../controllers/transactionController';
import { validatePayload } from '../middleware/validate';
import { createTransactionSchema, pumpTransactionSchema, finalizePumpTransactionSchema } from '../schemas';

const router = Router();

// Pump Controller injection endpoint — uses service JWT, not user auth
router.post('/pump-inject', validatePumpInjection, validatePayload(pumpTransactionSchema), transactionController.createPumpTransaction);

// Pump checkout queue — requires user auth
router.get('/pump-pending', authenticateToken, transactionController.getPendingPumpTransactions);
router.post('/pump-finalize', authenticateToken, validatePayload(finalizePumpTransactionSchema), transactionController.finalizePumpTransaction);


router.post('/', authenticateToken, validatePayload(createTransactionSchema), transactionController.createTransaction);
router.get('/', authenticateToken, transactionController.getTransactions);
router.get('/:id', authenticateToken, transactionController.getTransaction);
router.delete('/:id', authenticateToken, transactionController.deleteTransaction);


export default router;
