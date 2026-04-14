import { Router, Request, Response } from 'express';
import * as CustomerModel from '../models/Customer';

const router = Router();

router.get('/', (req: Request, res: Response) => {
    try {
        const customers = CustomerModel.getAllCustomers();
        res.json(customers);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching customers', error: error.message });
    }
});

router.post('/', (req: Request, res: Response) => {
    try {
        const { name, phone, plate_number } = req.body;
        if (!name) return res.status(400).json({ message: 'Name is required' });
        const id = CustomerModel.createCustomer(name, phone, plate_number);
        res.status(201).json({ id, message: 'Customer created successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error creating customer', error: error.message });
    }
});

router.put('/:id', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, phone, plate_number } = req.body;
        CustomerModel.updateCustomer(Number(id), name, phone, plate_number);
        res.json({ message: 'Customer updated successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error updating customer', error: error.message });
    }
});

router.delete('/:id', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        CustomerModel.deleteCustomer(Number(id));
        res.json({ message: 'Customer deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error deleting customer', error: error.message });
    }
});

router.get('/search', (req: Request, res: Response) => {
    try {
        const { phone } = req.query;
        if (!phone || typeof phone !== 'string') {
            return res.json([]);
        }
        const customers = CustomerModel.searchCustomersByPhone(phone);
        res.json(customers);
    } catch (error: any) {
        res.status(500).json({ message: 'Error searching customers', error: error.message });
    }
});

export default router;
