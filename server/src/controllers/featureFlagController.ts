import { Request, Response } from 'express';
import * as FeatureFlagModel from '../models/FeatureFlag';

export const getAll = async (req: Request, res: Response) => {
    try {
        const flags = FeatureFlagModel.getAllFlags();
        res.json(flags);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching feature flags', error: error.message });
    }
};

export const getOne = async (req: Request, res: Response) => {
    try {
        const key = req.params.key as string;
        const flag = FeatureFlagModel.getFlag(key);
        if (!flag) return res.status(404).json({ message: 'Feature flag not found' });
        res.json(flag);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching feature flag', error: error.message });
    }
};

export const toggle = async (req: Request, res: Response) => {
    try {
        const key = req.params.key as string;
        const { enabled } = req.body;

        const flag = FeatureFlagModel.getFlag(key);
        if (!flag) return res.status(404).json({ message: 'Feature flag not found' });

        FeatureFlagModel.setFlag(key, enabled);
        res.json({ message: `Feature flag '${key}' updated`, enabled });
    } catch (error: any) {
        res.status(500).json({ message: 'Error updating feature flag', error: error.message });
    }
};
