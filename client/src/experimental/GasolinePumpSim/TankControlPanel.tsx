'use client';

import React, { useState } from 'react';
import { usePumpContext, TankData } from './PumpContext.tsx';

const PUMP_API = 'http://localhost:5001/api';

function TankCard({ tank }: { tank: TankData }) {
    const [loading, setLoading] = useState(false);
    const [manualLevel, setManualLevel] = useState(tank.current);

    const isPumping = false; // We only show controls when pump isn't actively pumping

    const handleRefuel = async () => {
        setLoading(true);
        try {
            await fetch(`${PUMP_API}/tank/refuel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fuel_type: tank.fuel_type }),
            });
        } catch (e) {
            console.error('Failed to start refuel', e);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelRefuel = async () => {
        setLoading(true);
        try {
            await fetch(`${PUMP_API}/tank/refuel/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fuel_type: tank.fuel_type }),
            });
        } catch (e) {
            console.error('Failed to cancel refuel', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSetLevel = async () => {
        try {
            await fetch(`${PUMP_API}/tank/set-level`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fuel_type: tank.fuel_type, litres: manualLevel }),
            });
        } catch (e) {
            console.error('Failed to set level', e);
        }
    };

    const levelColor = tank.pct > 50 ? 'text-emerald-400' : tank.pct > 15 ? 'text-amber-400' : 'text-red-400';
    const barColor = tank.pct > 50 ? 'bg-emerald-500' : tank.pct > 15 ? 'bg-amber-500' : 'bg-red-500';

    return (
        <div className={`rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 transition-all overflow-hidden ${
            tank.is_refueling ? 'ring-2 ring-blue-300' : ''
        }`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">{tank.fuel_type}</span>
                    {tank.is_refueling && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-bold rounded-full border border-blue-200 animate-pulse">
                            🚛 REFUELING
                        </span>
                    )}
                    {tank.is_low && !tank.is_refueling && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full border border-red-200">
                            ⚠ LOW
                        </span>
                    )}
                    {tank.current === 0 && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-500 text-[10px] font-bold rounded-full border border-red-200">
                            EMPTY
                        </span>
                    )}
                </div>
                <span className={`text-lg font-mono font-bold ${levelColor}`}>
                    {tank.pct}%
                </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor} ${
                        tank.is_refueling ? 'animate-pulse' : ''
                    }`}
                    style={{ width: `${tank.pct}%` }}
                />
            </div>

            {/* Volume */}
            <div className="flex justify-between text-xs text-slate-500">
                <span>
                    <span className="font-mono font-bold text-slate-800">
                        {tank.current.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                    </span>{' '}
                    / {tank.capacity.toLocaleString('id-ID')}L
                </span>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
                {!tank.is_refueling ? (
                    <button
                        onClick={handleRefuel}
                        disabled={loading || tank.current >= tank.capacity}
                        className="flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        🚛 Start Refuel
                    </button>
                ) : (
                    <button
                        onClick={handleCancelRefuel}
                        disabled={loading}
                        className="flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all bg-red-600 hover:bg-red-700 text-white"
                    >
                        ✕ Cancel Delivery
                    </button>
                )}
            </div>

            {/* Manual level adjuster (testing) */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Test: Set Level</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                        {manualLevel.toLocaleString('id-ID')}L
                    </span>
                </div>
                <div className="flex gap-2 items-center">
                    <input
                        type="range"
                        min={0}
                        max={tank.capacity}
                        step={100}
                        value={manualLevel}
                        onChange={e => setManualLevel(Number(e.target.value))}
                        className="flex-1 min-w-0 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-amber-500"
                    />
                    <button
                        onClick={handleSetLevel}
                        className="px-2 py-1 text-[10px] font-bold rounded bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors"
                    >
                        SET
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function TankControlPanel() {
    const { telemetry } = usePumpContext();
    const tanks = telemetry?.tanks || [];
    const isLocked = telemetry?.pumps?.some(p => p.current_state === 'LOCKED') || false;

    if (tanks.length === 0) return null;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    🛢️ Tank Operations
                </span>
                {isLocked && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-600 text-[10px] font-bold rounded-full border border-amber-200 animate-pulse">
                        🔒 PUMP LOCKED
                    </span>
                )}
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tanks.map(tank => (
                    <TankCard key={tank.fuel_type} tank={tank} />
                ))}
            </div>
        </div>
    );
}
