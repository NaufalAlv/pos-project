import { db } from '../config/db';
import { v4 as uuidv4 } from 'uuid';

export const crmService = {
    calculateLoyalty: (amount_idr: number): number => {
        // 10k IDR = 1 Point
        return Math.floor(amount_idr / 10000);
    },

    addLoyaltyPoints: (global_uid: string, points: number): void => {
        if (points <= 0) return;
        db.prepare('UPDATE customers SET loyalty_points = loyalty_points + ? WHERE global_uid = ?').run(points, global_uid);
    },

    getCustomerTimeline: (global_uid: string): any[] => {
        // Fetch POS transactions
        const posTransactions = db.prepare(`
            SELECT id, invoice_number, total_amount, created_at, category, 'POS' as source
            FROM transactions 
            WHERE customer_id = ? AND (reference_id IS NULL OR reference_id NOT LIKE 'PUMP-%') AND is_deleted = 0
            ORDER BY created_at DESC
        `).all(global_uid) as any[];

        // Fetch Pump Injections
        const pumpTransactions = db.prepare(`
            SELECT id, invoice_number, total_amount, created_at, category, 'PUMP_GATEWAY' as source
            FROM transactions 
            WHERE customer_id = ? AND reference_id LIKE 'PUMP-%' AND is_deleted = 0
            ORDER BY created_at DESC
        `).all(global_uid) as any[];

        const timeline = [];

        for (const tx of posTransactions) {
            const pointsEarned = crmService.calculateLoyalty(tx.total_amount);
            timeline.push({
                id: uuidv4(),
                event_type: 'SERVICE',
                timestamp: tx.created_at,
                amount_idr: tx.total_amount,
                points_delta: pointsEarned,
                description: `Invoice: ${tx.invoice_number}`,
                category: tx.category,
                source: tx.source
            });
        }

        for (const tx of pumpTransactions) {
            const pointsEarned = crmService.calculateLoyalty(tx.total_amount);
            timeline.push({
                id: uuidv4(),
                event_type: 'FUEL_PURCHASE',
                timestamp: tx.created_at,
                amount_idr: tx.total_amount,
                points_delta: pointsEarned,
                description: `Fuel Purchase: ${tx.invoice_number}`,
                category: tx.category,
                source: tx.source
            });
        }

        // Sort by timestamp descending
        timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return timeline;
    }
};
