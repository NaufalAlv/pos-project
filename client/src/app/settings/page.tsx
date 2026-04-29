'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/utils/api';
import { Trash2, UserPlus, Users, FlaskConical, Fuel, Save, Plus, Lock, Power, KeyRound, History, ClipboardList } from 'lucide-react';

interface User {
    id: number;
    username: string;
    role: string;
    is_active: number;
}

interface FeatureFlag {
    id: number;
    key: string;
    enabled: number;
    description: string;
}

export default function SettingsPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [txCategories, setTxCategories] = useState<any[]>([]);
    const [newTxCat, setNewTxCat] = useState('');

    // Reset Password Modal State
    const [resetTarget, setResetTarget] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    // New User Form State
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: '--'
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
    const fetchTxCategories = async () => {
        try {
            const res = await api.get('/transaction-categories');
            setTxCategories(res.data);
        } catch (error) {
            console.error('Failed to fetch tx categories', error);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchFlags();
        fetchTxCategories();
    }, []);

    const handleAddUser = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        try {
            await api.post('/users', formData);
            setFormData({ username: '', password: '', role: '--' });
            fetchUsers();
            alert('User added successfully');
        } catch (error) {
            console.error('Failed to create user', error);
            alert('Failed to create user');
        }
    };

    const handleDeleteUser = async (user: User) => {
        if (user.role === 'admin') {
            alert('Admin accounts cannot be deleted from the UI. Disable the account instead, or remove it directly from the database.');
            return;
        }
        if (!confirm(`Are you sure you want to permanently delete "${user.username}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/users/${user.id}`);
            fetchUsers();
        } catch (error: any) {
            console.error('Failed to delete user', error);
            alert(error.response?.data?.message || 'Failed to delete user');
        }
    };

    const handleToggleUser = async (user: User) => {
        const action = user.is_active ? 'disable' : 'enable';
        if (!confirm(`Are you sure you want to ${action} "${user.username}"?`)) return;
        try {
            await api.patch(`/users/${user.id}/toggle`);
            fetchUsers();
        } catch (error: any) {
            console.error('Failed to toggle user', error);
            alert(error.response?.data?.message || 'Failed to toggle user status');
        }
    };

    const handleResetPassword = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (!resetTarget || !newPassword) return;
        setResetLoading(true);
        try {
            await api.post(`/users/${resetTarget.id}/reset-password`, { new_password: newPassword });
            alert(`Password for "${resetTarget.username}" has been reset successfully.`);
            setResetTarget(null);
            setNewPassword('');
        } catch (error: any) {
            console.error('Failed to reset password', error);
            alert(error.response?.data?.message || 'Failed to reset password');
        } finally {
            setResetLoading(false);
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
    const handleAddTxCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTxCat) return;
        try {
            await api.post('/transaction-categories', { name: newTxCat });
            setNewTxCat('');
            fetchTxCategories();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to add category');
        }
    };

    const handleDeleteTxCategory = async (id: number) => {
        if (!confirm('Are you sure you want to delete this category?')) return;
        try {
            await api.delete(`/transaction-categories/${id}`);
            fetchTxCategories();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to delete category');
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
                                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${isSandboxEnabled ? 'bg-purple-600' : 'bg-gray-300'
                                        }`}
                                    id="sandbox-toggle"
                                >
                                    <span
                                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${isSandboxEnabled ? 'translate-x-6' : 'translate-x-1'
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
                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${flag.enabled ? 'bg-emerald-500' : 'bg-gray-300'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${flag.enabled ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Reset Password Modal */}
                    {resetTarget && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-amber-100 rounded-xl">
                                        <KeyRound className="h-5 w-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800">Reset Password</h3>
                                        <p className="text-xs text-slate-500">For user: <span className="font-bold text-slate-700">{resetTarget.username}</span></p>
                                    </div>
                                </div>
                                <form onSubmit={handleResetPassword} className="space-y-4">
                                    <Input
                                        label="New Password"
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Minimum 6 characters"
                                    />
                                    <div className="flex gap-3 pt-2">
                                        <Button type="button" variant="outline" className="flex-1" onClick={() => { setResetTarget(null); setNewPassword(''); }}>Cancel</Button>
                                        <Button type="submit" className="flex-1 bg-amber-600! hover:bg-amber-700! text-white!" isLoading={resetLoading}>Reset</Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Transaction Categories */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center">
                                    <ClipboardList className="mr-2 h-5 w-5 text-indigo-600" />
                                    <h2 className="font-semibold text-black">Transaction Categories</h2>
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase">{txCategories.length}/10</span>
                            </div>
                            <div className="p-4 space-y-4">
                                <form onSubmit={handleAddTxCategory} className="flex gap-2">
                                    <Input
                                        placeholder="Add category (e.g. Donation)"
                                        value={newTxCat}
                                        onChange={(e) => setNewTxCat(e.target.value)}
                                        className="flex-1"
                                        disabled={txCategories.length >= 10}
                                    />
                                    <Button type="submit" size="sm" disabled={!newTxCat || txCategories.length >= 10}>
                                        <Plus size={16} />
                                    </Button>
                                </form>
                                <ul className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto pr-2">
                                    {txCategories.map(cat => (
                                        <li key={cat.id} className="py-2.5 flex justify-between items-center group">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                                                {cat.is_default === 1 && (
                                                    <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded uppercase">Default</span>
                                                )}
                                                {cat.name === 'Fuel Station' && (
                                                    <span className="text-[9px] font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded uppercase">Automated</span>
                                                )}
                                            </div>
                                            {!cat.is_default && cat.name !== 'Fuel Station' && (
                                                <button
                                                    onClick={() => handleDeleteTxCategory(cat.id)}
                                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* User List */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex items-center">
                                <Users className="mr-2 h-5 w-5 text-blue-600" />
                                <h2 className="font-semibold text-black">User Management</h2>
                            </div>
                            <div className="p-4">
                                <ul className="divide-y divide-gray-100">
                                    {loading ? <p>Loading...</p> : users.map(user => (
                                        <li key={user.id} className={`py-3 flex justify-between items-center gap-2 ${user.is_active === 0 ? 'opacity-50' : ''}`}>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-black text-sm truncate">{user.username}</p>
                                                    {user.is_active === 0 && <span className="text-[10px] font-bold bg-red-100 text-red-500 px-1.5 py-0.5 rounded-md uppercase">Disabled</span>}
                                                    {user.role === 'admin' && <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-md uppercase">Admin</span>}
                                                </div>
                                                <p className="text-xs text-slate-400 capitalize">{user.role}</p>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {/* Activity Log */}
                                                <button
                                                    title="View Activity"
                                                    onClick={() => router.push(`/admin/users/${user.id}/activity`)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <History className="h-4 w-4" />
                                                </button>
                                                {/* Reset Password */}
                                                <button
                                                    title="Reset Password"
                                                    onClick={() => setResetTarget(user)}
                                                    className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                                                >
                                                    <KeyRound className="h-4 w-4" />
                                                </button>
                                                {/* Enable/Disable Toggle */}
                                                <button
                                                    title={user.is_active ? 'Disable User' : 'Enable User'}
                                                    onClick={() => handleToggleUser(user)}
                                                    className={`p-1.5 rounded-lg transition-colors ${user.is_active
                                                        ? 'text-slate-400 hover:text-orange-500 hover:bg-orange-50'
                                                        : 'text-emerald-500 hover:bg-emerald-50'
                                                        }`}
                                                >
                                                    <Power className="h-4 w-4" />
                                                </button>
                                                {/* Delete (blocked for admins) */}
                                                {user.role === 'admin' ? (
                                                    <span title="Admin accounts cannot be deleted" className="p-1.5 text-slate-200 cursor-not-allowed">
                                                        <Lock className="h-4 w-4" />
                                                    </span>
                                                ) : (
                                                    <button
                                                        title="Delete User"
                                                        onClick={() => handleDeleteUser(user)}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
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

                    {/* System Maintenance */}
                    <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
                        <div className="p-4 border-b border-red-50 flex items-center">
                            <Trash2 className="mr-2 h-5 w-5 text-red-600" />
                            <h2 className="font-semibold text-black">System Maintenance</h2>
                        </div>
                        <div className="p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <p className="font-bold text-red-600 uppercase tracking-wider text-xs mb-1">Danger Zone</p>
                                    <h3 className="text-lg font-black text-slate-800">Purge All System Data</h3>
                                    <p className="text-sm text-slate-500 mt-1">This will permanently delete all transactions, customers, and inventory logs. This action cannot be undone.</p>
                                </div>
                                <Button
                                    variant="danger"
                                    className="bg-red-600! hover:bg-red-700! text-white! font-black rounded-xl h-14 px-8 shadow-lg shadow-red-200"
                                    onClick={async () => {
                                        if (confirm('CRITICAL WARNING: This will DELETE ALL DATA (Transactions, Customers, Logs). Are you absolutely sure?')) {
                                            if (confirm('FINAL CONFIRMATION: Are you REALLY sure? This is irreversible.')) {
                                                try {
                                                    await api.post('/system/purge');
                                                    alert('System data purged successfully. Page will reload.');
                                                    window.location.reload();
                                                } catch (error: any) {
                                                    console.error('Purge failed', error);
                                                    alert(error.response?.data?.message || 'Purge failed');
                                                }
                                            }
                                        }
                                    }}
                                >
                                    PURGE ALL DATA
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
