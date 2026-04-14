import { db } from '../config/db';

export interface Category {
    id?: number;
    name: string;
    description?: string;
    is_active?: number;
}

export interface Product {
    id?: number;
    name: string;
    description?: string;
    sku?: string;
    category_id?: number;
    supplier_id?: number;
    stock: number;
    price: number;
    buy_price?: number;
    category_name?: string;
    category_is_active?: number;
}

// Category Operations
export const getAllCategories = async (): Promise<Category[]> => {
    const stmt = db.prepare('SELECT * FROM categories');
    return stmt.all() as Category[];
};

export const createCategory = async (category: Category): Promise<number | bigint> => {
    const stmt = db.prepare('INSERT INTO categories (name, description, is_active) VALUES (@name, @description, @is_active)');
    const info = stmt.run({ name: category.name, description: category.description || null, is_active: category.is_active !== undefined ? category.is_active : 1 });
    return info.lastInsertRowid;
};

export const toggleCategoryStatus = async (id: number): Promise<void> => {
    const stmt = db.prepare('UPDATE categories SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = @id');
    stmt.run({ id });
};

// Product Operations
export const getAllProducts = async (): Promise<Product[]> => {
    const stmt = db.prepare(`
        SELECT p.*, c.name as category_name, c.is_active as category_is_active 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id
    `);
    return stmt.all() as Product[];
};

export const createProduct = async (product: Product): Promise<number | bigint> => {
    // Uniqueness Checks
    const existingCheckStmt = db.prepare(`
        SELECT name, sku FROM products 
        WHERE (LOWER(name) = LOWER(@name)) 
        OR (LOWER(sku) = LOWER(@sku) AND sku IS NOT NULL AND sku <> '')
    `);
    
    // @ts-ignore
    const existingRecords = existingCheckStmt.all({ name: product.name, sku: product.sku || null }) as { name: string, sku: string | null }[];

    for (const record of existingRecords) {
        if (record.name.toLowerCase() === product.name.toLowerCase()) {
            throw new Error(`PRODUCT_NAME_DUPLICATE: An item with the name "${product.name}" already exists.`);
        }
        if (product.sku && record.sku && record.sku.toLowerCase() === product.sku.toLowerCase()) {
            throw new Error(`SKU_DUPLICATE: The SKU "${product.sku}" is already assigned to another item.`);
        }
    }

    try {
        const createTx = db.transaction((prod: Product) => {
            const stmt = db.prepare(`
                INSERT INTO products (name, description, sku, category_id, supplier_id, stock, price, buy_price) 
                VALUES (@name, @description, @sku, @category_id, @supplier_id, @stock, @price, @buy_price)
            `);
            
            const info = stmt.run({
                name: prod.name,
                description: prod.description || null,
                sku: prod.sku || null,
                category_id: prod.category_id || null,
                supplier_id: prod.supplier_id || null,
                stock: prod.stock ?? 0,
                price: prod.price ?? 0,
                buy_price: prod.buy_price ?? 0
            });

            const newProductId = info.lastInsertRowid;

            // Log initial restock so transactions match
            if ((prod.stock ?? 0) > 0) {
                const restockStmt = db.prepare('INSERT INTO product_restocks (product_id, quantity, buy_price) VALUES (@product_id, @quantity, @buy_price)');
                restockStmt.run({ product_id: newProductId, quantity: prod.stock, buy_price: prod.buy_price ?? 0 });
            }

            return newProductId;
        });
        
        return createTx(product);
    } catch (error) {
        console.error('Error in createProduct model:', error);
        throw error;
    }
};

export const updateProduct = async (id: number, product: Product): Promise<void> => {
    // Uniqueness Check (Exclude current product)
    const existingCheckStmt = db.prepare(`
        SELECT name, sku FROM products 
        WHERE id <> @id AND (
            (LOWER(name) = LOWER(@name)) 
            OR (LOWER(sku) = LOWER(@sku) AND sku IS NOT NULL AND sku <> '')
        )
    `);

    // @ts-ignore
    const existingRecords = existingCheckStmt.all({ id, name: product.name, sku: product.sku || null }) as { name: string, sku: string | null }[];

    for (const record of existingRecords) {
        if (record.name.toLowerCase() === product.name.toLowerCase()) {
            throw new Error(`PRODUCT_NAME_DUPLICATE: An item with the name "${product.name}" already exists.`);
        }
        if (product.sku && record.sku && record.sku.toLowerCase() === product.sku.toLowerCase()) {
            throw new Error(`SKU_DUPLICATE: The SKU "${product.sku}" is already assigned to another item.`);
        }
    }

    try {
        const stmt = db.prepare(`
            UPDATE products 
            SET name=@name, description=@description, sku=@sku, category_id=@category_id, 
                supplier_id=@supplier_id, stock=@stock, price=@price, buy_price=@buy_price 
            WHERE id=@id
        `);
        
        stmt.run({
            id,
            name: product.name,
            description: product.description || null,
            sku: product.sku || null,
            category_id: product.category_id || null,
            supplier_id: product.supplier_id || null,
            stock: product.stock ?? 0,
            price: product.price ?? 0,
            buy_price: product.buy_price ?? 0
        });
    } catch (error) {
        console.error('Error in updateProduct model:', error);
        throw error;
    }
};

