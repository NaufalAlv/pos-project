import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validatePayload = (schema: ZodSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            return next();
        } catch (error: any) {
            if (error instanceof ZodError || error.name === 'ZodError') {
                return res.status(400).json({
                    message: 'Validation failed',
                    errors: error.errors
                });
            }
            return res.status(500).json({ message: 'Internal server error during validation' });
        }
    };
};
