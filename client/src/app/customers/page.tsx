'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
    User,
    Phone,
    Search,
    Plus,
    Edit,
    Trash2,
    Car,
    UserPlus,
    X,
    Filter
} from 'lucide-react';
import api from '@/utils/api';
import { cn } from '@/utils/cn';

interface Customer {
    id: number;
    name: string;
    phone: string | null;
    plate_number: string | null;
    created_at: string;
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        plate_number: ''
    });

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const res = await api.get('/customers');
            setCustomers(res.data);
        } catch (error) {
            console.error('Failed to fetch customers', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (customer: Customer | null = null) => {
        if (customer) {
            setEditingCustomer(customer);
            setFormData({
                name: customer.name,
                phone: customer.phone || '',
                plate_number: customer.plate_number || ''
            });
        } else {
            setEditingCustomer(null);
            setFormData({ name: '', phone: '', plate_number: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCustomer) {
                await api.put(`/customers/${editingCustomer.id}`, formData);
            } else {
                await api.post('/customers', formData);
            }
            setIsModalOpen(false);
            fetchCustomers();
        } catch (error: any) {
            console.error('Failed to save customer', error);
            const message = error.response?.data?.message || 'Failed to save customer data';
            alert(message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this customer? This will preserve transaction history for audit but hide the customer from active lists.')) return;
        try {
            await api.delete(`/customers/${id}`);
            fetchCustomers();
        } catch (error) {
            console.error('Failed to delete customer', error);
            alert('Failed to delete customer');
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone && c.phone.includes(searchTerm)) ||
        (c.plate_number && c.plate_number.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="space-y-6">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-neutral tracking-tight flex items-center gap-3">
                                <span className="p-2 bg-primary/10 text-primary rounded-2xl">
                                    <User size={28} />
                                </span>
                                CUSTOMER BASE
                            </h1>
                            <p className="text-slate-400 font-medium mt-1">Manage workshop clients and loyalty information.</p>
                        </div>
                        <Button
                            variant="primary"
                            className="rounded-2xl h-12 px-6 shadow-premium group"
                            onClick={() => handleOpenModal()}
                        >
                            <UserPlus size={18} className="mr-2 group-hover:rotate-12 transition-transform" />
                            Add New Customer
                        </Button>
                    </div>

                    {/* Stats/Search Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-2 border-border/50 shadow-premium overflow-hidden">
                            <CardContent className="p-0">
                                <div className="flex items-center px-4 h-14 bg-slate-50/50">
                                    <Search className="text-slate-400 mr-3" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search by name, phone, or plate number..."
                                        className="flex-1 bg-transparent border-none outline-none text-sm font-bold placeholder:text-slate-400"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest hidden sm:block">Total Found:</span>
                                        <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full">{filteredCustomers.length}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-border/50 shadow-premium bg-primary text-white overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-white/20 transition-all"></div>
                            <CardContent className="p-6 relative">
                                <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">LOYALTY PROGRAM</p>
                                <h3 className="text-2xl font-black mt-1 italic">ACTIVE MEMBERS</h3>
                                <p className="text-4xl font-black mt-2">{customers.length}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Table Section */}
                    <Card className="border-border/50 shadow-premium rounded-3xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-border/50">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Info</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Contact</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Vehicle Plate</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Joined Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-20 text-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                                <p className="text-xs font-bold text-slate-400 mt-4 uppercase tracking-widest">Synchronizing Database...</p>
                                            </td>
                                        </tr>
                                    ) : filteredCustomers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-20 text-center text-slate-400">
                                                <User size={48} className="mx-auto opacity-10 mb-4" />
                                                <p className="font-bold italic">No customers found matching your criteria</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCustomers.map((customer) => (
                                            <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                                            <User size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-neutral uppercase text-sm">{customer.name.trim() || 'Anonymous'}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 italic">ID: #{customer.id.toString().padStart(4, '0')}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {customer.phone ? (
                                                        <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-[11px] font-black">
                                                            <Phone size={12} />
                                                            {customer.phone}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 text-[10px] font-bold italic">No Phone</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {customer.plate_number ? (
                                                        <span className="inline-flex items-center gap-2 bg-slate-100 text-neutral px-3 py-1.5 rounded-xl text-[11px] font-black border border-border/10">
                                                            <Car size={12} />
                                                            {customer.plate_number.toUpperCase()}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 text-[10px] font-bold italic">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <p className="text-xs font-bold text-slate-500">
                                                        {new Date(customer.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleOpenModal(customer)}
                                                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(customer.id)}
                                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* --- CUSTOMER MODAL --- */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-neutral/80 backdrop-blur-sm animate-in fade-in" onClick={() => setIsModalOpen(false)} />
                        <Card className="w-full max-w-md shadow-premium border-white/20 relative animate-in zoom-in-95 duration-200">
                            <CardHeader className="bg-slate-50/80 border-b border-border/50">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="flex items-center gap-2 text-lg font-black italic">
                                        <div className="p-2 bg-primary/10 text-primary rounded-xl">
                                            {editingCustomer ? <Edit size={18} /> : <UserPlus size={18} />}
                                        </div>
                                        {editingCustomer ? 'EDIT CUSTOMER' : 'NEW CUSTOMER'}
                                    </CardTitle>
                                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all">
                                        <X size={20} />
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name *</label>
                                        <Input
                                            placeholder="Enter customer name..."
                                            className="rounded-2xl border-slate-100 font-bold bg-slate-50/30"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/[^a-zA-Z\s]/g, '') })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                                        <div className="relative group">
                                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={16} />
                                            <Input
                                                placeholder="e.g. 08123456789"
                                                className="rounded-2xl border-slate-100 font-bold bg-slate-50/30 pl-11"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9]/g, '') })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Vehicle Plate (Optional)</label>
                                        <div className="relative group">
                                            <Car className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={16} />
                                            <Input
                                                placeholder="e.g. B 1234 ABC"
                                                className="rounded-2xl border-slate-100 font-bold bg-slate-50/30 pl-11 uppercase"
                                                value={formData.plate_number}
                                                onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <Button variant="ghost" type="button" className="flex-1 rounded-2xl font-bold" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                        <Button variant="primary" type="submit" className="flex-1 rounded-2xl shadow-lg font-black tracking-widest uppercase">
                                            {editingCustomer ? 'Update' : 'Save Customer'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </DashboardLayout>
        </ProtectedRoute>
    );
}
