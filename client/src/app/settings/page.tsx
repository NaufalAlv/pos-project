'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/utils/api';
import { Trash2, UserPlus, Users, FlaskConical, Fuel, Save, Plus } from 'lucide-react';

interface User {
    id: number;
    username: string;
    role: string;
}

interface FeatureFlag {
    id: number;
    key: string;
    enabled: number;
    description: string;
}

interface FuelConfig {
    id: number;
    fuel_type: string;
    price_per_litre: number;
    tank_capacity: number;
    refuel_speed: number;
    is_active: number;
}

export default function SettingsPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [fuelConfigs, setFuelConfigs] = useState<FuelConfig[]>([]);
    const [editingFuel, setEditingFuel] = useState<Record<number, string>>({});
    const [editingTank, setEditingTank] = useState<Record<number, { capacity: string; speed: string }>>({});
    const [newFuel, setNewFuel] = useState({ fuel_type: '', price_per_litre: '' });
    const [showAddFuel, setShowAddFuel] = useState(false);

    // New User Form State
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'mechanic'
    });

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFlags = async () => {
        try {
            const res = await api.get('/feature-flags');
            setFlags(res.data);
        } catch (error) {
            console.error('Failed to fetch feature flags', error);
        }
    };

    const fetchFuelConfigs = async () => {
        try {
            const res = await api.get('/fuel-config');
            setFuelConfigs(res.data);
        } catch (error) {
            console.error('Failed to fetch fuel configs', error);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchFlags();
        fetchFuelConfigs();
    }, []);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/users', formData);
            setFormData({ username: '', password: '', role: 'mechanic' });
            fetchUsers();
            alert('User added successfully');
        } catch (error) {
            console.error('Failed to create user', error);
            alert('Failed to create user');
        }
    };

    const handleDeleteUser = async (id: number) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await api.delete(`/users/${id}`);
            fetchUsers();
        } catch (error) {
            console.error('Failed to delete user', error);
            alert('Failed to delete user');
        }
    };

    const handleToggleFlag = async (key: string, currentEnabled: number) => {
        try {
            await api.put(`/feature-flags/${key}`, { enabled: !currentEnabled });
            fetchFlags();
        } catch (error) {
            console.error('Failed to toggle feature flag', error);
            alert('Failed to toggle feature flag');
        }
    };

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

    const sandboxFlag = flags.find(f => f.key === 'sandbox_enabled');
    const isSandboxEnabled = sandboxFlag?.enabled === 1;

    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="space-y-6">
                    <h1 className="text-2xl font-bold text-black">Settings</h1>

                    {/* Workshop Labs Toggle */}
                    <div className="bg-linear-to-br from-violet-50 via-purple-50 to-indigo-50 rounded-xl shadow-sm border border-purple-200/60 overflow-hidden">
                        <div className="p-4 border-b border-purple-200/40 flex items-center">
                            <div className="p-2 bg-purple-100 rounded-lg mr-3">
                                <FlaskConical className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-black">Workshop Labs</h2>
                                <p className="text-xs text-slate-500">Experimental sandbox environment for testing modules</p>
                            </div>
                        </div>
                        <div className="p-4 space-y-4">
                            {/* Master Sandbox Toggle */}
                            <div className="flex items-center justify-between p-4 bg-white/60 rounded-xl border border-purple-100">
                                <div>
                                    <p className="font-medium text-black text-sm">Master Sandbox Toggle</p>
                                    <p className="text-xs text-slate-500">Enable/disable the entire sandbox environment</p>
                                </div>
                                <button
                                    onClick={() => sandboxFlag && handleToggleFlag('sandbox_enabled', sandboxFlag.enabled)}
                                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
                                        isSandboxEnabled ? 'bg-purple-600' : 'bg-gray-300'
                                    }`}
                                    id="sandbox-toggle"
                                >
                                    <span
                                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                                            isSandboxEnabled ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Module Flags */}
                            {flags.filter(f => f.key !== 'sandbox_enabled').map(flag => (
                                <div key={flag.id} className={`flex items-center justify-between p-4 bg-white/60 rounded-xl border border-purple-100 transition-opacity duration-300 ${!isSandboxEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <div>
                                        <p className="font-medium text-black text-sm">{flag.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                                        <p className="text-xs text-slate-500">{flag.description}</p>
                                    </div>
                                    <button
                                        onClick={() => handleToggleFlag(flag.key, flag.enabled)}
                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
                                            flag.enabled ? 'bg-emerald-500' : 'bg-gray-300'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                                                flag.enabled ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Fuel Configuration */}
                    {isSandboxEnabled && (
                        <div className="bg-linear-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-xl shadow-sm border border-amber-200/60 overflow-hidden animate-in">
                            <div className="p-4 border-b border-amber-200/40 flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="p-2 bg-amber-100 rounded-lg mr-3">
                                        <Fuel className="h-5 w-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <h2 className="font-semibold text-black">Fuel Price Configuration</h2>
                                        <p className="text-xs text-slate-500">Configure fuel types and pricing for the pump simulation</p>
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
                                {fuelConfigs.map(fuel => (
                                    <div key={fuel.id} className="p-4 bg-white/60 rounded-xl border border-amber-100 space-y-3">
                                        {/* Row 1: Fuel type + price */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-3 w-3 rounded-full ${fuel.is_active ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                                                <span className="font-medium text-black text-sm">{fuel.fuel_type}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500 mr-1">Rp</span>
                                                <input
                                                    type="number"
                                                    className="w-28 px-2 py-1.5 text-sm text-right font-mono border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                                                    value={editingFuel[fuel.id] !== undefined ? editingFuel[fuel.id] : fuel.price_per_litre}
                                                    onChange={e => setEditingFuel({ ...editingFuel, [fuel.id]: e.target.value })}
                                                    min="0"
                                                />
                                                <span className="text-xs text-slate-500">/L</span>
                                                {editingFuel[fuel.id] !== undefined && (
                                                    <button
                                                        onClick={() => handleSaveFuelPrice(fuel.id)}
                                                        className="p-1.5 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
                                                    >
                                                        <Save className="h-3.5 w-3.5 text-emerald-600" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Row 2: Tank capacity + refuel speed */}
                                        <div className="flex items-center gap-3 pt-2 border-t border-amber-100/60">
                                            <div className="flex items-center gap-1.5 flex-1">
                                                <span className="text-[10px] text-slate-400 whitespace-nowrap">Tank</span>
                                                <input
                                                    type="number"
                                                    className="w-20 px-2 py-1 text-xs text-right font-mono border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                                                    value={editingTank[fuel.id]?.capacity !== undefined ? editingTank[fuel.id].capacity : fuel.tank_capacity}
                                                    onChange={e => setEditingTank(prev => ({ ...prev, [fuel.id]: { capacity: e.target.value, speed: prev[fuel.id]?.speed ?? String(fuel.refuel_speed) } }))}
                                                    min="100"
                                                />
                                                <span className="text-[10px] text-slate-400">L</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-1">
                                                <span className="text-[10px] text-slate-400 whitespace-nowrap">Refuel</span>
                                                <input
                                                    type="number"
                                                    className="w-16 px-2 py-1 text-xs text-right font-mono border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                                                    value={editingTank[fuel.id]?.speed !== undefined ? editingTank[fuel.id].speed : fuel.refuel_speed}
                                                    onChange={e => setEditingTank(prev => ({ ...prev, [fuel.id]: { capacity: prev[fuel.id]?.capacity ?? String(fuel.tank_capacity), speed: e.target.value } }))}
                                                    min="1"
                                                />
                                                <span className="text-[10px] text-slate-400">L/s</span>
                                            </div>
                                            {editingTank[fuel.id] && (
                                                <button
                                                    onClick={() => handleSaveTankConfig(fuel.id)}
                                                    className="p-1 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
                                                >
                                                    <Save className="h-3 w-3 text-emerald-600" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* User List */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex items-center">
                                <Users className="mr-2 h-5 w-5 text-blue-600" />
                                <h2 className="font-semibold text-black">User Management</h2>
                            </div>
                            <div className="p-4">
                                <ul className="divide-y divide-gray-100">
                                    {loading ? <p>Loading...</p> : users.map(user => (
                                        <li key={user.id} className="py-3 flex justify-between items-center">
                                            <div>
                                                <p className="font-medium text-black">{user.username}</p>
                                                <p className="text-xs text-black capitalize">{user.role}</p>
                                            </div>
                                            <button onClick={() => handleDeleteUser(user.id)} className="text-red-500 hover:text-red-700">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Add User Form */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-fit">
                            <div className="p-4 border-b border-gray-100 flex items-center">
                                <UserPlus className="mr-2 h-5 w-5 text-green-600" />
                                <h2 className="font-semibold text-black">Add New User</h2>
                            </div>
                            <div className="p-4">
                                <form onSubmit={handleAddUser} className="space-y-4">
                                    <Input
                                        label="Username"
                                        required
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    />
                                    <Input
                                        label="Password"
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                    <div className="flex flex-col space-y-1">
                                        <label className="text-sm font-medium text-black">Role</label>
                                        <select
                                            className="border border-gray-300 rounded-md p-2 outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="cashier">Cashier</option>
                                            <option value="mechanic">Mechanic</option>
                                        </select>
                                    </div>
                                    <Button type="submit" className="w-full">Create User</Button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
