import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { unifiedSearchService } from '../services/unifiedSearchService';

const router = express.Router();

router.get('/', authenticateToken, (req: Request, res: Response) => {
    try {
        const query = req.query.q as string;
        if (!query) {
            return res.json([]);
        }

        const results = unifiedSearchService.search(query);
        const txResults = unifiedSearchService.searchTransactions(query);
        res.json([...results, ...txResults]);
    } catch (error: any) {
        console.error('Unified Search Error:', error);
        res.status(500).json({ message: 'Error performing search', error: error.message });
    }
});

export default router;
