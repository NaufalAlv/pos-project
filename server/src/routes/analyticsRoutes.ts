import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import * as analyticsController from '../controllers/analyticsController';

const router = Router();

router.get('/dashboard', authenticateToken, analyticsController.getDashboardData);

export default router;
