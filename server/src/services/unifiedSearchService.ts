import { db } from '../config/db';

export interface SearchResult {
    type: 'customer' | 'product' | 'transaction';
    id: string | number;
    title: string;
    subtitle: string;
    data: any;
    rank: number;
}

export const unifiedSearchService = {
    search: (query: string): SearchResult[] => {
        if (!query || query.trim().length === 0) return [];
        
        // Sanitize query for FTS5 (remove quotes, brackets, etc. to prevent syntax errors)
        const sanitizedQuery = query.replace(/["']/g, "").trim();
        // Create prefix match query for FTS5, e.g., "term1* term2*"
        const ftsQuery = sanitizedQuery.split(/\s+/).map(term => `"${term}"*`).join(' AND ');

        const results: SearchResult[] = [];

        try {
            // Search Customers
            const customers = db.prepare(`
                SELECT *, rank 
                FROM customers_fts 
                WHERE customers_fts MATCH ? 
                ORDER BY rank 
                LIMIT 10
            `).all(ftsQuery) as any[];

            customers.forEach(c => {
                results.push({
                    type: 'customer',
                    id: c.global_uid,
                    title: c.name,
                    subtitle: c.phone || c.plate_number || 'No contact info',
                    data: c,
                    rank: c.rank
                });
            });

            // Search Products
            const products = db.prepare(`
                SELECT *, rank 
                FROM products_fts 
                WHERE products_fts MATCH ? 
                ORDER BY rank 
                LIMIT 10
            `).all(ftsQuery) as any[];

            products.forEach(p => {
                results.push({
                    type: 'product',
                    id: p.id,
                    title: p.name,
                    subtitle: p.sku ? `SKU: ${p.sku}` : 'No SKU',
                    data: p,
                    rank: p.rank
                });
            });

            // Sort combined results by rank (lower is better in FTS5)
            return results.sort((a, b) => a.rank - b.rank);

        } catch (error) {
            console.error("FTS5 Search Error:", error);
            // Fallback to basic LIKE search if FTS syntax errors out
            return unifiedSearchService.fallbackSearch(sanitizedQuery);
        }
    },

    searchTransactions: (query: string): SearchResult[] => {
        // Transactions are searched by UUID prefix — FTS5 not applicable here
        const likeQuery = `${query}%`;
        try {
            const txs = db.prepare(`
                SELECT id, invoice_number, total_amount, created_at
                FROM transactions
                WHERE id LIKE ? OR invoice_number LIKE ?
                LIMIT 5
            `).all(likeQuery, `%${query}%`) as any[];

            return txs.map(t => ({
                type: 'transaction' as const,
                id: t.id,
                title: t.invoice_number || `Tx #${String(t.id).substring(0, 8)}`,
                subtitle: `Rp ${Number(t.total_amount).toLocaleString('id-ID')} — ${new Date(t.created_at).toLocaleDateString('id-ID')}`,
                data: t,
                rank: 0,
            }));
        } catch (e) {
            return [];
        }
    },

    fallbackSearch: (query: string): SearchResult[] => {
        const likeQuery = `%${query}%`;
        const results: SearchResult[] = [];

        const customers = db.prepare(`
            SELECT * FROM customers 
            WHERE name LIKE ? OR phone LIKE ? OR plate_number LIKE ? 
            LIMIT 10
        `).all(likeQuery, likeQuery, likeQuery) as any[];

        customers.forEach(c => {
            results.push({
                type: 'customer',
                id: c.global_uid,
                title: c.name,
                subtitle: c.phone || c.plate_number || 'No contact info',
                data: c,
                rank: 0
            });
        });

        const products = db.prepare(`
            SELECT * FROM products 
            WHERE name LIKE ? OR sku LIKE ? OR description LIKE ? 
            LIMIT 10
        `).all(likeQuery, likeQuery, likeQuery) as any[];

        products.forEach(p => {
            results.push({
                type: 'product',
                id: p.id,
                title: p.name,
                subtitle: p.sku ? `SKU: ${p.sku}` : 'No SKU',
                data: p,
                rank: 0
            });
        });

        return results;
    }
};
