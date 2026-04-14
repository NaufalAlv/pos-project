import { db } from '../config/db';

export interface TransactionItem {
    product_id: number | null;
    name: string;
    quantity: number;
    price: number;
}

export interface Transaction {
    id?: number;
    invoice_number: string;
    user_id: number;
    customer_id?: number;
    total_amount: number;
    payment_method: 'cash' | 'transfer' | 'qris' | 'debit' | 'cc';
    items: TransactionItem[];
    customer_name?: string; // For rapid entry
    customer_phone?: string;
    cash_handed?: number;
    cash_change?: number;
    adjustment_amount?: number;
    payment_status?: 'PAID' | 'PENDING' | 'CANCELLED';
    reference_id?: string;
}

export const createTransaction = async (transaction: Transaction): Promise<number | bigint> => {
    // Wrapper for atomic transaction in SQLite
    const executeTransaction = db.transaction((txData: Transaction) => {
        let resolvedCustomerId = txData.customer_id;
        
        // 1. Resolve Customer (Find or Create)
        // Sanitize: Alphabet + Space for Name, Numeric for Phone
        const cleanName = txData.customer_name?.replace(/[^a-zA-Z\s]/g, '').trim();
        const cleanPhone = txData.customer_phone?.replace(/[^0-9]/g, '').trim();

        if (!resolvedCustomerId) {
            if (cleanPhone) {
                const byPhone = db.prepare('SELECT id FROM customers WHERE phone = ? AND (is_deleted = 0 OR is_deleted IS NULL)').get(cleanPhone) as { id: number } | undefined;
                if (byPhone) resolvedCustomerId = byPhone.id;
            }
            
            if (!resolvedCustomerId && cleanName) {
                const byName = db.prepare('SELECT id FROM customers WHERE name = ? AND (is_deleted = 0 OR is_deleted IS NULL)').get(cleanName) as { id: number } | undefined;
                if (byName) resolvedCustomerId = byName.id;
            }

            // Create if still not found but we have details (stricter check)
            if (!resolvedCustomerId && cleanName && cleanName.length > 0) {
                const newCust = db.prepare('INSERT INTO customers (name, phone) VALUES (?, ?)').run(cleanName, cleanPhone || null);
                resolvedCustomerId = newCust.lastInsertRowid as number;
            }
        }

        // 2. Create Transaction Record
        const insertTxStmt = db.prepare(`
            INSERT INTO transactions (
                invoice_number, user_id, customer_id, total_amount, 
                payment_method, cash_handed, cash_change,
                adjustment_amount, payment_status, reference_id
            ) 
            VALUES (
                @invoice_number, @user_id, @customer_id, @total_amount, 
                @payment_method, @cash_handed, @cash_change,
                @adjustment_amount, @payment_status, @reference_id
            )
        `);
        
        const txInfo = insertTxStmt.run({
            invoice_number: txData.invoice_number,
            user_id: txData.user_id,
            customer_id: resolvedCustomerId || null,
            total_amount: txData.total_amount,
            payment_method: txData.payment_method,
            cash_handed: txData.cash_handed || 0,
            cash_change: txData.cash_change || 0,
            adjustment_amount: txData.adjustment_amount || 0,
            payment_status: txData.payment_status || 'PAID',
            reference_id: txData.reference_id || null
        });
        
        const transactionId = txInfo.lastInsertRowid;

        // 3. Process Items (Insert Item & Deduct Stock)
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
                
                // Only deduct stock if status is PAID or PENDING (assuming stock deduction at checkout)
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

        return transactionId;
    });

    // Execute the transaction
    return executeTransaction(transaction);
};

export const getAllTransactions = async (): Promise<any[]> => {
    const stmt = db.prepare(`
        SELECT t.*, u.username, c.name as customer_name, c.phone as customer_phone,
               (SELECT SUM(quantity) FROM transaction_items WHERE transaction_id = t.id) as total_items
        FROM transactions t
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN customers c ON t.customer_id = c.id
        WHERE t.is_deleted = 0 OR t.is_deleted IS NULL
        ORDER BY t.created_at DESC
    `);
    
    const recordset = stmt.all() as any[];
    return recordset.map((tx: any) => ({
        ...tx,
        is_deleted: tx.is_deleted === 1
    }));
};

export const softDeleteTransaction = async (id: number): Promise<void> => {
    const executeSoftDelete = db.transaction((delId: number) => {
        // 1. Mark transaction as deleted
        const updateTxStmt = db.prepare('UPDATE transactions SET is_deleted = 1 WHERE id = @id');
        updateTxStmt.run({ id: delId });

        // 2. Fetch items to restore stock
        const getItemsStmt = db.prepare('SELECT product_id, quantity FROM transaction_items WHERE transaction_id = @id AND product_id IS NOT NULL');
        const items = getItemsStmt.all({ id: delId }) as { product_id: number, quantity: number }[];

        const restoreStockStmt = db.prepare('UPDATE products SET stock = stock + @quantity WHERE id = @product_id');
        for (const item of items) {
            restoreStockStmt.run({ quantity: item.quantity, product_id: item.product_id });
        }
    });

    executeSoftDelete(id);
};

export const getTransactionById = async (id: number): Promise<any> => {
    // 1. Fetch Transaction Header
    const transStmt = db.prepare(`
        SELECT t.*, u.username, c.name as customer_name, c.phone as customer_phone
        FROM transactions t
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN customers c ON t.customer_id = c.id
        WHERE t.id = @id
    `);
    
    const transaction = transStmt.get({ id }) as any | undefined;
    if (!transaction) return null;

    // 2. Fetch Items
    const itemsStmt = db.prepare(`
        SELECT ti.*
        FROM transaction_items ti
        WHERE ti.transaction_id = @id
    `);
    
    transaction.items = itemsStmt.all({ id });
    return transaction;
};
