import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import * as analyticsController from '../controllers/analyticsController';

const router = Router();

router.get('/dashboard', authenticateToken, analyticsController.getDashboardData);
router.get('/health', authenticateToken, analyticsController.getHealthStatus);
router.get('/inventory', authenticateToken, analyticsController.getInventoryStats);
router.get('/margin', authenticateToken, analyticsController.getMargin);
router.get('/tank-projection', authenticateToken, analyticsController.getTankProjectionData);

export default router;
