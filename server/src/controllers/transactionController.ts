import { Request, Response } from 'express';
import { transactionService } from '../services/transactionService';

export const createTransaction = async (req: Request, res: Response) => {
    try {
        const user_id = (req as any).user.id; // From Auth Middleware
        const { 
            customer_id, 
            customer_global_uid,
            customer_name, 
            customer_phone, 
            items, 
            total_amount, 
            payment_method,
            cash_handed,
            cash_change,
            adjustment_amount,
            payment_status,
            reference_id,
            pump_id,
            points_redeemed,
            category
        } = req.body;

        const invoice_number = `INV-${Date.now()}`;

        const transactionId = transactionService.createTransaction({
            invoice_number,
            user_id,
            customer_global_uid: customer_global_uid || customer_id, // Support old & new
            customer_name,
            customer_phone,
            total_amount,
            payment_method,
            cash_handed,
            cash_change,
            adjustment_amount,
            payment_status,
            items,
            reference_id,
            pump_id,
            points_redeemed,
            category
        });

        res.status(201).json({ message: 'Transaction successful', transactionId, invoice_number });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Transaction failed', error });
    }
};

export const getTransactions = async (req: Request, res: Response) => {
    try {
        const transactions = transactionService.getAllTransactions();
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching transactions', error });
    }
};

export const getTransaction = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const transaction = transactionService.getTransactionById(id as string);
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
        res.json(transaction);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Error fetching transaction', error });
    }
};

export const deleteTransaction = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        transactionService.softDeleteTransaction(id as string);
        res.json({ message: 'Transaction deleted and stock restored' });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Deletion failed', error });
    }
};

export const createPumpTransaction = async (req: Request, res: Response) => {
    try {
        const { 
            external_transaction_id, 
            fuel_type, 
            litres_dispensed, 
            total_cost, 
            price_per_litre,
            pump_id,
            global_uid
        } = req.body;

        const transactionId = transactionService.createPumpTransaction({
            external_transaction_id,
            fuel_type,
            litres_dispensed,
            total_cost,
            price_per_litre,
            pump_id,
            global_uid
        });

        res.status(201).json({ 
            message: 'Pump transaction recorded (PENDING)', 
            transactionId,
            source: 'Pump_Sim'
        });
    } catch (error: any) {
        console.error('Pump Transaction Error:', error);
        res.status(500).json({ message: error.message || 'Pump transaction failed', error });
    }
};

export const getPendingPumpTransactions = async (req: Request, res: Response) => {
    try {
        const pending = transactionService.getPendingPumpTransactions();
        res.json(pending);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching pending pump transactions', error: error.message });
    }
};

export const finalizePumpTransaction = async (req: Request, res: Response) => {
    try {
        const user_id = (req as any).user?.id;
        const { transaction_id, payment_method, customer_id, customer_name, customer_phone, cash_handed, cash_change } = req.body;

        if (!transaction_id || !payment_method) {
            return res.status(400).json({ message: 'transaction_id and payment_method are required' });
        }

        transactionService.finalizePumpTransaction({
            transaction_id,
            payment_method,
            customer_id,
            customer_name,
            customer_phone,
            cash_handed,
            cash_change,
            user_id,
        });

        res.json({ message: 'Pump transaction finalized', transaction_id });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Failed to finalize pump transaction', error });
    }
};
