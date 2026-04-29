import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { db } from '../config/db';
import crypto from 'crypto';

const router = express.Router();

router.get('/', authenticateToken, (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Only administrators can view audit logs' });
        }

        const logs = db.prepare(`
            SELECT id, table_name, record_id, action, changed_by, ip_address, reason, created_at
            FROM audit_logs
            ORDER BY created_at DESC
            LIMIT 100
        `).all();

        res.json(logs);
    } catch (error: any) {
        console.error('Audit Fetch Error:', error);
        res.status(500).json({ message: 'Error fetching audit logs', error: error.message });
    }
});

router.post('/:id/decrypt', authenticateToken, (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Only administrators can decrypt audit logs' });
        }

        const { id } = req.params;
        const log = db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(id) as any;

        if (!log) {
            return res.status(404).json({ message: 'Audit log not found' });
        }

        const decryptPayload = (encryptedHex: string | null) => {
            if (!encryptedHex) return null;
            if (!process.env.AUDIT_SECRET_KEY) throw new Error('AUDIT_SECRET_KEY is missing');
            
            try {
                // Assuming AES-256-CBC, IV is first 16 bytes (32 hex chars)
                const ivHex = encryptedHex.slice(0, 32);
                const encryptedData = encryptedHex.slice(32);
                
                const iv = Buffer.from(ivHex, 'hex');
                const key = Buffer.from(process.env.AUDIT_SECRET_KEY, 'hex'); // 32 bytes hex string
                
                const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
                let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
                decrypted += decipher.final('utf8');
                
                return JSON.parse(decrypted);
            } catch (e) {
                console.error("Decryption failed for log", id, e);
                return { _error: "Decryption Failed - Key Mismatch" };
            }
        };

        const decryptedOld = decryptPayload(log.old_value_encrypted);
        const decryptedNew = decryptPayload(log.new_value_encrypted);

        // Audit the decrypt action itself!
        const auditLogStmt = db.prepare(`
            INSERT INTO audit_logs (id, table_name, record_id, action, changed_by, ip_address, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        auditLogStmt.run(
            crypto.randomUUID(),
            'audit_logs',
            id,
            'UNMASK',
            user.userId.toString(),
            req.ip || req.socket.remoteAddress || 'unknown',
            `Admin viewed decrypted audit payload`
        );

        res.json({
            id: log.id,
            old_value: decryptedOld,
            new_value: decryptedNew
        });

    } catch (error: any) {
        console.error('Audit Decrypt Error:', error);
        res.status(500).json({ message: 'Error decrypting audit log', error: error.message });
    }
});

export default router;
