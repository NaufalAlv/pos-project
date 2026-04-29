'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import api from '@/utils/api';
import { Fuel, Save, Plus, Settings2 } from 'lucide-react';

interface FuelConfig {
    id: number;
    fuel_type: string;
    price_per_litre: number;
    tank_capacity: number;
    refuel_speed: number;
    is_active: number;
}

export default function PumpControllerConfigPage() {
    const [fuelConfigs, setFuelConfigs] = useState<FuelConfig[]>([]);
    const [editingFuel, setEditingFuel] = useState<Record<number, string>>({});
    const [editingTank, setEditingTank] = useState<Record<number, { capacity: string; speed: string }>>({});
    const [newFuel, setNewFuel] = useState({ fuel_type: '', price_per_litre: '' });
    const [showAddFuel, setShowAddFuel] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchFuelConfigs = async () => {
        try {
            const res = await api.get('/fuel-config');
            setFuelConfigs(res.data);
        } catch (error) {
            console.error('Failed to fetch fuel configs', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFuelConfigs();
    }, []);

    const handleSaveFuelPrice = async (id: number) => {
        const priceStr = editingFuel[id];
        if (!priceStr) return;
        const price = Number(priceStr);
        if (isNaN(price) || price < 0) {
            alert('Invalid price');
            return;
        }
        try {
            await api.put(`/fuel-config/${id}/price`, { price_per_litre: price });
            setEditingFuel(prev => { const n = { ...prev }; delete n[id]; return n; });
            fetchFuelConfigs();
        } catch (error) {
            console.error('Failed to update fuel price', error);
            alert('Failed to update price');
        }
    };

    const handleAddFuel = async (e: React.FormEvent) => {
        e.preventDefault();
        const price = Number(newFuel.price_per_litre);
        if (!newFuel.fuel_type || isNaN(price) || price < 0) {
            alert('Invalid fuel type or price');
            return;
        }
        try {
            await api.post('/fuel-config', { fuel_type: newFuel.fuel_type, price_per_litre: price });
            setNewFuel({ fuel_type: '', price_per_litre: '' });
            setShowAddFuel(false);
            fetchFuelConfigs();
        } catch (error) {
            console.error('Failed to add fuel config', error);
            alert('Failed to add fuel type');
        }
    };

    const handleSaveTankConfig = async (id: number) => {
        const tankEdit = editingTank[id];
        if (!tankEdit) return;
        const capacity = Number(tankEdit.capacity);
        const speed = Number(tankEdit.speed);
        if (isNaN(capacity) || capacity <= 0 || isNaN(speed) || speed <= 0) {
            alert('Invalid capacity or refuel speed');
            return;
        }
        try {
            await api.put(`/fuel-config/${id}/tank`, { tank_capacity: capacity, refuel_speed: speed });
            setEditingTank(prev => { const n = { ...prev }; delete n[id]; return n; });
            fetchFuelConfigs();
        } catch (error) {
            console.error('Failed to update tank config', error);
            alert('Failed to update tank config');
        }
    };

    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-linear-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg">
                            <Settings2 className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-black">Pump Controller</h1>
                            <p className="text-sm text-slate-500">Global configuration for fuel simulation and tank assets</p>
                        </div>
                    </div>

                    {/* Fuel Configuration Card */}
                    <div className="bg-linear-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-xl shadow-sm border border-amber-200/60 overflow-hidden animate-in">
                        <div className="p-4 border-b border-amber-200/40 flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="p-2 bg-amber-100 rounded-lg mr-3">
                                    <Fuel className="h-5 w-5 text-amber-600" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-black">Fuel & Tank Assets</h2>
                                    <p className="text-xs text-slate-500">Configure physical pump constraints and market pricing</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAddFuel(!showAddFuel)}
                                className="p-2 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
                            >
                                <Plus className="h-4 w-4 text-amber-700" />
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            {showAddFuel && (
                                <form onSubmit={handleAddFuel} className="flex gap-3 p-3 bg-white/60 rounded-xl border border-amber-100 animate-in">
                                    <input
                                        type="text"
                                        placeholder="Fuel Type Name"
                                        value={newFuel.fuel_type}
                                        onChange={e => setNewFuel({ ...newFuel, fuel_type: e.target.value })}
                                        className="flex-1 px-3 py-2 text-sm border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                                        required
                                    />
                                    <input
                                        type="number"
                                        placeholder="Price/L (Rp)"
                                        value={newFuel.price_per_litre}
                                        onChange={e => setNewFuel({ ...newFuel, price_per_litre: e.target.value })}
                                        className="w-40 px-3 py-2 text-sm border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                                        required
                                        min="0"
                                    />
                                    <Button type="submit" className="bg-amber-600! hover:bg-amber-700! text-white! text-sm px-4!">Add</Button>
                                </form>
                            )}
                            
                            {loading ? (
                                <div className="p-8 text-center text-slate-400 text-sm italic">Loading configurations...</div>
                            ) : fuelConfigs.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">No fuel types configured. Click + to add one.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {fuelConfigs.map(fuel => (
                                        <div key={fuel.id} className="p-4 bg-white rounded-xl border border-amber-100 shadow-xs space-y-3 hover:border-amber-300 transition-colors">
                                            {/* Row 1: Fuel type + price */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-3 w-3 rounded-full ${fuel.is_active ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                                                    <span className="font-bold text-slate-800 text-sm">{fuel.fuel_type}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-slate-400">RP</span>
                                                    <input
                                                        type="number"
                                                        className="w-24 px-2 py-1.5 text-sm text-right font-mono border border-amber-100 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                                                        value={editingFuel[fuel.id] !== undefined ? editingFuel[fuel.id] : fuel.price_per_litre}
                                                        onChange={e => setEditingFuel({ ...editingFuel, [fuel.id]: e.target.value })}
                                                        min="0"
                                                    />
                                                    <span className="text-[10px] font-bold text-slate-400">/L</span>
                                                    {editingFuel[fuel.id] !== undefined && (
                                                        <button
                                                            onClick={() => handleSaveFuelPrice(fuel.id)}
                                                            className="p-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors shadow-sm"
                                                        >
                                                            <Save className="h-3.5 w-3.5 text-white" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Row 2: Tank capacity + refuel speed */}
                                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tank Capacity</label>
                                                    <div className="flex items-center gap-1.5">
                                                        <input
                                                            type="number"
                                                            className="w-full px-2 py-1 text-xs text-right font-mono border border-slate-100 rounded-md bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                                                            value={editingTank[fuel.id]?.capacity !== undefined ? editingTank[fuel.id].capacity : fuel.tank_capacity}
                                                            onChange={e => setEditingTank(prev => ({ ...prev, [fuel.id]: { capacity: e.target.value, speed: prev[fuel.id]?.speed ?? String(fuel.refuel_speed) } }))}
                                                            min="100"
                                                        />
                                                        <span className="text-[10px] text-slate-400 font-bold">L</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Refuel Speed</label>
                                                    <div className="flex items-center gap-1.5">
                                                        <input
                                                            type="number"
                                                            className="w-full px-2 py-1 text-xs text-right font-mono border border-slate-100 rounded-md bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                                                            value={editingTank[fuel.id]?.speed !== undefined ? editingTank[fuel.id].speed : fuel.refuel_speed}
                                                            onChange={e => setEditingTank(prev => ({ ...prev, [fuel.id]: { capacity: prev[fuel.id]?.capacity ?? String(fuel.tank_capacity), speed: e.target.value } }))}
                                                            min="1"
                                                        />
                                                        <span className="text-[10px] text-slate-400 font-bold">L/S</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {editingTank[fuel.id] && (
                                                <Button 
                                                    onClick={() => handleSaveTankConfig(fuel.id)}
                                                    className="w-full h-8 text-[10px] font-bold uppercase bg-slate-800! hover:bg-black! text-white!"
                                                >
                                                    Save Tank Settings
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
