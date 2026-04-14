import { db } from '../config/db';

export interface DashboardStats {
    totalRevenue: number;
    dailySales: number;
    totalOrders: number;
    lowStockCount: number;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
    // 1. Total Revenue
    const revenueStmt = db.prepare('SELECT SUM(total_amount) as total FROM transactions WHERE is_deleted = 0 OR is_deleted IS NULL');
    const revenueResult = revenueStmt.get() as { total: number | null };
    const totalRevenue = revenueResult?.total || 0;

    // 2. Daily Sales (Revenue Today)
    const dailyStmt = db.prepare(`SELECT SUM(total_amount) as total FROM transactions WHERE (is_deleted = 0 OR is_deleted IS NULL) AND date(created_at, 'localtime') = date('now', 'localtime')`);
    const dailyResult = dailyStmt.get() as { total: number | null };
    const dailySales = dailyResult?.total || 0;

    // 3. Total Orders Today
    const ordersStmt = db.prepare(`SELECT COUNT(*) as count FROM transactions WHERE (is_deleted = 0 OR is_deleted IS NULL) AND date(created_at, 'localtime') = date('now', 'localtime')`);
    const ordersResult = ordersStmt.get() as { count: number | null };
    const totalOrders = ordersResult?.count || 0;

    // 4. Low Stock Count (Threshold < 5)
    const stockStmt = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock < 5');
    const stockResult = stockStmt.get() as { count: number | null };
    const lowStockCount = stockResult?.count || 0;

    return {
        totalRevenue,
        dailySales,
        totalOrders,
        lowStockCount
    };
};

export interface InventoryStats {
    totalValuation: number;
    totalStock: number;
    activeCategories: number;
    totalProducts: number;
}

export const getInventoryStats = async (): Promise<InventoryStats> => {
    // 1. Total Valuation (SUM stock * buy_price)
    const valuationStmt = db.prepare('SELECT SUM(stock * buy_price) as total FROM products');
    const valuationResult = valuationStmt.get() as { total: number | null };
    const totalValuation = valuationResult?.total || 0;

    // 2. Total Items Stored (SUM stock)
    const stockStmt = db.prepare('SELECT SUM(stock) as total FROM products');
    const stockResult = stockStmt.get() as { total: number | null };
    const totalStock = stockResult?.total || 0;

    // 3. Active Categories Count
    const categoriesStmt = db.prepare('SELECT COUNT(*) as count FROM categories WHERE is_active = 1');
    const categoriesResult = categoriesStmt.get() as { count: number | null };
    const activeCategories = categoriesResult?.count || 0;

    // 4. Total Different Products
    const productsStmt = db.prepare('SELECT COUNT(*) as count FROM products');
    const productsResult = productsStmt.get() as { count: number | null };
    const totalProducts = productsResult?.count || 0;

    return {
        totalValuation,
        totalStock,
        activeCategories,
        totalProducts
    };
};

export const getRecentActivity = async (): Promise<any[]> => {
    const stmt = db.prepare(`
        SELECT t.id, t.invoice_number, t.total_amount, t.created_at, u.username 
        FROM transactions t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.is_deleted = 0 OR t.is_deleted IS NULL
        ORDER BY t.created_at DESC
        LIMIT 5
    `);
    return stmt.all();
};
