import { z } from 'zod';

export const transactionItemSchema = z.object({
    product_id: z.number().nullable(),
    name: z.string().min(1),
    quantity: z.number().positive(),
    price: z.number().nonnegative(),
});

export const createTransactionSchema = z.object({
    body: z.object({
        customer_id: z.union([z.string(), z.number()]).optional().nullable(),
        customer_global_uid: z.string().uuid().optional().nullable(),
        customer_name: z.string().optional().nullable(),
        customer_phone: z.string().optional().nullable(),
        items: z.array(transactionItemSchema).min(1),
        total_amount: z.number().nonnegative(),
        payment_method: z.enum(['cash', 'transfer', 'qris', 'debit', 'cc']),
        cash_handed: z.number().optional(),
        cash_change: z.number().optional(),
        adjustment_amount: z.number().optional(),
        payment_status: z.enum(['PAID', 'PENDING', 'CANCELLED']).optional(),
        reference_id: z.string().optional(),
        pump_id: z.number().optional(),
        points_redeemed: z.number().optional()
    })
});

export const pumpTransactionSchema = z.object({
    body: z.object({
        external_transaction_id: z.string(),
        fuel_type: z.string(),
        litres_dispensed: z.number().positive(),
        total_cost: z.number().nonnegative(),
        price_per_litre: z.number().positive(),
        pump_id: z.number().optional(),
        global_uid: z.string().uuid().optional()
    })
});

export const finalizePumpTransactionSchema = z.object({
    body: z.object({
        transaction_id: z.string().uuid(),
        payment_method: z.enum(['cash', 'transfer', 'qris', 'debit', 'cc']),
        customer_id: z.union([z.string(), z.number()]).optional().nullable(),
        customer_name: z.string().optional().nullable(),
        customer_phone: z.string().optional().nullable(),
        cash_handed: z.number().optional(),
        cash_change: z.number().optional()
    })
});
