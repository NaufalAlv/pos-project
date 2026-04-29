"use strict";
/**
 * Storage Tank Manager
 * Manages per-fuel-type underground storage tanks with capacity tracking,
 * refueling simulation, and pump lockout during delivery.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageTankManager = void 0;
const LOW_THRESHOLD_PCT = 15;
const TICK_INTERVAL_MS = 16; // ~60fps, synced with telemetry
class StorageTankManager {
    constructor() {
        this.tanks = new Map();
        this.io = null;
    }
    setSocket(io) {
        this.io = io;
    }
    /**
     * Initialize tanks from POS fuel configs
     */
    initTanks(configs) {
        for (const cfg of configs) {
            // If tank already exists, update capacity/speed but keep current level
            const existing = this.tanks.get(cfg.fuel_type);
            if (existing) {
                existing.capacity = cfg.capacity_litres;
                existing.refuel_speed = cfg.refuel_speed;
            }
            else {
                this.tanks.set(cfg.fuel_type, {
                    fuel_type: cfg.fuel_type,
                    capacity: cfg.capacity_litres,
                    current: cfg.capacity_litres * 0.8, // Start at 80%
                    is_refueling: false,
                    refuel_speed: cfg.refuel_speed,
                    refuel_started_at: null,
                });
            }
        }
        console.log(`[Tank] Initialized ${this.tanks.size} tanks:`, this.getTankStatus().map(t => `${t.fuel_type}: ${t.current.toFixed(0)}/${t.capacity}L`));
    }
    /**
     * Deduct fuel during pumping. Returns false if tank is empty.
     */
    deductFuel(fuelType, litres) {
        const tank = this.tanks.get(fuelType);
        if (!tank)
            return true; // No tank tracking for unknown type, allow pumping
        if (tank.current <= 0) {
            tank.current = 0;
            return false; // Tank empty — trigger auto-stop
        }
        tank.current = Math.max(0, Math.round((tank.current - litres) * 1000) / 1000);
        return true;
    }
    /**
     * Check if a fuel type can be authorized (not refueling, not empty)
     */
    canAuthorize(fuelType) {
        const tank = this.tanks.get(fuelType);
        if (!tank)
            return { allowed: true }; // Unknown type, no restriction
        if (tank.is_refueling) {
            return { allowed: false, reason: `${fuelType} tank is being refueled — pump locked` };
        }
        if (tank.current <= 0) {
            return { allowed: false, reason: `${fuelType} tank is empty — refuel required` };
        }
        return { allowed: true };
    }
    /**
     * Start tanker delivery for a fuel type
     */
    startRefuel(fuelType) {
        const tank = this.tanks.get(fuelType);
        if (!tank)
            return { success: false, message: `Unknown fuel type: ${fuelType}` };
        if (tank.is_refueling)
            return { success: false, message: `${fuelType} is already being refueled` };
        if (tank.current >= tank.capacity)
            return { success: false, message: `${fuelType} tank is already full` };
        tank.is_refueling = true;
        tank.refuel_started_at = Date.now();
        console.log(`[Tank] 🚛 Tanker delivery started for ${fuelType} (${tank.current.toFixed(0)}/${tank.capacity}L)`);
        return { success: true, message: `Tanker delivery started for ${fuelType}` };
    }
    /**
     * Cancel an active tanker delivery
     */
    cancelRefuel(fuelType) {
        const tank = this.tanks.get(fuelType);
        if (!tank)
            return { success: false, message: `Unknown fuel type: ${fuelType}` };
        if (!tank.is_refueling)
            return { success: false, message: `${fuelType} is not being refueled` };
        tank.is_refueling = false;
        tank.refuel_started_at = null;
        console.log(`[Tank] ❌ Tanker delivery cancelled for ${fuelType} (level: ${tank.current.toFixed(0)}L)`);
        return { success: true, message: `Tanker delivery cancelled for ${fuelType}` };
    }
    /**
     * Called every telemetry tick (~60fps). Simulates refuel flow.
     */
    simulateRefuelTick() {
        for (const [, tank] of this.tanks) {
            if (!tank.is_refueling)
                continue;
            const litresPerTick = tank.refuel_speed * (TICK_INTERVAL_MS / 1000);
            tank.current = Math.min(tank.capacity, Math.round((tank.current + litresPerTick) * 1000) / 1000);
            if (tank.current >= tank.capacity) {
                tank.current = tank.capacity;
                tank.is_refueling = false;
                tank.refuel_started_at = null;
                console.log(`[Tank] ✅ Tanker delivery complete for ${tank.fuel_type} — tank full (${tank.capacity}L)`);
            }
        }
    }
    /**
     * Manually set tank level (for testing)
     */
    setLevel(fuelType, litres) {
        const tank = this.tanks.get(fuelType);
        if (!tank)
            return { success: false, message: `Unknown fuel type: ${fuelType}` };
        tank.current = Math.max(0, Math.min(tank.capacity, litres));
        return { success: true, message: `${fuelType} tank level set to ${tank.current.toFixed(0)}L` };
    }
    /**
     * Force-drain a tank to 0 (chaos mode)
     */
    drainTank(fuelType) {
        const tank = this.tanks.get(fuelType);
        if (!tank)
            return false;
        tank.current = 0;
        console.log(`[Tank] ⚠️ CHAOS: ${fuelType} tank drained to 0!`);
        return true;
    }
    /**
     * Check if any tank is currently refueling
     */
    isAnyRefueling() {
        for (const [, tank] of this.tanks) {
            if (tank.is_refueling)
                return true;
        }
        return false;
    }
    /**
     * Get all tank statuses for telemetry broadcast
     */
    getTankStatus() {
        const result = [];
        for (const [, tank] of this.tanks) {
            const pct = tank.capacity > 0 ? Math.round((tank.current / tank.capacity) * 100) : 0;
            result.push({
                fuel_type: tank.fuel_type,
                capacity: tank.capacity,
                current: Math.round(tank.current * 10) / 10,
                pct,
                is_refueling: tank.is_refueling,
                is_low: pct < LOW_THRESHOLD_PCT,
                refuel_started_at: tank.refuel_started_at,
            });
        }
        return result;
    }
}
exports.StorageTankManager = StorageTankManager;
