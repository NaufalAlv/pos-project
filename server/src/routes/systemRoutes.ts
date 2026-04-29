import { Router, Request, Response } from "express";
import { db } from "../config/db";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

/**
 * Tables to purge and their ORDER matters.
 * Child tables (with foreign keys) must come BEFORE parent tables
 * to avoid FK constraint violations.
 */
const PURGEABLE_TABLES = [
    "inventory_histories", // child of products
    "products",            // child of nothing, parent of inventory_histories and product_restocks
    "transaction_items",   // child of transactions
    "transactions",        // child of nothing, parent of items
    "product_restocks",    // child of products
    "audit_logs",          // standalone log table
    "customers"            // added back: usually want to purge customers too in a dummy project
] as const;

/**
 * Safely checks if a table exists in the database before
 * attempting to delete from it.
 */
function tableExists(tableName: string): boolean {
    const result = db
        .prepare(
            `SELECT COUNT(*) as count 
       FROM sqlite_master 
       WHERE type='table' AND name=?`
        )
        .get(tableName) as { count: number };

    return result.count > 0;
}

/**
 * POST /api/system/purge
 * Purges all transactional data from the database.
 * Runs inside a single transaction — all or nothing.
 *
 * @security Requires admin role
 */
router.post("/purge", authenticateToken, (req: Request, res: Response) => {
    const user = (req as any).user;

    if (user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied: Only administrators can perform a system purge'
        });
    }

    console.log(`[POS] BEGIN PURGE OPERATION BY USER: ${user.username}`);

    try {
        // ✅ Pre-flight check: verify tables exist
        const verifiedTables = PURGEABLE_TABLES.filter(table => {
            const exists = tableExists(table);
            if (!exists) console.warn(`[POS] ⚠️  Table "${table}" not found — will skip`);
            return exists;
        });

        // ✅ Build purge transaction
        const purgeTransaction = db.transaction(() => {
            const results: Record<string, number> = {};

            for (const table of verifiedTables) {
                console.log(`[POS] DELETE FROM ${table}`);
                const stmt = db.prepare(`DELETE FROM ${table}`);
                const info = stmt.run();

                results[table] = info.changes;
                console.log(`[POS] ✅ Deleted ${info.changes} rows from ${table}`);
            }

            // Reset sequences for verified tables
            const seqStmt = db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`);
            for (const table of verifiedTables) {
                seqStmt.run(table);
            }

            return results;
        });

        // ✅ Execute
        const deletedCounts = purgeTransaction();

        console.log("[POS] ✅ PURGE COMPLETE:", deletedCounts);

        return res.status(200).json({
            success: true,
            message: "All data purged successfully",
            details: deletedCounts,
        });

    } catch (error) {
        console.error("[POS] ❌ Purge error:", error);
        return res.status(500).json({
            success: false,
            message: "Purge operation failed — database rolled back",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

export default router;