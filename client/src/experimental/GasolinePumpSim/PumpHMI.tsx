'use client';

import React from 'react';
import { PumpStatus } from './PumpContext.tsx';

interface PumpHMIProps {
    pump: PumpStatus;
    onAuthorize: (fuelType: string, pricePerLitre: number, targetLitres?: number, targetCost?: number) => void;
    onStart: () => void;
    onStop: () => void;
    onReset: () => void;
    onChaos: (type: string) => void;
    onChaosClear: () => void;
}

export default function PumpHMI({ pump, onAuthorize, onStart, onStop, onReset, onChaos, onChaosClear }: PumpHMIProps) {
    const state = pump.current_state;

    const stateColor: Record<string, string> = {
        IDLE: 'border-slate-200',
        AUTHORIZED: 'border-blue-300 ring-1 ring-blue-100',
        PUMPING: 'border-emerald-300 ring-1 ring-emerald-100',
        COMPLETED: 'border-amber-300 ring-1 ring-amber-100',
        FAULT: 'border-red-300 ring-1 ring-red-100',
        LOCKED: 'border-slate-300',
    };

    const statusDot: Record<string, string> = {
        IDLE: 'bg-slate-300',
        AUTHORIZED: 'bg-blue-400',
        PUMPING: 'bg-emerald-400 animate-pulse',
        COMPLETED: 'bg-amber-400',
        FAULT: 'bg-red-500 animate-pulse',
        LOCKED: 'bg-slate-300',
    };

    const stateBadge: Record<string, string> = {
        IDLE: 'bg-slate-100 text-slate-500',
        AUTHORIZED: 'bg-blue-100 text-blue-600',
        PUMPING: 'bg-emerald-100 text-emerald-600',
        COMPLETED: 'bg-amber-100 text-amber-600',
        FAULT: 'bg-red-100 text-red-600',
        LOCKED: 'bg-slate-200 text-slate-600',
    };

    const hasTarget = pump.target_litres && pump.target_litres > 0;
    const progressPct = hasTarget ? Math.min(100, (pump.litres / pump.target_litres!) * 100) : null;

    return (
        <div className={`rounded-2xl border bg-white overflow-hidden transition-all shadow-sm ${stateColor[state] || stateColor.IDLE}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${statusDot[state] || statusDot.IDLE}`} />
                    <span className="text-sm font-bold text-slate-800 font-mono">PUMP {pump.pump_id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stateBadge[state] || stateBadge.IDLE}`}>
                        {state}
                    </span>
                    {hasTarget && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-600 border border-cyan-100">
                            PRESET
                        </span>
                    )}
                </div>
                <span className="text-xs text-slate-500 font-mono">
                    {pump.fuel_type || '\u2014'}
                </span>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
                {/* Counters */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                        <div className="text-[10px] text-slate-500 font-mono uppercase mb-1">
                            Litres {hasTarget ? `/ ${pump.target_litres!.toFixed(1)}` : ''}
                        </div>
                        <div className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">
                            {pump.litres.toFixed(3)}
                        </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                        <div className="text-[10px] text-slate-500 font-mono uppercase mb-1">
                            Total (Rp) {pump.target_cost ? `/ ${pump.target_cost.toLocaleString('id-ID')}` : ''}
                        </div>
                        <div className="text-2xl font-bold font-mono text-amber-600 tabular-nums">
                            {pump.cost.toLocaleString('id-ID')}
                        </div>
                    </div>
                </div>

                {/* Price info */}
                {pump.price_per_litre > 0 && (
                    <div className="text-center text-xs text-slate-500 font-mono">
                        Rp {pump.price_per_litre.toLocaleString('id-ID')}/L
                    </div>
                )}

                {/* Progress bar for preset mode */}
                {hasTarget && (state === 'PUMPING' || state === 'AUTHORIZED') && progressPct !== null && (
                    <div className="space-y-1">
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-linear-to-r from-cyan-400 to-emerald-500 rounded-full transition-all duration-200"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono text-right">{progressPct.toFixed(1)}%</div>
                    </div>
                )}

                {/* Flow indicator (free pump mode) */}
                {!hasTarget && state === 'PUMPING' && (
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-linear-to-r from-emerald-500 to-teal-400 rounded-full animate-pulse" style={{ width: '100%' }} />
                    </div>
                )}

                {/* Fault info */}
                {pump.fault_type && (
                    <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-center">
                        <span className="text-xs font-bold text-red-600">\u26A0 {pump.fault_type}</span>
                    </div>
                )}

                {/* Controls */}
                <PumpControlButtons
                    state={state}
                    pump={pump}
                    onAuthorize={onAuthorize}
                    onStart={onStart}
                    onStop={onStop}
                    onReset={onReset}
                />

                {/* Chaos mini-panel */}
                <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100">
                    <span className="text-[9px] font-mono text-slate-400 uppercase mr-1">Chaos</span>
                    {['LOW_PRESSURE', 'NOZZLE_JAM', 'TANK_EMPTY'].map(fault => (
                        <button
                            key={fault}
                            onClick={() => onChaos(fault)}
                            disabled={fault !== 'TANK_EMPTY' && (state === 'IDLE' || state === 'COMPLETED')}
                            className="px-2 py-0.5 text-[9px] font-bold rounded bg-slate-50 hover:bg-slate-100 text-orange-600 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors border border-slate-200"
                        >
                            {fault === 'LOW_PRESSURE' ? '\u26A0LP' : fault === 'NOZZLE_JAM' ? '\uD83D\uDD27NJ' : '\uD83D\uDEE2\uFE0FTE'}
                        </button>
                    ))}
                    {pump.fault_type && (
                        <button
                            onClick={onChaosClear}
                            className="px-2 py-0.5 text-[9px] font-bold rounded bg-slate-50 hover:bg-emerald-50 text-emerald-600 border border-slate-200 hover:border-emerald-200 transition-colors"
                        >
                            \u2713Clear
                        </button>
                    )}
                </div>

                {/* Session ID */}
                {pump.session_id && (
                    <div className="text-[9px] font-mono text-slate-700 truncate">
                        {pump.session_id}
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Internal sub-component ---
type AuthMode = 'free' | 'litres' | 'currency';

function PumpControlButtons({ state, pump, onAuthorize, onStart, onStop, onReset }: {
    state: string;
    pump: PumpStatus;
    onAuthorize: (fuelType: string, pricePerLitre: number, targetLitres?: number, targetCost?: number) => void;
    onStart: () => void;
    onStop: () => void;
    onReset: () => void;
}) {
    const [fuelConfigs, setFuelConfigs] = React.useState<{ id: number; fuel_type: string; price_per_litre: number }[]>([]);
    const [selectedFuel, setSelectedFuel] = React.useState<{ id: number; fuel_type: string; price_per_litre: number } | null>(null);
    const [authMode, setAuthMode] = React.useState<AuthMode>('free');
    const [targetLitres, setTargetLitres] = React.useState<string>('');
    const [targetCurrency, setTargetCurrency] = React.useState<string>('');

    React.useEffect(() => {
        const fetchFuels = async () => {
            try {
                const apiMod = await import('@/utils/api');
                const res = await apiMod.default.get('/fuel-config/active');
                setFuelConfigs(res.data);
                if (res.data.length > 0 && !selectedFuel) setSelectedFuel(res.data[0]);
            } catch (err) {
                console.error('Failed to fetch fuel configs:', err);
            }
        };
        fetchFuels();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const price = selectedFuel?.price_per_litre || 0;
    const computedLitres = authMode === 'currency' && targetCurrency && price > 0
        ? (Number(targetCurrency) / price) : null;
    const computedCost = authMode === 'litres' && targetLitres && price > 0
        ? (Number(targetLitres) * price) : null;

    const handleAuthorize = () => {
        if (!selectedFuel) return;
        if (authMode === 'litres') {
            onAuthorize(selectedFuel.fuel_type, selectedFuel.price_per_litre, Number(targetLitres) || undefined, undefined);
        } else if (authMode === 'currency') {
            onAuthorize(selectedFuel.fuel_type, selectedFuel.price_per_litre, undefined, Number(targetCurrency) || undefined);
        } else {
            onAuthorize(selectedFuel.fuel_type, selectedFuel.price_per_litre);
        }
    };

    return (
        <div className="space-y-2">
            {state === 'IDLE' && (
                <>
                    <select
                        value={selectedFuel?.id || ''}
                        onChange={(e) => {
                            const fuel = fuelConfigs.find(f => f.id === Number(e.target.value));
                            if (fuel) setSelectedFuel(fuel);
                        }}
                        className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    >
                        {fuelConfigs.map(f => (
                            <option key={f.id} value={f.id}>
                                {f.fuel_type} \u2014 Rp {f.price_per_litre.toLocaleString('id-ID')}/L
                            </option>
                        ))}
                    </select>

                    {/* Mode Selector */}
                    <div className="flex gap-1">
                        {([
                            { mode: 'free' as AuthMode, label: '\u26FD Free Pump' },
                            { mode: 'litres' as AuthMode, label: '\uD83D\uDCCF By Litre' },
                            { mode: 'currency' as AuthMode, label: '\uD83D\uDCB0 By Rp' },
                        ]).map(({ mode: m, label }) => (
                            <button
                                key={m}
                                onClick={() => setAuthMode(m)}
                                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${authMode === m ? 'bg-purple-100 text-purple-700 shadow-sm border border-purple-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-transparent'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {authMode === 'litres' && (
                        <div className="space-y-1">
                            <input
                                type="number"
                                placeholder="Target litres (e.g. 10)"
                                value={targetLitres}
                                onChange={e => setTargetLitres(e.target.value)}
                                className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                            />
                            {computedCost !== null && computedCost > 0 && (
                                <div className="text-[10px] text-slate-500 font-mono text-right">
                                    \u2248 Rp {Math.round(computedCost).toLocaleString('id-ID')}
                                </div>
                            )}
                        </div>
                    )}

                    {authMode === 'currency' && (
                        <div className="space-y-1">
                            <input
                                type="number"
                                placeholder="Target Rp (e.g. 50000)"
                                value={targetCurrency}
                                onChange={e => setTargetCurrency(e.target.value)}
                                className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                            />
                            {computedLitres !== null && computedLitres > 0 && (
                                <div className="text-[10px] text-slate-500 font-mono text-right">
                                    \u2248 {computedLitres.toFixed(3)}L
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        onClick={handleAuthorize}
                        disabled={!selectedFuel}
                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
                    >
                        {'\uD83D\uDD13'} Authorize {authMode !== 'free' ? `(${authMode === 'litres' ? `${targetLitres || '?'}L` : `Rp ${targetCurrency || '?'}`})` : ''}
                    </button>
                </>
            )}

            {state === 'AUTHORIZED' && (
                <button
                    onClick={onStart}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all active:scale-95 animate-pulse"
                >
                    {'\u26FD'} Start Pumping
                </button>
            )}

            {state === 'PUMPING' && (
                <button
                    onClick={onStop}
                    className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all active:scale-95 ring-2 ring-red-400/30"
                >
                    {'\u23F9'} STOP
                </button>
            )}

            {(state === 'COMPLETED' || state === 'FAULT') && (
                <button
                    onClick={onReset}
                    className="w-full py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-all active:scale-95"
                >
                    {'\uD83D\uDD04'} Reset to IDLE
                </button>
            )}

            {state === 'LOCKED' && (
                <div className="text-center py-2 text-xs text-slate-500 font-mono">
                    {'\uD83D\uDD12'} Pump locked \u2014 refueling in progress
                </div>
            )}
        </div>
    );
}
