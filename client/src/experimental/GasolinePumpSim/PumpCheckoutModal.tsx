'use client';

import React, { useEffect, useState } from 'react';
import { PumpStatus } from './PumpContext.tsx';
import api from '@/utils/api';

interface Customer {
    id: number;
    name: string;
    phone: string;
    plate_number?: string;
}

interface PumpCheckoutModalProps {
    pump: PumpStatus;
    pendingTxId: number;
    onClose: () => void;
    onFinalized: () => void;
}

const PAYMENT_METHODS = [
    { value: 'cash', label: '\uD83D\uDCB5 Cash', color: 'bg-emerald-600' },
    { value: 'transfer', label: '\uD83C\uDFE6 Transfer', color: 'bg-blue-600' },
    { value: 'qris', label: '\uD83D\uDCF1 QRIS', color: 'bg-purple-600' },
    { value: 'debit', label: '\uD83D\uDCB3 Debit', color: 'bg-cyan-600' },
    { value: 'cc', label: '\uD83D\uDCB3 CC', color: 'bg-orange-600' },
];

export default function PumpCheckoutModal({ pump, pendingTxId, onClose, onFinalized }: PumpCheckoutModalProps) {
    const [customers, setCustomers] = useState<Customer[]>([]);
    //    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [cashHanded, setCashHanded] = useState(0);
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'select' | 'new' | 'guest'>('guest');

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const res = await api.get('/customers');
                setCustomers(res.data);
            } catch (e) {
                console.error('Failed to fetch customers:', e);
            }
        };
        fetchCustomers();
    }, []);

    const cashChange = paymentMethod === 'cash' ? Math.max(0, cashHanded - pump.cost) : 0;

    const handleFinalize = async () => {
        if (!pendingTxId) {
            alert('No pending transaction found.');
            return;
        }
        if (!paymentMethod) {
            alert('Select a payment method');
            return;
        }

        setLoading(true);
        try {
            await api.post('/transactions/pump-finalize', {
                transaction_id: pendingTxId,
                payment_method: paymentMethod,
                customer_id: mode === 'select' ? selectedCustomerId : null,
                customer_name: mode === 'new' ? customerName : undefined,
                customer_phone: mode === 'new' ? customerPhone : undefined,
                cash_handed: paymentMethod === 'cash' ? cashHanded : 0,
                cash_change: paymentMethod === 'cash' ? cashChange : 0,
            });
            onFinalized();
        } catch (error: any) {
            console.error('Failed to finalize:', error);
            alert(error.response?.data?.message || 'Failed to finalize transaction');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-lg mx-4 rounded-2xl bg-white border border-slate-200 shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-amber-600">P{pump.pump_id}</span>
                        <div>
                            <div className="text-sm font-bold text-slate-800">Pump Checkout</div>
                            <div className="text-xs text-slate-500 font-mono">{pump.fuel_type} &bull; TX #{pendingTxId}</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">{'\u2715'}</button>
                </div>

                {/* Bill Summary */}
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-[10px] text-slate-500 uppercase font-mono">Litres</div>
                            <div className="text-xl font-bold font-mono text-emerald-600">{pump.litres.toFixed(3)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-500 uppercase font-mono">Price/L</div>
                            <div className="text-xl font-bold font-mono text-slate-800">Rp {pump.price_per_litre.toLocaleString('id-ID')}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-500 uppercase font-mono">Total</div>
                            <div className="text-xl font-bold font-mono text-amber-600">Rp {pump.cost.toLocaleString('id-ID')}</div>
                        </div>
                    </div>
                </div>

                {/* Customer Section */}
                <div className="px-6 py-4 border-b border-slate-100 space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Customer</span>
                        <div className="flex gap-1 ml-auto">
                            {(['guest', 'select', 'new'] as const).map(m => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${mode === m ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-transparent'
                                        }`}
                                >
                                    {m === 'guest' ? 'Guest' : m === 'select' ? 'Existing' : 'New'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {mode === 'select' && (
                        <select
                            // ✅ Use ?? so it works whether the state is null, undefined, or a string
                            value={selectedCustomerId ?? ''}
                            onChange={e => {
                                const val = e.target.value;
                                // ✅ Keep the value as string (or null). Never mix numbers here.
                                setSelectedCustomerId(val === '' ? null : val);
                            }}
                            className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                        >
                            <option value="">{'\u2014'} Select Customer {'\u2014'}</option>
                            {customers.map(c => (
                                <option key={c.id} value={String(c.id)}>
                                    {c.name} {c.phone ? `(${c.phone})` : ''}
                                </option>
                            ))}
                        </select>
                    )}

                    {mode === 'new' && (
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="text"
                                placeholder="Name"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                                className="bg-white border border-slate-200 text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                            />
                            <input
                                type="text"
                                placeholder="Phone"
                                value={customerPhone}
                                onChange={e => setCustomerPhone(e.target.value)}
                                className="bg-white border border-slate-200 text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                            />
                        </div>
                    )}

                    {mode === 'guest' && (
                        <div className="text-xs text-slate-600 italic">No customer {'\u2014'} transaction will be recorded as guest purchase.</div>
                    )}
                </div>

                {/* Payment Method */}
                <div className="px-6 py-4 border-b border-slate-100 space-y-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Payment Method</span>
                    <div className="grid grid-cols-5 gap-2">
                        {PAYMENT_METHODS.map(pm => (
                            <button
                                key={pm.value}
                                onClick={() => setPaymentMethod(pm.value)}
                                className={`py-2 rounded-lg text-[10px] font-bold transition-all ${paymentMethod === pm.value
                                    ? `${pm.color} text-white ring-2 ring-purple-500/20 shadow-md scale-105`
                                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                {pm.label}
                            </button>
                        ))}
                    </div>

                    {paymentMethod === 'cash' && (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div>
                                <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Cash Handed</label>
                                <input
                                    type="number"
                                    value={cashHanded || ''}
                                    onChange={e => setCashHanded(Number(e.target.value))}
                                    className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Change</label>
                                <div className="w-full bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg px-3 py-2 text-sm font-mono text-right font-bold">
                                    Rp {cashChange.toLocaleString('id-ID')}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action */}
                <div className="px-6 py-4 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-all shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleFinalize}
                        disabled={loading}
                        className="flex-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : `\u2713 Confirm Payment \u2014 Rp ${pump.cost.toLocaleString('id-ID')}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
