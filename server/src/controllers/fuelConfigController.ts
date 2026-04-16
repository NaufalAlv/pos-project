import { Request, Response } from 'express';
import * as FuelConfigModel from '../models/FuelConfig';

export const getAll = async (req: Request, res: Response) => {
    try {
        const configs = FuelConfigModel.getAllFuelConfigs();
        res.json(configs);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching fuel configs', error: error.message });
    }
};

export const getActive = async (req: Request, res: Response) => {
    try {
        const configs = FuelConfigModel.getActiveFuelConfigs();
        res.json(configs);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching active fuel configs', error: error.message });
    }
};

export const updatePrice = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const { price_per_litre } = req.body;

        if (typeof price_per_litre !== 'number' || price_per_litre < 0) {
            return res.status(400).json({ message: 'Invalid price value' });
        }

        FuelConfigModel.updateFuelPrice(id, price_per_litre);
        res.json({ message: 'Fuel price updated' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error updating fuel price', error: error.message });
    }
};

export const updateTankConfig = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const { tank_capacity, refuel_speed } = req.body;

        if (typeof tank_capacity !== 'number' || tank_capacity <= 0) {
            return res.status(400).json({ message: 'Invalid tank capacity' });
        }
        if (typeof refuel_speed !== 'number' || refuel_speed <= 0) {
            return res.status(400).json({ message: 'Invalid refuel speed' });
        }

        FuelConfigModel.updateTankConfig(id, tank_capacity, refuel_speed);
        res.json({ message: 'Tank config updated' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error updating tank config', error: error.message });
    }
};

export const toggleActive = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const { is_active } = req.body;

        FuelConfigModel.toggleFuelActive(id, is_active);
        res.json({ message: 'Fuel config updated' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error toggling fuel config', error: error.message });
    }
};

export const create = async (req: Request, res: Response) => {
    try {
        const { fuel_type, price_per_litre, tank_capacity, refuel_speed } = req.body;

        if (!fuel_type || typeof price_per_litre !== 'number' || price_per_litre < 0) {
            return res.status(400).json({ message: 'Invalid fuel type or price' });
        }

        FuelConfigModel.createFuelConfig(fuel_type, price_per_litre, tank_capacity || 10000, refuel_speed || 50);
        res.status(201).json({ message: 'Fuel config created' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error creating fuel config', error: error.message });
    }
};
