'use client';

import React, { useRef, useEffect } from 'react';
import { usePumpContext } from './PumpContext.tsx';

export default function PacketLog() {
    const { packets } = usePumpContext();
    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [packets.length]);

    return (
        <div className="packet-log bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-mono font-bold text-slate-500">PACKET LOG</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{packets.length} packets</span>
            </div>
            <div className="overflow-y-auto max-h-64 p-3 space-y-1 font-mono text-[11px]">
                {packets.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">Waiting for telemetry packets...</p>
                ) : (
                    packets.slice(-80).map((pkt, idx) => (
                        <div key={idx} className="flex gap-2 leading-relaxed">
                            <span className="text-slate-400 shrink-0">
                                {new Date(pkt.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            {pkt.pumps.map(p => (
                                <span key={p.pump_id} className="flex gap-1 items-center">
                                    <span className="text-slate-500 text-[9px]">P{p.pump_id}</span>
                                    <span className={`shrink-0 px-1 rounded text-[9px] font-bold ${
                                        p.current_state === 'PUMPING' ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' :
                                        p.current_state === 'FAULT' ? 'bg-red-100 text-red-600 border border-red-200' :
                                        p.current_state === 'COMPLETED' ? 'bg-amber-100 text-amber-600 border border-amber-200' :
                                        'bg-slate-200 text-slate-500 border border-slate-300'
                                    }`}>
                                        {p.current_state}
                                    </span>
                                    <span className="text-slate-500 text-[9px]">
                                        {p.litres.toFixed(2)}L
                                    </span>
                                </span>
                            ))}
                        </div>
                    ))
                )}
                <div ref={logEndRef} />
            </div>
        </div>
    );
}
