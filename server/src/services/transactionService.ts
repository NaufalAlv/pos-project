import { db } from '../config/db';
import { v4 as uuidv4 } from 'uuid';
import { mdmService } from './mdmService';
import { crmService } from './crmService';

export interface TransactionItem {
    product_id: number | null;
    name: string;
    quantity: number;
    price: number;
}

export interface TransactionPayload {
    invoice_number: string;
    user_id: number;
    customer_name?: string;
    customer_phone?: string;
    customer_global_uid?: string;
    total_amount: number;
    payment_method: 'cash' | 'transfer' | 'qris' | 'debit' | 'cc';
    items: TransactionItem[];
    cash_handed?: number;
    cash_change?: number;
    adjustment_amount?: number;
    payment_status?: 'PAID' | 'PENDING' | 'CANCELLED';
    reference_id?: string;
    pump_id?: number;
    category?: string;
    points_redeemed?: number;
}

export const transactionService = {
    createTransaction: (txData: TransactionPayload): string => {
        return db.transaction(() => {
            let global_uid = txData.customer_global_uid;

            // 1. Resolve Customer via MDM
            if (!global_uid && (txData.customer_name || txData.customer_phone)) {
                const cust = mdmService.findOrCreateCustomer(txData.customer_name || 'Walk-in', txData.customer_phone);
                global_uid = cust.global_uid;
            }

            // 2. Create Transaction Record
            const transactionId = uuidv4();
            const insertTxStmt = db.prepare(`
                INSERT INTO transactions (
                    id, invoice_number, user_id, customer_id, total_amount, 
                    payment_method, cash_handed, cash_change,
                    adjustment_amount, payment_status, reference_id, pump_id, category
                ) 
                VALUES (
                    @id, @invoice_number, @user_id, @customer_id, @total_amount, 
                    @payment_method, @cash_handed, @cash_change,
                    @adjustment_amount, @payment_status, @reference_id, @pump_id, @category
                )
            `);
            
            insertTxStmt.run({
                id: transactionId,
                invoice_number: txData.invoice_number,
                user_id: txData.user_id,
                customer_id: global_uid || null,
                total_amount: txData.total_amount,
                payment_method: txData.payment_method,
                cash_handed: txData.cash_handed || 0,
                cash_change: txData.cash_change || 0,
                adjustment_amount: txData.adjustment_amount || 0,
                payment_status: txData.payment_status || 'PAID',
                reference_id: txData.reference_id || null,
                pump_id: txData.pump_id || null,
                category: txData.category || null
            });

            // 3. Process Items
            const checkStockStmt = db.prepare('SELECT stock, buy_price FROM products WHERE id = @product_id');
            const updateStockStmt = db.prepare('UPDATE products SET stock = stock - @quantity WHERE id = @product_id');
            const insertItemStmt = db.prepare(`
                INSERT INTO transaction_items (transaction_id, product_id, name, quantity, price, buy_price, subtotal) 
                VALUES (@transaction_id, @product_id, @name, @quantity, @price, @buy_price, @subtotal)
            `);

            for (const item of txData.items) {
                let buyPrice = 0;
                
                if (item.product_id) {
                    const product = checkStockStmt.get({ product_id: item.product_id }) as { stock: number, buy_price: number } | undefined;
                    if (!product) throw new Error(`Product ${item.product_id} not found`);
                    
                    if (txData.payment_status !== 'CANCELLED') {
                        if (product.stock < item.quantity) throw new Error(`Insufficient stock for product ${item.product_id} (${item.name})`);
                        updateStockStmt.run({ quantity: item.quantity, product_id: item.product_id });
                    }
                    buyPrice = product.buy_price;
                }

                insertItemStmt.run({
                    transaction_id: transactionId,
                    product_id: item.product_id || null,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    buy_price: buyPrice,
                    subtotal: item.quantity * item.price
                });
            }

            // 4. CRM: Add/Redeem Loyalty Points
            if (global_uid && txData.payment_status === 'PAID') {
                if (txData.points_redeemed && txData.points_redeemed > 0) {
                    // Deduct points
                    db.prepare('UPDATE customers SET loyalty_points = MAX(0, loyalty_points - ?) WHERE global_uid = ?')
                        .run(txData.points_redeemed, global_uid);
                } else {
                    // Add points only if they didn't redeem
                    const points = crmService.calculateLoyalty(txData.total_amount);
                    if (points > 0) {
                        crmService.addLoyaltyPoints(global_uid, points);
                    }
                }
            }

            return transactionId;
        })();
    },

    getAllTransactions: (): any[] => {
        const stmt = db.prepare(`
            SELECT t.*, u.username, c.name as customer_name, c.phone as customer_phone,
                   (SELECT SUM(quantity) FROM transaction_items WHERE transaction_id = t.id) as total_items
            FROM transactions t
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN customers c ON t.customer_id = c.global_uid
            WHERE t.is_deleted = 0 OR t.is_deleted IS NULL
            ORDER BY t.created_at DESC
        `);
        const recordset = stmt.all() as any[];
        return recordset.map((tx: any) => ({
            ...tx,
            is_deleted: tx.is_deleted === 1
        }));
    },

    getTransactionById: (id: string): any => {
        const transStmt = db.prepare(`
            SELECT t.*, u.username, c.name as customer_name, c.phone as customer_phone
            FROM transactions t
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN customers c ON t.customer_id = c.global_uid
            WHERE t.id = @id
        `);
        const transaction = transStmt.get({ id }) as any;
        if (!transaction) return null;

        const itemsStmt = db.prepare(`
            SELECT ti.*
            FROM transaction_items ti
            WHERE ti.transaction_id = @id
        `);
        transaction.items = itemsStmt.all({ id });
        return transaction;
    },

    softDeleteTransaction: (id: string): void => {
        db.transaction(() => {
            db.prepare('UPDATE transactions SET is_deleted = 1 WHERE id = @id').run({ id });
            
            const items = db.prepare('SELECT product_id, quantity FROM transaction_items WHERE transaction_id = @id AND product_id IS NOT NULL').all({ id }) as any[];
            const restoreStockStmt = db.prepare('UPDATE products SET stock = stock + @quantity WHERE id = @product_id');
            for (const item of items) {
                restoreStockStmt.run({ quantity: item.quantity, product_id: item.product_id });
            }
        })();
    },

    // Pump endpoints
    createPumpTransaction: (pumpTx: any): string => {
        return db.transaction(() => {
            const invoice_number = `PUMP-${Date.now()}`;
            const transactionId = uuidv4();
            
            let global_uid = pumpTx.global_uid;

            db.prepare(`
                INSERT INTO transactions (
                    id, invoice_number, user_id, customer_id, total_amount, 
                    payment_method, cash_handed, cash_change,
                    adjustment_amount, payment_status, reference_id, pump_id, category
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                transactionId, invoice_number, null, global_uid || null, pumpTx.total_cost,
                'cash', 0, 0, 0, 'PENDING', pumpTx.external_transaction_id, pumpTx.pump_id || null, 'Fuel Station'
            );

            db.prepare(`
                INSERT INTO transaction_items (transaction_id, product_id, name, quantity, price, buy_price, subtotal) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                transactionId, null, `${pumpTx.fuel_type} (Fuel_Sim)`,
                Math.round(pumpTx.litres_dispensed * 1000) / 1000, pumpTx.price_per_litre, 0, pumpTx.total_cost
            );

            return transactionId;
        })();
    },

    getPendingPumpTransactions: (): any[] => {
        return db.prepare(`
            SELECT t.*, c.name as customer_name, c.phone as customer_phone,
                   ti.name as item_name, ti.quantity as litres, ti.price as price_per_litre, ti.subtotal
            FROM transactions t
            LEFT JOIN customers c ON t.customer_id = c.global_uid
            LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
            WHERE t.payment_status = 'PENDING' 
              AND t.reference_id LIKE 'PUMP-%'
              AND (t.is_deleted = 0 OR t.is_deleted IS NULL)
            ORDER BY t.created_at ASC
        `).all() as any[];
    },

    finalizePumpTransaction: (payload: any): void => {
        db.transaction(() => {
            let global_uid = payload.customer_id || null;
            if (!global_uid && (payload.customer_name || payload.customer_phone)) {
                const cust = mdmService.findOrCreateCustomer(payload.customer_name || 'Walk-in', payload.customer_phone);
                global_uid = cust.global_uid;
            }

            const result = db.prepare(`
                UPDATE transactions 
                SET payment_status = 'PAID',
                    payment_method = @payment_method,
                    customer_id = @customer_id,
                    user_id = @user_id,
                    cash_handed = @cash_handed,
                    cash_change = @cash_change,
                    category = COALESCE(category, 'Fuel Station')
                WHERE id = @transaction_id AND payment_status = 'PENDING'
            `).run({
                payment_method: payload.payment_method,
                customer_id: global_uid,
                user_id: payload.user_id || null,
                cash_handed: payload.cash_handed || 0,
                cash_change: payload.cash_change || 0,
                transaction_id: payload.transaction_id,
            });

            if (result.changes === 0) {
                throw new Error(`Transaction ${payload.transaction_id} not found or already finalized`);
            }

            if (global_uid) {
                const tx = db.prepare('SELECT total_amount FROM transactions WHERE id = ?').get(payload.transaction_id) as any;
                if (tx) {
                    const points = crmService.calculateLoyalty(tx.total_amount);
                    if (points > 0) crmService.addLoyaltyPoints(global_uid, points);
                }
            }
        })();
    }
};
