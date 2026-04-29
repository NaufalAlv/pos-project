import { Request, Response } from 'express';
import * as AnalyticsModel from '../models/Analytics';

import { db } from '../config/db';

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

export const getHealthStatus = async (req: Request, res: Response) => {
    try {
        const dbCheck = db.prepare('SELECT 1').get();
        if (dbCheck) {
            res.json({ status: 'online', database: 'connected', network: 'broadcasting' });
        } else {
            res.status(500).json({ status: 'offline', database: 'disconnected', network: 'unknown' });
        }
    } catch (error) {
        res.status(500).json({ status: 'offline', database: 'error', error: String(error) });
    }
};

export const getInventoryStats = async (req: Request, res: Response) => {
    try {
        const stats = await AnalyticsModel.getInventoryStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching inventory stats', error });
    }
};

export const getMargin = async (req: Request, res: Response) => {
    try {
        const days = req.query.days ? parseInt(req.query.days as string) : 30;
        const data = await AnalyticsModel.getMarginAnalytics(days);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching margin analytics', error });
    }
};

export const getTankProjectionData = async (req: Request, res: Response) => {
    try {
        const data = await AnalyticsModel.getTankProjection();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching tank projection', error });
    }
};
