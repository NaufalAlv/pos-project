import { db } from '../config/db';

export interface FuelConfig {
    id?: number;
    fuel_type: string;
    price_per_litre: number;
    tank_capacity: number;
    refuel_speed: number;
    is_active: number;
    created_at?: string;
    updated_at?: string;
}

export const getAllFuelConfigs = (): FuelConfig[] => {
    const stmt = db.prepare('SELECT * FROM fuel_config ORDER BY fuel_type ASC');
    return stmt.all() as FuelConfig[];
};

export const getActiveFuelConfigs = (): FuelConfig[] => {
    const stmt = db.prepare('SELECT * FROM fuel_config WHERE is_active = 1 ORDER BY fuel_type ASC');
    return stmt.all() as FuelConfig[];
};

export const updateFuelPrice = (id: number, price_per_litre: number): void => {
    if (price_per_litre < 0) throw new Error('Price cannot be negative');
    const stmt = db.prepare('UPDATE fuel_config SET price_per_litre = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(price_per_litre, id);
};

export const updateTankConfig = (id: number, tank_capacity: number, refuel_speed: number): void => {
    if (tank_capacity <= 0) throw new Error('Tank capacity must be positive');
    if (refuel_speed <= 0) throw new Error('Refuel speed must be positive');
    const stmt = db.prepare('UPDATE fuel_config SET tank_capacity = ?, refuel_speed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(tank_capacity, refuel_speed, id);
};

export const toggleFuelActive = (id: number, is_active: boolean): void => {
    const stmt = db.prepare('UPDATE fuel_config SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(is_active ? 1 : 0, id);
};

export const createFuelConfig = (fuel_type: string, price_per_litre: number, tank_capacity: number = 10000, refuel_speed: number = 50): void => {
    if (price_per_litre < 0) throw new Error('Price cannot be negative');
    const stmt = db.prepare('INSERT INTO fuel_config (fuel_type, price_per_litre, tank_capacity, refuel_speed) VALUES (?, ?, ?, ?)');
    stmt.run(fuel_type, price_per_litre, tank_capacity, refuel_speed);
};
