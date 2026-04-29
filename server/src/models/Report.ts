import { db } from '../config/db';

export interface ReportFilter {
    startDate?: string;
    endDate?: string;
    paymentMethod?: string;
    categoryId?: string;
    transactionCategory?: string;
}

export const getCustomReport = async (filters: ReportFilter) => {
    let whereClauses = ['(t.is_deleted = 0 OR t.is_deleted IS NULL)'];
    let params: any = {};

    if (filters.startDate) {
        whereClauses.push('date(t.created_at) >= date(@startDate)');
        params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
        // To be inclusive, we can check datetime strictly or just date. Using date() is safer.
        whereClauses.push('date(t.created_at) <= date(@endDate)');
        params.endDate = filters.endDate;
    }

    if (filters.paymentMethod && filters.paymentMethod !== 'all') {
        whereClauses.push('t.payment_method = @paymentMethod');
        params.paymentMethod = filters.paymentMethod;
    }

    if (filters.categoryId && filters.categoryId !== 'all') {
        whereClauses.push('p.category_id = @categoryId');
        params.categoryId = filters.categoryId;
    }
    
    if (filters.transactionCategory && filters.transactionCategory !== 'all') {
        whereClauses.push('t.category = @transactionCategory');
        params.transactionCategory = filters.transactionCategory;
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 1. Fetch Aggregated Metrics
    const metricsStmt = db.prepare(`
        SELECT 
            COUNT(DISTINCT t.id) as totalTransactions,
            SUM(ti.quantity) as totalItemsSold,
            SUM(ti.price * ti.quantity) as totalRevenue,
            SUM(ti.buy_price * ti.quantity) as totalCost
        FROM transaction_items ti
        JOIN transactions t ON ti.transaction_id = t.id
        LEFT JOIN products p ON ti.product_id = p.id
        ${whereString}
    `);
    const metricsResult = metricsStmt.get(params) as any;
    
    const metrics = {
        totalTransactions: metricsResult.totalTransactions || 0,
        totalItemsSold: metricsResult.totalItemsSold || 0,
        totalRevenue: metricsResult.totalRevenue || 0,
        totalCost: metricsResult.totalCost || 0,
        totalProfit: (metricsResult.totalRevenue || 0) - (metricsResult.totalCost || 0)
    };

    // 2. Fetch Itemized Breakdown (The granular data)
    const itemsStmt = db.prepare(`
        SELECT 
            t.created_at as transaction_date,
            t.invoice_number,
            t.payment_method,
            p.name as item_name,
            c.name as category_name,
            ti.quantity,
            ti.price as sell_price,
            ti.buy_price,
            t.category as transaction_category,
            (ti.price - ti.buy_price) * ti.quantity as margin
        FROM transaction_items ti
        JOIN transactions t ON ti.transaction_id = t.id
        JOIN products p ON ti.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        ${whereString}
        ORDER BY t.created_at DESC
    `);
    const itemBreakdown = itemsStmt.all(params);

    return { metrics, itemBreakdown };
};
