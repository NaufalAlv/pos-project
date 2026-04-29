"use strict";
/**
 * Pump State Machine
 * States: IDLE → AUTHORIZED → PUMPING → COMPLETED → FAULT
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PumpStateMachine = void 0;
const VALID_TRANSITIONS = {
    'IDLE': ['AUTHORIZED', 'FAULT', 'LOCKED'],
    'AUTHORIZED': ['PUMPING', 'IDLE', 'FAULT'],
    'PUMPING': ['COMPLETED', 'FAULT'],
    'COMPLETED': ['IDLE'],
    'FAULT': ['IDLE'],
    'LOCKED': ['IDLE'],
};
class PumpStateMachine {
    constructor(pumpId = 1) {
        this.onStateChange = null;
        this.pumpId = pumpId;
        this.session = this.createIdleSession();
    }
    createIdleSession() {
        return {
            id: '',
            pump_id: this.pumpId,
            state: 'IDLE',
            fuel_type: '',
            price_per_litre: 0,
            litres_dispensed: 0,
            total_cost: 0,
            target_litres: null,
            target_cost: null,
            nozzle_off_hook: false,
            started_at: null,
            completed_at: null,
            fault_type: null,
        };
    }
    setOnStateChange(callback) {
        this.onStateChange = callback;
    }
    getSession() {
        return { ...this.session };
    }
    getState() {
        return this.session.state;
    }
    transition(newState) {
        const allowed = VALID_TRANSITIONS[this.session.state];
        if (!allowed.includes(newState)) {
            console.warn(`Invalid transition: ${this.session.state} → ${newState}`);
            return false;
        }
        this.session.state = newState;
        this.onStateChange?.(this.getSession());
        return true;
    }
    /**
     * Authorize the pump — called when POS sends valid JWT
     */
    authorize(fuelType, pricePerLitre, targetLitres, targetCost) {
        if (this.session.state !== 'IDLE')
            return false;
        this.session.id = `PUMP-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        this.session.fuel_type = fuelType;
        this.session.price_per_litre = pricePerLitre;
        this.session.litres_dispensed = 0;
        this.session.total_cost = 0;
        this.session.nozzle_off_hook = false;
        this.session.fault_type = null;
        // Set dispense target
        if (targetLitres && targetLitres > 0) {
            this.session.target_litres = targetLitres;
            this.session.target_cost = Math.round(targetLitres * pricePerLitre);
        }
        else if (targetCost && targetCost > 0) {
            this.session.target_cost = targetCost;
            this.session.target_litres = Math.round((targetCost / pricePerLitre) * 1000) / 1000;
        }
        else {
            this.session.target_litres = null;
            this.session.target_cost = null;
        }
        return this.transition('AUTHORIZED');
    }
    /**
     * Start pumping — called when nozzle goes off-hook
     */
    startPumping() {
        if (this.session.state !== 'AUTHORIZED')
            return false;
        this.session.nozzle_off_hook = true;
        this.session.started_at = Date.now();
        return this.transition('PUMPING');
    }
    /**
     * Update telemetry during pumping
     */
    updateTelemetry(litresIncrement) {
        if (this.session.state !== 'PUMPING')
            return false;
        this.session.litres_dispensed = Math.round((this.session.litres_dispensed + litresIncrement) * 1000) / 1000;
        this.session.total_cost = Math.round(this.session.litres_dispensed * this.session.price_per_litre);
        // Auto-stop when target reached
        if (this.session.target_litres && this.session.litres_dispensed >= this.session.target_litres) {
            this.session.litres_dispensed = this.session.target_litres;
            this.session.total_cost = Math.round(this.session.litres_dispensed * this.session.price_per_litre);
            return true; // signals caller to call complete()
        }
        return false;
    }
    /**
     * Complete the pumping session
     */
    complete() {
        if (this.session.state !== 'PUMPING')
            return false;
        this.session.nozzle_off_hook = false;
        this.session.completed_at = Date.now();
        return this.transition('COMPLETED');
    }
    /**
     * Trigger a fault
     */
    fault(faultType) {
        if (this.session.state === 'COMPLETED' || this.session.state === 'IDLE')
            return false;
        this.session.fault_type = faultType;
        this.session.nozzle_off_hook = false;
        return this.transition('FAULT');
    }
    /**
     * Reset to IDLE
     */
    reset() {
        if (this.session.state !== 'COMPLETED' && this.session.state !== 'FAULT')
            return false;
        this.session = this.createIdleSession();
        this.onStateChange?.(this.getSession());
        return true;
    }
    /**
     * Lock pump — called when refueling starts
     */
    lock() {
        if (this.session.state !== 'IDLE')
            return false;
        return this.transition('LOCKED');
    }
    /**
     * Unlock pump — called when refueling completes
     */
    unlock() {
        if (this.session.state !== 'LOCKED')
            return false;
        this.session = this.createIdleSession();
        this.onStateChange?.(this.getSession());
        return true;
    }
}
exports.PumpStateMachine = PumpStateMachine;
