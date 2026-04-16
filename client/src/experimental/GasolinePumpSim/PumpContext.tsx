'use client';

import { createContext, useContext } from 'react';

export interface TankData {
    fuel_type: string;
    capacity: number;
    current: number;
    pct: number;
    is_refueling: boolean;
    is_low: boolean;
    refuel_started_at: number | null;
}

export interface PumpStatus {
    pump_id: number;
    litres: number;
    cost: number;
    target_litres: number | null;
    target_cost: number | null;
    nozzle_off_hook: boolean;
    current_state: string;
    fuel_type: string;
    price_per_litre: number;
    session_id: string;
    fault_type: string | null;
}

export interface TelemetryData {
    pumps: PumpStatus[];
    tanks: TankData[];
    timestamp: number;
}

export interface StateChangeEvent {
    pump_id: number;
    state: string;
    session_id: string;
    fault_type: string | null;
    timestamp: number;
}

export interface PumpContextType {
    telemetry: TelemetryData | null;
    stateChanges: Map<number, StateChangeEvent>;
    connected: boolean;
    packets: TelemetryData[];
}

export const PumpContext = createContext<PumpContextType>({
    telemetry: null,
    stateChanges: new Map(),
    connected: false,
    packets: [],
});

export const usePumpContext = () => useContext(PumpContext);
