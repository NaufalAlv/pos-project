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

export const getMarginAnalytics = async (days: number = 30): Promise<any> => {
    // Calculate total revenue and total COGS over the last N days
    const stmt = db.prepare(`
        SELECT 
            date(t.created_at, 'localtime') as date,
            SUM(t.total_amount) as revenue,
            SUM((
                SELECT SUM(ti.quantity * ti.buy_price) 
                FROM transaction_items ti 
                WHERE ti.transaction_id = t.id
            )) as cogs
        FROM transactions t
        WHERE (t.is_deleted = 0 OR t.is_deleted IS NULL)
          AND t.created_at >= date('now', '-' || ? || ' days')
          AND t.payment_status = 'PAID'
        GROUP BY date(t.created_at, 'localtime')
        ORDER BY date ASC
    `);
    
    const records = stmt.all(days) as any[];
    
    let totalRevenue = 0;
    let totalCogs = 0;
    
    const dailyData = records.map(r => {
        const margin = r.revenue - (r.cogs || 0);
        const marginPercentage = r.revenue > 0 ? (margin / r.revenue) * 100 : 0;
        
        totalRevenue += r.revenue;
        totalCogs += (r.cogs || 0);
        
        return {
            date: r.date,
            revenue: r.revenue,
            cogs: r.cogs || 0,
            margin,
            marginPercentage: Number(marginPercentage.toFixed(2))
        };
    });
    
    const totalMargin = totalRevenue - totalCogs;
    const averageMarginPercentage = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

    return {
        summary: {
            totalRevenue,
            totalCogs,
            totalMargin,
            averageMarginPercentage: Number(averageMarginPercentage.toFixed(2))
        },
        dailyData
    };
};

export const getTankProjection = async (): Promise<any> => {
    // This aggregates fuel dispensation from transactions to project tank depletion
    // Assuming 'fuel_config' table holds current tank levels, but if not, we use mock projection based on recent usage
    
    // Total fuel dispensed last 7 days
    const usageStmt = db.prepare(`
        SELECT SUM(ti.quantity) as total_liters
        FROM transaction_items ti
        JOIN transactions t ON ti.transaction_id = t.id
        WHERE ti.name LIKE '%Fuel%'
          AND t.created_at >= date('now', '-7 days')
          AND (t.is_deleted = 0 OR t.is_deleted IS NULL)
    `);
    
    const result = usageStmt.get() as { total_liters: number | null };
    const litersLast7Days = result?.total_liters || 0;
    const dailyBurnRate = litersLast7Days / 7;
    
    // Fetch tank status from fuel_config
    const tankStmt = db.prepare("SELECT * FROM fuel_config WHERE key = 'tank_status'");
    let tankStatus = { capacity: 10000, currentLevel: 8500 }; // Fallback defaults
    try {
        const record = tankStmt.get() as any;
        if (record && record.value) {
            tankStatus = JSON.parse(record.value);
        }
    } catch(e) {}
    
    const daysRemaining = dailyBurnRate > 0 ? tankStatus.currentLevel / dailyBurnRate : 999;
    
    return {
        currentLevel: tankStatus.currentLevel,
        capacity: tankStatus.capacity,
        fillPercentage: (tankStatus.currentLevel / tankStatus.capacity) * 100,
        dailyBurnRate: Number(dailyBurnRate.toFixed(2)),
        daysRemaining: Number(daysRemaining.toFixed(1)),
        projectedEmptyDate: new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
};