export const deleteProduct = async (id: number): Promise<void> => {
    const stmt = db.prepare('DELETE FROM products WHERE id=@id');
    stmt.run({ id });
};

// Restock & Average Costing
export const restockProduct = async (id: number, quantity: number, incomingBuyPrice: number): Promise<void> => {
    const executeRestock = db.transaction((productId: number, addedQty: number, newPrice: number) => {
        // 1. Fetch current stock and current avg buy_price
        const productStmt = db.prepare('SELECT stock, buy_price FROM products WHERE id = @id');
        const product = productStmt.get({ id: productId }) as { stock: number, buy_price: number } | undefined;
        
        if (!product) throw new Error('Product not found');

        const currentStock = product.stock;
        const currentAvgPrice = product.buy_price;

        // 2. Compute Moving Average Cost
        // New Avg Price = ((Current Stock * Current Avg Price) + (Added Qty * New Price)) / (Current Stock + Added Qty)
        // If current stock is negative or exactly 0, the new avg replaces the old.
        let newAvgPrice = newPrice;
        if (currentStock > 0) {
            newAvgPrice = ((currentStock * currentAvgPrice) + (addedQty * newPrice)) / (currentStock + addedQty);
        }

        // 3. Update Product
        const updateProductStmt = db.prepare('UPDATE products SET stock = stock + @quantity, buy_price = @newAvgPrice WHERE id = @id');
        updateProductStmt.run({ quantity: addedQty, newAvgPrice, id: productId });

        // 4. Log Restock
        const logStmt = db.prepare('INSERT INTO product_restocks (product_id, quantity, buy_price) VALUES (@product_id, @quantity, @buy_price)');
        logStmt.run({ product_id: productId, quantity: addedQty, buy_price: newPrice });
    });

    executeRestock(id, quantity, incomingBuyPrice);
};

export const getProductHistory = async (productId: number) => {
    const stmt = db.prepare(`
        SELECT * FROM (
            SELECT 
                CASE 
                    WHEN ROW_NUMBER() OVER (PARTITION BY pr.product_id ORDER BY pr.created_at ASC) = 1 
                    THEN 'NEW ITEM' 
                    ELSE 'RESTOCK' 
                END as type,
                pr.quantity,
                pr.buy_price as price,
                pr.created_at,
                NULL as invoice_number
            FROM product_restocks pr
            WHERE pr.product_id = @id

            UNION ALL

            SELECT
                'SALE' as type,
                ti.quantity * -1 as quantity,
                ti.price,
                t.created_at,
                t.invoice_number
            FROM transaction_items ti
            JOIN transactions t ON ti.transaction_id = t.id
            WHERE ti.product_id = @id AND (t.is_deleted = 0 OR t.is_deleted IS NULL)
        )
        ORDER BY created_at DESC
    `);

    return stmt.all({ id: productId });
};

export const getGlobalInventoryHistory = async (filters: { categoryId?: string, startDate?: string, endDate?: string, search?: string }) => {
    let whereClauses = ['1=1'];
    let params: any = {};

    if (filters.categoryId && filters.categoryId !== 'all') {
        whereClauses.push('h.category_id = @categoryId');
        params.categoryId = filters.categoryId;
    }

    if (filters.startDate) {
        whereClauses.push('date(h.created_at) >= date(@startDate)');
        params.startDate = filters.startDate;
    }

    if (filters.endDate) {
        whereClauses.push('date(h.created_at) <= date(@endDate)');
        params.endDate = filters.endDate;
    }

    if (filters.search) {
        whereClauses.push('(LOWER(h.product_name) LIKE @search OR LOWER(h.sku) LIKE @search)');
        params.search = `%${filters.search.toLowerCase()}%`;
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
        SELECT * FROM (
            SELECT 
                CASE 
                    WHEN ROW_NUMBER() OVER (PARTITION BY pr.product_id ORDER BY pr.created_at ASC) = 1 
                    THEN 'NEW ITEM' 
                    ELSE 'RESTOCK' 
                END as type,
                pr.quantity,
                pr.buy_price as price,
                pr.created_at,
                NULL as invoice_number,
                p.name as product_name,
                p.sku,
                p.category_id,
                c.name as category_name
            FROM product_restocks pr
            JOIN products p ON pr.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id

            UNION ALL

            SELECT
                'SALE' as type,
                ti.quantity * -1 as quantity,
                ti.price,
                t.created_at,
                t.invoice_number,
                p.name as product_name,
                p.sku,
                p.category_id,
                c.name as category_name
            FROM transaction_items ti
            JOIN transactions t ON ti.transaction_id = t.id
            JOIN products p ON ti.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE (t.is_deleted = 0 OR t.is_deleted IS NULL)
        ) h
        ${whereString}
        ORDER BY h.created_at DESC
    `;

    const stmt = db.prepare(query);
    return stmt.all(params);
};

