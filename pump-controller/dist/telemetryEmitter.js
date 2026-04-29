"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryEmitter = void 0;
const FLOW_RATE_LPS = 0.5; // Litres per second (default)
const TICK_INTERVAL_MS = 16; // ~60fps
const LITRES_PER_TICK = FLOW_RATE_LPS * (TICK_INTERVAL_MS / 1000);
class TelemetryEmitter {
    constructor(io, pumps, tankManager) {
        this.tickInterval = null;
        this.flowRateMultipliers = new Map(); // per-pump multiplier
        this.io = io;
        this.pumps = pumps;
        this.tankManager = tankManager;
        for (const p of pumps) {
            this.flowRateMultipliers.set(p.pumpId, 1.0);
        }
    }
    setFlowRateMultiplier(pumpId, multiplier) {
        this.flowRateMultipliers.set(pumpId, multiplier);
    }
    /** Add a pump dynamically */
    addPump(pump) {
        this.pumps.push(pump);
        this.flowRateMultipliers.set(pump.pumpId, 1.0);
    }
    start() {
        if (this.tickInterval)
            return;
        this.tickInterval = setInterval(() => {
            // Simulate refuel flow on every tick
            this.tankManager.simulateRefuelTick();
            // Process each pump
            const pumpStates = [];
            for (const pump of this.pumps) {
                const session = pump.getSession();
                // Auto-unlock pump if no tanks are refueling and pump is LOCKED
                if (session.state === 'LOCKED' && !this.tankManager.isAnyRefueling()) {
                    pump.unlock();
                }
                if (session.state === 'PUMPING') {
                    const multiplier = this.flowRateMultipliers.get(pump.pumpId) ?? 1.0;
                    const increment = LITRES_PER_TICK * multiplier;
                    // Deduct from storage tank — auto-stop if empty
                    const hasStock = this.tankManager.deductFuel(session.fuel_type, increment);
                    if (!hasStock) {
                        console.log(`[Telemetry] ⚠️ Tank empty for ${session.fuel_type} — auto-stopping pump ${pump.pumpId}`);
                        pump.complete();
                    }
                    else {
                        const targetReached = pump.updateTelemetry(increment);
                        if (targetReached) {
                            console.log(`[Telemetry] ✅ Preset target reached on pump ${pump.pumpId} — auto-completing`);
                            pump.complete();
                        }
                    }
                }
                const currentSession = pump.getSession();
                pumpStates.push({
                    pump_id: pump.pumpId,
                    litres: currentSession.litres_dispensed,
                    cost: currentSession.total_cost,
                    target_litres: currentSession.target_litres,
                    target_cost: currentSession.target_cost,
                    nozzle_off_hook: currentSession.nozzle_off_hook,
                    current_state: pump.getState(),
                    fuel_type: currentSession.fuel_type,
                    price_per_litre: currentSession.price_per_litre,
                    session_id: currentSession.id,
                    fault_type: currentSession.fault_type,
                });
            }
            // Broadcast aggregated telemetry
            const telemetry = {
                pumps: pumpStates,
                tanks: this.tankManager.getTankStatus(),
                timestamp: Date.now(),
            };
            this.io.emit('telemetry', telemetry);
        }, TICK_INTERVAL_MS);
    }
    stop() {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
    }
}
exports.TelemetryEmitter = TelemetryEmitter;
