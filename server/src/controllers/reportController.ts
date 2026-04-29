import { Request, Response } from 'express';
import * as ReportModel from '../models/Report';

export const getCustomReport = async (req: Request, res: Response) => {
    try {
        const filters = {
            startDate: req.query.startDate as string,
            endDate: req.query.endDate as string,
            paymentMethod: req.query.paymentMethod as string,
            categoryId: req.query.categoryId as string,
            transactionCategory: req.query.transactionCategory as string,
        };

        const reportData = await ReportModel.getCustomReport(filters);
        res.json(reportData);
    } catch (error) {
        console.error('Error in getCustomReport:', error);
        res.status(500).json({ message: 'Error generating custom report', error });
    }
};
