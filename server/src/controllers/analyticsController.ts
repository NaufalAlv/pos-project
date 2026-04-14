import { Request, Response } from 'express';
import * as AnalyticsModel from '../models/Analytics';

export const getDashboardData = async (req: Request, res: Response) => {
    try {
        const stats = await AnalyticsModel.getDashboardStats();
        const recentActivity = await AnalyticsModel.getRecentActivity();

        res.json({
            stats,
            recentActivity
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard data', error });
    }
};
