import { PumpStateMachine } from './pumpStateMachine';
import { TelemetryEmitter } from './telemetryEmitter';
import { StorageTankManager } from './storageTankManager';

export type FaultType = 'LOW_PRESSURE' | 'NOZZLE_JAM' | 'TANK_EMPTY';

export class ChaosEngine {
    private pumps: Map<number, PumpStateMachine>;
    private telemetry: TelemetryEmitter;
    private tankManager: StorageTankManager;
    private activeFaults: Map<number, FaultType> = new Map(); // per-pump faults

    constructor(pumps: Map<number, PumpStateMachine>, telemetry: TelemetryEmitter, tankManager: StorageTankManager) {
        this.pumps = pumps;
        this.telemetry = telemetry;
        this.tankManager = tankManager;
    }

    getActiveFault(pumpId: number): FaultType | null {
        return this.activeFaults.get(pumpId) || null;
    }

    getAllActiveFaults(): Record<number, FaultType> {
        const result: Record<number, FaultType> = {};
        for (const [id, fault] of this.activeFaults) {
            result[id] = fault;
        }
        return result;
    }

    triggerFault(pumpId: number, type: FaultType): boolean {
        const pump = this.pumps.get(pumpId);
        if (!pump) return false;

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

    clearFault(pumpId: number): void {
        this.activeFaults.delete(pumpId);
        this.telemetry.setFlowRateMultiplier(pumpId, 1.0);
        console.log(`[ChaosEngine] Fault cleared for pump ${pumpId}`);
    }
}
