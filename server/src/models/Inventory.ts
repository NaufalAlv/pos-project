import { db } from '../config/db';

export interface Category {
    id?: number;
    name: string;
    description?: string;
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
}

// Category Operations
export const getAllCategories = async (): Promise<Category[]> => {
    const stmt = db.prepare('SELECT * FROM categories');
    return stmt.all() as Category[];
};

export const createCategory = async (category: Category): Promise<number | bigint> => {
    const stmt = db.prepare('INSERT INTO categories (name, description) VALUES (@name, @description)');
    const info = stmt.run({ name: category.name, description: category.description || null });
    return info.lastInsertRowid;
};

// Product Operations
export const getAllProducts = async (): Promise<Product[]> => {
    const stmt = db.prepare(`
        SELECT p.*, c.name as category_name 
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
        const stmt = db.prepare(`
            INSERT INTO products (name, description, sku, category_id, supplier_id, stock, price, buy_price) 
            VALUES (@name, @description, @sku, @category_id, @supplier_id, @stock, @price, @buy_price)
        `);
        
        const info = stmt.run({
            name: product.name,
            description: product.description || null,
            sku: product.sku || null,
            category_id: product.category_id || null,
            supplier_id: product.supplier_id || null,
            stock: product.stock ?? 0,
            price: product.price ?? 0,
            buy_price: product.buy_price ?? 0
        });
        return info.lastInsertRowid;
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
