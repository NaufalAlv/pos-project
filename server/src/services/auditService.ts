import { db } from '../config/db';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.AUDIT_SECRET_KEY || 'd666e7ccc253fd916ba1920e41f2a428b0db5d0ce5edfe0c460c1e54b923c88b'; 

// Helper to pad or slice the key to exactly 32 bytes (256 bits)
const getValidKey = () => {
    let key = Buffer.from(SECRET_KEY, 'hex');
    if (key.length !== 32) {
        key = Buffer.from(SECRET_KEY.padEnd(64, '0').slice(0, 64), 'hex');
    }
    return key;
};

export const encryptField = (text: string): string => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getValidKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
};

export const decryptField = (encryptedText: string): string => {
    if (!encryptedText) return encryptedText;
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return encryptedText;
    
    const [ivHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getValidKey(), iv);
    
    try {
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        console.error('Decryption failed', e);
        return 'DECRYPTION_ERROR';
    }
};

export interface AuditLogData {
    table_name: string;
    record_id: string;
    action: string;
    old_value?: string;
    new_value?: string;
    changed_by?: string;
    ip_address?: string;
    reason?: string;
}

export const auditLog = (data: AuditLogData) => {
    const id = uuidv4();
    const old_encrypted = data.old_value ? encryptField(data.old_value) : null;
    const new_encrypted = data.new_value ? encryptField(data.new_value) : null;
    
    db.prepare(`
        INSERT INTO audit_logs (id, table_name, record_id, action, old_value_encrypted, new_value_encrypted, changed_by, ip_address, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        id, 
        data.table_name, 
        data.record_id, 
        data.action, 
        old_encrypted, 
        new_encrypted, 
        data.changed_by || null, 
        data.ip_address || null, 
        data.reason || null
    );
};
