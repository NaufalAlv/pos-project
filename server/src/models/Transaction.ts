import { db } from '../config/db';

export interface TransactionItem {
    product_id: number;
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
}

export const createTransaction = async (transaction: Transaction): Promise<number | bigint> => {
    // Wrapper for atomic transaction in SQLite
    const executeTransaction = db.transaction((txData: Transaction) => {
        let resolvedCustomerId = txData.customer_id;
        
        // 1. Resolve Customer (Find or Create)
        if (!resolvedCustomerId && txData.customer_name) {
            const existingCustStmt = db.prepare('SELECT id FROM customers WHERE name = @name');
            const existingCust = existingCustStmt.get({ name: txData.customer_name }) as { id: number } | undefined;
            
            if (existingCust) {
                resolvedCustomerId = existingCust.id;
            } else {
                const newCustStmt = db.prepare('INSERT INTO customers (name, phone) VALUES (@name, @phone)');
                const info = newCustStmt.run({ name: txData.customer_name, phone: txData.customer_phone || null });
                resolvedCustomerId = info.lastInsertRowid as number;
            }
        }

        // 2. Create Transaction Record
        const insertTxStmt = db.prepare(`
            INSERT INTO transactions (invoice_number, user_id, customer_id, total_amount, payment_method) 
            VALUES (@invoice_number, @user_id, @customer_id, @total_amount, @payment_method)
        `);
        
        const txInfo = insertTxStmt.run({
            invoice_number: txData.invoice_number,
            user_id: txData.user_id,
            customer_id: resolvedCustomerId || null,
            total_amount: txData.total_amount,
            payment_method: txData.payment_method
        });
        
        const transactionId = txInfo.lastInsertRowid;

        // 3. Process Items (Insert Item & Deduct Stock)
        const checkStockStmt = db.prepare('SELECT stock FROM products WHERE id = @product_id');
        const updateStockStmt = db.prepare('UPDATE products SET stock = stock - @quantity WHERE id = @product_id');
        const insertItemStmt = db.prepare(`
            INSERT INTO transaction_items (transaction_id, product_id, quantity, price, subtotal) 
            VALUES (@transaction_id, @product_id, @quantity, @price, @subtotal)
        `);

        for (const item of txData.items) {
            const product = checkStockStmt.get({ product_id: item.product_id }) as { stock: number } | undefined;
            if (!product) throw new Error(`Product ${item.product_id} not found`);
            if (product.stock < item.quantity) throw new Error(`Insufficient stock for product ${item.product_id}`);

            updateStockStmt.run({ quantity: item.quantity, product_id: item.product_id });

            insertItemStmt.run({
                transaction_id: transactionId,
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.price,
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
        const getItemsStmt = db.prepare('SELECT product_id, quantity FROM transaction_items WHERE transaction_id = @id');
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
        SELECT ti.*, p.name as name
        FROM transaction_items ti
        LEFT JOIN products p ON ti.product_id = p.id
        WHERE ti.transaction_id = @id
    `);
    
    transaction.items = itemsStmt.all({ id });
    return transaction;
};
