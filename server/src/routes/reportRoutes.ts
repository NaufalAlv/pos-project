import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import * as reportController from '../controllers/reportController';

const router = Router();

router.get('/custom', authenticateToken, reportController.getCustomReport);

export default router;
