import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import * as fuelConfigController from '../controllers/fuelConfigController';

const router = Router();

router.get('/', authenticateToken, fuelConfigController.getAll);
router.get('/active', authenticateToken, fuelConfigController.getActive);
router.post('/', authenticateToken, fuelConfigController.create);
router.put('/:id/price', authenticateToken, fuelConfigController.updatePrice);
router.put('/:id/tank', authenticateToken, fuelConfigController.updateTankConfig);
router.put('/:id/toggle', authenticateToken, fuelConfigController.toggleActive);

export default router;
