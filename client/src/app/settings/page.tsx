'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/utils/api';
import { Trash2, UserPlus, Users } from 'lucide-react';

interface User {
    id: number;
    username: string;
    role: string;
}

export default function SettingsPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        fetchUsers();
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

    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="space-y-6">
                    <h1 className="text-2xl font-bold text-black">Settings</h1>

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
