import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import * as featureFlagController from '../controllers/featureFlagController';

const router = Router();

router.get('/', authenticateToken, featureFlagController.getAll);
router.get('/:key', authenticateToken, featureFlagController.getOne);
router.put('/:key', authenticateToken, featureFlagController.toggle);

export default router;
