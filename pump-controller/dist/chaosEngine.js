"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChaosEngine = void 0;
class ChaosEngine {
    constructor(pumps, telemetry, tankManager) {
        this.activeFaults = new Map(); // per-pump faults
        this.pumps = pumps;
        this.telemetry = telemetry;
        this.tankManager = tankManager;
    }
    getActiveFault(pumpId) {
        return this.activeFaults.get(pumpId) || null;
    }
    getAllActiveFaults() {
        const result = {};
        for (const [id, fault] of this.activeFaults) {
            result[id] = fault;
        }
        return result;
    }
    triggerFault(pumpId, type) {
        const pump = this.pumps.get(pumpId);
        if (!pump)
            return false;
        const state = pump.getState();
        // TANK_EMPTY can be triggered from any state except LOCKED
        if (type !== 'TANK_EMPTY' && (state === 'IDLE' || state === 'COMPLETED')) {
            console.warn(`[ChaosEngine] Cannot trigger fault in ${state} state for pump ${pumpId}`);
            return false;
        }
        this.activeFaults.set(pumpId, type);
        switch (type) {
            case 'LOW_PRESSURE':
                this.telemetry.setFlowRateMultiplier(pumpId, 0);
                console.log(`[ChaosEngine] LOW_PRESSURE fault triggered on pump ${pumpId}`);
                setTimeout(() => {
                    pump.fault('LOW_PRESSURE');
                }, 500);
                break;
            case 'NOZZLE_JAM':
                this.telemetry.setFlowRateMultiplier(pumpId, 0);
                console.log(`[ChaosEngine] NOZZLE_JAM fault triggered on pump ${pumpId}`);
                setTimeout(() => {
                    pump.fault('NOZZLE_JAM');
                }, 300);
                break;
            case 'TANK_EMPTY':
                const session = pump.getSession();
                const fuelType = session.fuel_type || 'Pertamax';
                this.tankManager.drainTank(fuelType);
                console.log(`[ChaosEngine] TANK_EMPTY triggered — ${fuelType} drained to 0`);
                break;
        }
        return true;
    }
    clearFault(pumpId) {
        this.activeFaults.delete(pumpId);
        this.telemetry.setFlowRateMultiplier(pumpId, 1.0);
        console.log(`[ChaosEngine] Fault cleared for pump ${pumpId}`);
    }
}
exports.ChaosEngine = ChaosEngine;
