import { db } from '../config/db';
import { v4 as uuidv4 } from 'uuid';

export interface CustomerData {
    global_uid: string;
    name: string;
    phone: string | null;
    plate_number: string | null;
    metadata: Record<string, any>;
    loyalty_points: number;
    is_deleted: number;
    created_at: string;
}

export const mdmService = {
    resolveIdentity: (name?: string, phone?: string, plate_number?: string): CustomerData | null => {
        let customer: any = null;
        if (phone) {
            customer = db.prepare('SELECT * FROM customers WHERE phone = ? AND is_deleted = 0').get(phone);
        }
        if (!customer && name) {
            customer = db.prepare('SELECT * FROM customers WHERE name = ? AND is_deleted = 0').get(name);
        }
        
        if (customer) {
            return {
                ...customer,
                metadata: JSON.parse(customer.metadata || '{}')
            } as CustomerData;
        }
        return null;
    },

    createCustomer: (name: string, phone?: string, plate_number?: string, metadata: Record<string, any> = {}): CustomerData => {
        const existing = mdmService.resolveIdentity(name, phone, plate_number);
        if (existing) {
            throw new Error('CUSTOMER_ALREADY_EXISTS');
        }

        const global_uid = uuidv4();
        db.prepare(`
            INSERT INTO customers (global_uid, name, phone, plate_number, metadata, loyalty_points) 
            VALUES (?, ?, ?, ?, ?, 0)
        `).run(global_uid, name, phone || null, plate_number || null, JSON.stringify(metadata));

        return {
            global_uid,
            name,
            phone: phone || null,
            plate_number: plate_number || null,
            metadata,
            loyalty_points: 0,
            is_deleted: 0,
            created_at: new Date().toISOString()
        };
    },

    findOrCreateCustomer: (name: string, phone?: string, plate_number?: string, metadata: Record<string, any> = {}): CustomerData => {
        const existing = mdmService.resolveIdentity(name, phone, plate_number);
        if (existing) {
            // Merge metadata
            const newMetadata = { ...existing.metadata, ...metadata };
            db.prepare('UPDATE customers SET metadata = ? WHERE global_uid = ?').run(JSON.stringify(newMetadata), existing.global_uid);
            return { ...existing, metadata: newMetadata };
        }

        const global_uid = uuidv4();
        db.prepare(`
            INSERT INTO customers (global_uid, name, phone, plate_number, metadata, loyalty_points) 
            VALUES (?, ?, ?, ?, ?, 0)
        `).run(global_uid, name, phone || null, plate_number || null, JSON.stringify(metadata));

        return {
            global_uid,
            name,
            phone: phone || null,
            plate_number: plate_number || null,
            metadata,
            loyalty_points: 0,
            is_deleted: 0,
            created_at: new Date().toISOString()
        };
    },

    getCustomerByUid: (uid: string): CustomerData | null => {
        const customer = db.prepare('SELECT * FROM customers WHERE global_uid = ? AND is_deleted = 0').get(uid) as any;
        if (customer) {
            return {
                ...customer,
                metadata: JSON.parse(customer.metadata || '{}')
            };
        }
        return null;
    },

    executeIdentityMerge: (primaryUid: string, secondaryUid: string, adminUserId: string) => {
        if (primaryUid === secondaryUid) throw new Error("Cannot merge identical identities");
        
        const primary = mdmService.getCustomerByUid(primaryUid);
        const secondary = mdmService.getCustomerByUid(secondaryUid);
        
        if (!primary || !secondary) throw new Error("One or both identities not found");

        const tx = db.transaction(() => {
            // Repoint transactions
            db.prepare('UPDATE transactions SET customer_id = ? WHERE customer_id = ?').run(primaryUid, secondaryUid);
            
            // Repoint audit logs
            db.prepare('UPDATE audit_logs SET record_id = ? WHERE record_id = ?').run(primaryUid, secondaryUid);
            
            // Combine loyalty points
            db.prepare('UPDATE customers SET loyalty_points = loyalty_points + ? WHERE global_uid = ?').run(secondary.loyalty_points, primaryUid);
            
            // Mark secondary as deleted
            db.prepare('UPDATE customers SET is_deleted = 1 WHERE global_uid = ?').run(secondaryUid);

            // Audit log this action
            const auditLogStmt = db.prepare(`
                INSERT INTO audit_logs (id, table_name, record_id, action, changed_by, reason, created_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `);
            auditLogStmt.run(
                uuidv4(),
                'customers',
                primaryUid,
                'IDENTITY_MERGE',
                adminUserId,
                `Merged with ${secondaryUid}`
            );
        });

        tx();
    }
};
