'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import PumpHMI from './PumpHMI.tsx';
import PacketLog from './PacketLog.tsx';
import TankGauge from './TankGauge.tsx';
import TankControlPanel from './TankControlPanel.tsx';
import PumpCheckoutModal from './PumpCheckoutModal.tsx';
import { PumpContext, TelemetryData, StateChangeEvent, PumpStatus } from './PumpContext.tsx';
import './hmi.css';

export type { TelemetryData, StateChangeEvent, PumpStatus } from './PumpContext.tsx';
export { usePumpContext } from './PumpContext.tsx';

const PUMP_URL = 'http://localhost:5001';
const PUMP_API = `${PUMP_URL}/api`;
const MAX_PACKETS = 200;

interface PendingPayment {
    id: number;
    invoice_number: string;
    pump_id: number;
    total_amount: number;
    item_name: string;
    litres: number;
    price_per_litre: number;
    reference_id: string;
    created_at: string;
}

export default function GasolinePumpSim() {
    const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
    const [stateChanges, setStateChanges] = useState<Map<number, StateChangeEvent>>(new Map());
    const [connected, setConnected] = useState(false);
    const [packets, setPackets] = useState<TelemetryData[]>([]);
    const [showPacketLog, setShowPacketLog] = useState(false);
    const [checkoutTx, setCheckoutTx] = useState<PendingPayment | null>(null);
    const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
    const socketRef = useRef<Socket | null>(null);
    const packetCountRef = useRef(0);

    // Fetch pending payments from POS API
    const fetchPendingPayments = useCallback(async () => {
        try {
            const api = (await import('@/utils/api')).default;
            const res = await api.get('/transactions/pump-pending');
            setPendingPayments(res.data);
        } catch (e) {
            console.error('[HMI] Failed to fetch pending payments:', e);
        }
    }, []);

    // Poll pending payments every 3 seconds
    useEffect(() => {
        fetchPendingPayments();
        const interval = setInterval(fetchPendingPayments, 3000);
        return () => clearInterval(interval);
    }, [fetchPendingPayments]);

    const handleTelemetry = useCallback((data: TelemetryData) => {
        setTelemetry(data);
        packetCountRef.current++;
        if (packetCountRef.current % 30 === 0) {
            setPackets(prev => {
                const next = [...prev, data];
                return next.length > MAX_PACKETS ? next.slice(-MAX_PACKETS) : next;
            });
        }
    }, []);

    const handleStateChange = useCallback((data: StateChangeEvent) => {
        setStateChanges(prev => {
            const next = new Map(prev);
            next.set(data.pump_id, data);
            return next;
        });
        // Refresh pending payments when any pump completes
        if (data.state === 'COMPLETED') {
            setTimeout(() => fetchPendingPayments(), 500);
        }
    }, [fetchPendingPayments]);

    useEffect(() => {
        const socket = io(PUMP_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[HMI] Connected to Pump Controller');
            setConnected(true);
        });

        socket.on('disconnect', () => {
            console.log('[HMI] Disconnected from Pump Controller');
            setConnected(false);
        });

        socket.on('telemetry', handleTelemetry);
        socket.on('state_change', handleStateChange);

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [handleTelemetry, handleStateChange]);

    const pumpStatuses = telemetry?.pumps || [];

    // Pump actions — per pump
    const authorizePump = async (pumpId: number, fuelType: string, pricePerLitre: number, targetLitres?: number, targetCost?: number) => {
        try {
            const res = await fetch(`${PUMP_API}/pump/${pumpId}/authorize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fuel_type: fuelType, price_per_litre: pricePerLitre, target_litres: targetLitres, target_cost: targetCost }),
            });
            if (!res.ok) {
                const err = await res.json();
                console.warn(`Auth failed for pump ${pumpId}:`, err.message);
            }
        } catch (e) { console.error('Authorize failed:', e); }
    };

    const startPump = async (pumpId: number) => {
        try { await fetch(`${PUMP_API}/pump/${pumpId}/start`, { method: 'POST' }); }
        catch (e) { console.error('Start failed:', e); }
    };

    const stopPump = async (pumpId: number) => {
        try { await fetch(`${PUMP_API}/pump/${pumpId}/stop`, { method: 'POST' }); }
        catch (e) { console.error('Stop failed:', e); }
    };

    const resetPump = async (pumpId: number) => {
        try { await fetch(`${PUMP_API}/pump/${pumpId}/reset`, { method: 'POST' }); }
        catch (e) { console.error('Reset failed:', e); }
    };

    const triggerChaos = async (pumpId: number, faultType: string) => {
        try {
            await fetch(`${PUMP_API}/pump/${pumpId}/chaos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fault_type: faultType }),
            });
        } catch (e) { console.error('Chaos failed:', e); }
    };

    const clearChaos = async (pumpId: number) => {
        try { await fetch(`${PUMP_API}/pump/${pumpId}/chaos/clear`, { method: 'POST' }); }
        catch (e) { console.error('Clear chaos failed:', e); }
    };

    return (
        <PumpContext.Provider value={{ telemetry, stateChanges, connected, packets }}>
            <div className="hmi-container space-y-4">
                {/* Connection indicator */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-xs font-mono text-slate-400">
                            {connected ? 'CONNECTED' : 'DISCONNECTED'} • {pumpStatuses.length} Pumps
                        </span>
                    </div>
                    <button
                        onClick={() => setShowPacketLog(!showPacketLog)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${showPacketLog ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        {showPacketLog ? '✕ Close Log' : '📋 Packet Log'}
                    </button>
                </div>

                {/* Pump Stations Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {pumpStatuses.map(pump => (
                        <PumpHMI
                            key={pump.pump_id}
                            pump={pump}
                            onAuthorize={(fuelType: string, price: number, targetLitres?: number, targetCost?: number) => authorizePump(pump.pump_id, fuelType, price, targetLitres, targetCost)}
                            onStart={() => startPump(pump.pump_id)}
                            onStop={() => stopPump(pump.pump_id)}
                            onReset={() => resetPump(pump.pump_id)}
                            onChaos={(type) => triggerChaos(pump.pump_id, type)}
                            onChaosClear={() => clearChaos(pump.pump_id)}
                        />
                    ))}
                </div>

                {/* Pending Payments — persisted from POS DB */}
                {pendingPayments.length > 0 && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden">
                        <div className="px-4 py-3 border-b border-amber-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">
                                    💳 Pending Payments
                                </span>
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-600 text-white">
                                    {pendingPayments.length}
                                </span>
                            </div>
                            <button
                                onClick={fetchPendingPayments}
                                className="px-2 py-1 text-[10px] font-bold rounded bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 transition-colors"
                            >
                                🔄 Refresh
                            </button>
                        </div>
                        <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {pendingPayments.map(tx => (
                                <button
                                    key={tx.id}
                                    onClick={() => setCheckoutTx(tx)}
                                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-amber-100 hover:border-amber-300 shadow-sm transition-all cursor-pointer group text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-center">
                                            <span className="text-lg font-bold text-amber-600">P{tx.pump_id || '?'}</span>
                                            <span className="text-[9px] text-slate-500 font-mono">#{tx.id}</span>
                                        </div>
                                        <div>
                                            <div className="text-xs font-mono text-slate-800">{tx.item_name || 'Fuel'}</div>
                                            <div className="text-xs text-slate-500">{Number(tx.litres || 0).toFixed(2)}L</div>
                                            <div className="text-[9px] text-slate-400 font-mono">
                                                {new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-emerald-600 font-mono">
                                            Rp {Number(tx.total_amount || 0).toLocaleString('id-ID')}
                                        </div>
                                        <div className="text-[10px] text-amber-500 group-hover:text-amber-600">→ Checkout</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Storage Tanks */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <TankGauge />
                    <TankControlPanel />
                </div>

                {/* Packet Log */}
                {showPacketLog && <PacketLog />}

                {/* Checkout Modal — now uses PendingPayment from DB */}
                {checkoutTx && (
                    <PumpCheckoutModal
                        pump={{
                            pump_id: checkoutTx.pump_id || 0,
                            litres: Number(checkoutTx.litres || 0),
                            cost: Number(checkoutTx.total_amount || 0),
                            target_litres: null,
                            target_cost: null,
                            nozzle_off_hook: false,
                            current_state: 'COMPLETED',
                            fuel_type: checkoutTx.item_name?.replace(' (Fuel_Sim)', '') || 'Fuel',
                            price_per_litre: Number(checkoutTx.price_per_litre || 0),
                            session_id: checkoutTx.reference_id || '',
                            fault_type: null,
                        }}
                        pendingTxId={checkoutTx.id}
                        onClose={() => setCheckoutTx(null)}
                        onFinalized={() => {
                            setCheckoutTx(null);
                            fetchPendingPayments();
                        }}
                    />
                )}
            </div>
        </PumpContext.Provider>
    );
}
