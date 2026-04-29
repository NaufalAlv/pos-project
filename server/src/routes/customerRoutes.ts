import { Router, Request, Response } from 'express';
import { db } from '../config/db';
import { mdmService } from '../services/mdmService';
import { crmService } from '../services/crmService';
import { authenticateToken } from '../middleware/authMiddleware';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { FIELD_VISIBILITY, UserRole } from '../config/permissions';
import { auditLog, decryptField, encryptField } from '../services/auditService';

const router = Router();

const unmaskLimiter = rateLimit({
    windowMs: 60_000,
    max: 10,
    message: { error: 'Too many unmask requests' },
    keyGenerator: (req, res) => {
        const userId = (req as any).user?.id?.toString();
        const ip = ipKeyGenerator(req.ip || '');
        return userId ? `${userId}-${ip}` : ip;
    }
});

router.get('/', authenticateToken, (req: Request, res: Response) => {
    try {
        const customers = db.prepare('SELECT * FROM customers WHERE is_deleted = 0').all() as any[];
        res.json(customers.map(c => ({
            ...c,
            metadata: JSON.parse(c.metadata || '{}'),
            id: c.global_uid || String(c.id), // global_uid post-migration, integer id fallback
        })));
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching customers', error: error.message });
    }
});

router.post('/', authenticateToken, (req: Request, res: Response) => {
    try {
        const { name, phone, plate_number, metadata } = req.body;
        if (!name) return res.status(400).json({ message: 'Name is required' });

        const cleanName = name.replace(/[^a-zA-Z\s]/g, '').trim();
        const cleanPhone = phone ? phone.replace(/[^0-9]/g, '').trim() : null;

        if (!cleanName) return res.status(400).json({ message: 'Invalid name characters removed, name cannot be empty' });

        // Encrypt sensitive metadata if present
        let finalMetadata = { ...metadata };
        if (finalMetadata.tax_id) {
            finalMetadata.tax_id_encrypted = encryptField(finalMetadata.tax_id);
            delete finalMetadata.tax_id;
        }

        const customer = mdmService.createCustomer(cleanName, cleanPhone || undefined, plate_number, finalMetadata);

        auditLog({
            table_name: 'customers',
            record_id: customer.global_uid,
            action: 'CREATE',
            changed_by: (req as any).user?.id?.toString(),
            ip_address: req.ip
        });

        res.status(201).json({ id: customer.global_uid, global_uid: customer.global_uid, message: 'Customer created successfully' });
    } catch (error: any) {
        if (error.message === 'CUSTOMER_ALREADY_EXISTS') {
            return res.status(409).json({ message: 'A customer with this name or phone number already exists.' });
        }
        res.status(500).json({ message: 'Error creating customer', error: error.message });
    }
});

router.put('/:id', authenticateToken, (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, phone, plate_number, metadata } = req.body;

        const existing = mdmService.getCustomerByUid(id as string);
        if (!existing) return res.status(404).json({ message: 'Customer not found' });

        const cleanName = name ? name.replace(/[^a-zA-Z\s]/g, '').trim() : existing.name;
        const cleanPhone = phone ? phone.replace(/[^0-9]/g, '').trim() : existing.phone;

        let finalMetadata = { ...existing.metadata, ...metadata };
        if (metadata && metadata.tax_id) {
            finalMetadata.tax_id_encrypted = encryptField(metadata.tax_id);
            delete finalMetadata.tax_id;
        }

        db.prepare('UPDATE customers SET name = ?, phone = ?, plate_number = ?, metadata = ? WHERE global_uid = ?').run(
            cleanName, cleanPhone, plate_number || existing.plate_number, JSON.stringify(finalMetadata), id
        );

        auditLog({
            table_name: 'customers',
            record_id: id as string,
            action: 'UPDATE',
            changed_by: (req as any).user?.id?.toString(),
            ip_address: req.ip
        });

        res.json({ message: 'Customer updated successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error updating customer', error: error.message });
    }
});

