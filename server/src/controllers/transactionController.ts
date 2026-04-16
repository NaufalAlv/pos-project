import { Request, Response } from 'express';
import * as TransactionModel from '../models/Transaction';

export const createTransaction = async (req: Request, res: Response) => {
    try {
        const user_id = (req as any).user.id; // From Auth Middleware
        const { 
            customer_id, 
            customer_name, 
            customer_phone, 
            items, 
            total_amount, 
            payment_method,
            cash_handed,
            cash_change,
            adjustment_amount,
            payment_status
        } = req.body;

        // Simple Invoice Number Generation
        const invoice_number = `INV-${Date.now()}`;

        const transactionId = await TransactionModel.createTransaction({
            invoice_number,
            user_id,
            customer_id,
            customer_name,
            customer_phone,
            total_amount,
            payment_method,
            cash_handed,
            cash_change,
            adjustment_amount,
            payment_status,
            items
        });

        res.status(201).json({ message: 'Transaction successful', transactionId, invoice_number });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Transaction failed', error });
    }
};

export const getTransactions = async (req: Request, res: Response) => {
    try {
        const transactions = await TransactionModel.getAllTransactions();
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching transactions', error });
    }
};

export const getTransaction = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const transaction = await TransactionModel.getTransactionById(Number(id));
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
        res.json(transaction);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Error fetching transaction', error });
    }
};

export const deleteTransaction = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await TransactionModel.softDeleteTransaction(Number(id));
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
            pump_id
        } = req.body;

        const transactionId = TransactionModel.createPumpTransaction({
            external_transaction_id,
            fuel_type,
            litres_dispensed,
            total_cost,
            price_per_litre,
            pump_id
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
        const pending = TransactionModel.getPendingPumpTransactions();
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

        TransactionModel.finalizePumpTransaction({
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
