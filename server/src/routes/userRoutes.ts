import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import * as userController from '../controllers/userController';

const router = Router();

router.get('/', authenticateToken, userController.getUsers);
router.post('/', authenticateToken, userController.createUser);
router.delete('/:id', authenticateToken, userController.deleteUser);
router.patch('/:id/toggle', authenticateToken, userController.toggleUserStatus);
router.post('/:id/reset-password', authenticateToken, userController.resetUserPassword);
router.get('/:id/activity', authenticateToken, userController.getUserActivity);

export default router;
