'use client';

import React from 'react';
import { usePumpContext, TankData } from './PumpContext.tsx';

function SingleTankGauge({ tank }: { tank: TankData }) {
    const fillHeight = Math.max(0, Math.min(100, tank.pct));
    
    // Color based on level
    const getColor = (pct: number) => {
        if (pct > 50) return { fill: '#22c55e', glow: 'rgba(34,197,94,0.3)', label: 'text-emerald-400' };
        if (pct > 15) return { fill: '#f59e0b', glow: 'rgba(245,158,11,0.3)', label: 'text-amber-400' };
        return { fill: '#ef4444', glow: 'rgba(239,68,68,0.4)', label: 'text-red-400' };
    };
    
    const color = getColor(tank.pct);

    return (
        <div className="flex flex-col items-center gap-2">
            {/* Tank label */}
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {tank.fuel_type}
            </span>

            {/* SVG Tank Gauge */}
            <div className="relative">
                <svg width="60" height="140" viewBox="0 0 60 140">
                    {/* Tank outline */}
                    <rect x="5" y="10" width="50" height="120" rx="6" ry="6"
                        fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
                    
                    {/* Liquid fill */}
                    <clipPath id={`tank-clip-${tank.fuel_type}`}>
                        <rect x="8" y="13" width="44" height="114" rx="4" ry="4" />
                    </clipPath>
                    <rect
                        x="8"
                        y={13 + 114 * (1 - fillHeight / 100)}
                        width="44"
                        height={114 * (fillHeight / 100)}
                        fill={color.fill}
                        clipPath={`url(#tank-clip-${tank.fuel_type})`}
                        style={{ transition: 'y 0.3s ease, height 0.3s ease' }}
                        opacity={0.85}
                    />

                    {/* Liquid wave animation during refueling */}
                    {tank.is_refueling && (
                        <g clipPath={`url(#tank-clip-${tank.fuel_type})`}>
                            <rect
                                x="8"
                                y={13 + 114 * (1 - fillHeight / 100) - 3}
                                width="44"
                                height="6"
                                fill={color.fill}
                                opacity={0.5}
                                className="animate-pulse"
                            />
                        </g>
                    )}

                    {/* Level markings */}
                    {[0, 25, 50, 75, 100].map(mark => (
                        <g key={mark}>
                            <line
                                x1="50" y1={13 + 114 * (1 - mark / 100)}
                                x2="55" y2={13 + 114 * (1 - mark / 100)}
                                stroke="#cbd5e1" strokeWidth="1"
                            />
                        </g>
                    ))}
                    
                    {/* Percentage text */}
                    <text x="30" y="80" textAnchor="middle" 
                        fill="#1e293b" fontSize="14" fontWeight="bold" fontFamily="monospace"
                        style={{ textShadow: `0 0 10px white` }}>
                        {tank.pct}%
                    </text>
                </svg>

                {/* Refueling badge */}
                {tank.is_refueling && (
                    <div className="absolute -top-1 -right-2 px-1.5 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-md animate-pulse shadow-lg">
                        FILL
                    </div>
                )}

                {/* Low fuel warning */}
                {tank.is_low && !tank.is_refueling && (
                    <div className="absolute -top-1 -right-2 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-md animate-pulse shadow-lg">
                        LOW
                    </div>
                )}
            </div>

            {/* Volume readout */}
            <div className="text-center">
                <span className={`text-xs font-mono font-bold ${color.label}`}>
                    {tank.current.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] text-slate-500 ml-0.5">
                    / {tank.capacity.toLocaleString('id-ID')}L
                </span>
            </div>
        </div>
    );
}

export default function TankGauge() {
    const { telemetry } = usePumpContext();
    const tanks = telemetry?.tanks || [];

    if (tanks.length === 0) return null;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    ⛽ Storage Tanks
                </span>
                <span className="text-[10px] text-slate-400 font-mono">LIVE</span>
            </div>
            <div className="flex items-end justify-center gap-6 p-4">
                {tanks.map(tank => (
                    <SingleTankGauge key={tank.fuel_type} tank={tank} />
                ))}
            </div>
        </div>
    );
}