router.delete('/:id', authenticateToken, (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        db.prepare('UPDATE customers SET is_deleted = 1 WHERE global_uid = ?').run(id as string);

        auditLog({
            table_name: 'customers',
            record_id: id as string,
            action: 'DELETE',
            changed_by: (req as any).user?.id?.toString(),
            ip_address: req.ip
        });

        res.json({ message: 'Customer deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error deleting customer', error: error.message });
    }
});

router.post('/merge', authenticateToken, (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Only administrators can merge identities' });
        }

        const { primaryUid, secondaryUid } = req.body;
        if (!primaryUid || !secondaryUid) {
            return res.status(400).json({ message: 'Missing primary or secondary UUID' });
        }

        mdmService.executeIdentityMerge(primaryUid, secondaryUid, user.userId?.toString() || 'admin');

        res.json({ message: 'Identities merged successfully', primaryUid });
    } catch (error: any) {
        console.error('Merge Error:', error);
        res.status(500).json({ message: 'Error merging identities', error: error.message });
    }
});

router.get('/search', authenticateToken, (req: Request, res: Response) => {
    try {
        const { phone } = req.query;
        if (!phone || typeof phone !== 'string') {
            return res.json([]);
        }
        const customers = db.prepare('SELECT * FROM customers WHERE phone LIKE ? AND is_deleted = 0').all(`%${phone}%`);
        res.json(customers.map((c: any) => ({ ...c, id: c.global_uid || String(c.id) })));
    } catch (error: any) {
        res.status(500).json({ message: 'Error searching customers', error: error.message });
    }
});

// CRM Profile Endpoint
router.get('/:id/profile', authenticateToken, (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const customer = mdmService.getCustomerByUid(id as string);

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const timeline = crmService.getCustomerTimeline(id as string);

        const total_spent_idr = timeline
            .filter(e => e.event_type === 'SERVICE' || e.event_type === 'FUEL_PURCHASE')
            .reduce((sum, e) => sum + (e.amount_idr || 0), 0);

        res.json({
            customer,
            timeline,
            summary: {
                total_spent_idr,
                total_visits: timeline.filter(e => e.event_type === 'SERVICE' || e.event_type === 'FUEL_PURCHASE').length,
                last_visit: timeline.length > 0 ? timeline[0].timestamp : null
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching CRM profile', error: error.message });
    }
});

// Unmask Endpoint
router.post('/:uid/unmask/:field', authenticateToken, unmaskLimiter, (req: Request, res: Response) => {
    try {
        const { uid, field } = req.params;
        const requestingUser = (req as any).user;

        const allowedRoles = FIELD_VISIBILITY[field as string] || [];
        if (!allowedRoles.includes(requestingUser.role)) {
            auditLog({
                table_name: 'customers',
                record_id: uid as string,
                action: 'UNMASK_DENIED',
                changed_by: requestingUser.id?.toString(),
                ip_address: req.ip,
                reason: `Field: ${field}`
            });
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const customer = mdmService.getCustomerByUid(uid as string);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        let plainValue = '';
        if (field === 'phone' || field === 'phone_number') {
            plainValue = customer.phone || '';
        } else {
            const encryptedValue = customer.metadata[`${field as string}_encrypted`];
            if (!encryptedValue) {
                return res.status(404).json({ error: 'Field not found or not encrypted' });
            }
            plainValue = decryptField(encryptedValue);
        }

        auditLog({
            table_name: 'customers',
            record_id: uid as string,
            action: 'UNMASK_SUCCESS',
            changed_by: requestingUser.id?.toString(),
            ip_address: req.ip,
            reason: req.body.reason || `Unmasked ${field}`
        });

        res.json({ value: plainValue });
    } catch (error: any) {
        res.status(500).json({ message: 'Error unmasking field', error: error.message });
    }
});

export default router;
