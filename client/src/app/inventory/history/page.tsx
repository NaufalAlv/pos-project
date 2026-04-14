'use client';

import React, { useEffect, useState, useMemo } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/utils/api';
import { History, Search, Filter, Calendar as CalendarIcon, Tag, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/utils/cn';

type HistoryEntry = {
    type: 'RESTOCK' | 'SALE';
    quantity: number;
    price: number;
    created_at: string;
    invoice_number: string | null;
    product_name: string;
    sku: string;
    category_name: string | null;
};

export default function InventoryHistoryPage() {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<any[]>([]);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Sorting
    const [sortConfig, setSortConfig] = useState<{ key: keyof HistoryEntry; direction: 'asc' | 'desc' } | null>({
        key: 'created_at',
        direction: 'desc'
    });

    useEffect(() => {
        fetchHistory();
        fetchCategories();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            // In a real app, I'd pass filters to the backend. 
            // For now, let's fetch global and filter client-side for "snappiness", 
            // but the backend endpoint I built supports it too.
            const res = await api.get('/inventory/history/global');
            setHistory(res.data);
        } catch (error) {
            console.error('Failed to fetch history', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await api.get('/inventory/categories');
            setCategories(res.data);
        } catch (error) {
            console.error('Failed to fetch categories', error);
        }
    };

    // Advanced Filtering Logic
    const filteredHistory = useMemo(() => {
        return history.filter(entry => {
            const matchesSearch = searchTerm === '' || 
                entry.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (entry.sku && entry.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (entry.invoice_number && entry.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesCategory = selectedCategory === 'all' || entry.category_name === selectedCategory;
            
            const entryDate = new Date(entry.created_at).getTime();
            const matchesStart = !startDate || entryDate >= new Date(startDate).getTime();
            const matchesEnd = !endDate || entryDate <= new Date(endDate + 'T23:59:59').getTime();

            return matchesSearch && matchesCategory && matchesStart && matchesEnd;
        });
    }, [history, searchTerm, selectedCategory, startDate, endDate]);

    // Sorting Logic
    const sortedHistory = useMemo(() => {
        let sortableHistory = [...filteredHistory];
        if (sortConfig !== null) {
            sortableHistory.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                
                if (aValue === null) return 1;
                if (bValue === null) return -1;

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableHistory;
    }, [filteredHistory, sortConfig]);

    const requestSort = (key: keyof HistoryEntry) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof HistoryEntry) => {
        if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown size={14} className="ml-1 opacity-20" />;
        return sortConfig.direction === 'asc' ? 
            <ArrowUp size={14} className="ml-1 text-primary" /> : 
            <ArrowDown size={14} className="ml-1 text-primary" />;
    };

    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="space-y-6 animate-in">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-heading text-neutral">Inventory Movements</h1>
                            <p className="text-slate-500 mt-1">Global ledger of all stock additions and sales.</p>
                        </div>
                        <Button variant="outline" onClick={() => window.print()} className="print:hidden">
                            Print Ledger
                        </Button>
                    </div>

                    {/* Filter Bar */}
                    <Card className="print:hidden border-border/50 shadow-sm">
                        <CardContent className="p-4 md:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                <Input 
                                    label="Search Product / Invoice" 
                                    placeholder="Filter by name, sku, invoice..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-slate-50"
                                />
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Tag size={14}/> Category</label>
                                    <select 
                                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all outline-none text-sm text-neutral"
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                    >
                                        <option value="all">All Categories</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.name}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <Input 
                                    type="date" 
                                    label="Start Date" 
                                    value={startDate} 
                                    onChange={(e) => setStartDate(e.target.value)} 
                                    className="bg-slate-50"
                                />
                                <Input 
                                    type="date" 
                                    label="End Date" 
                                    value={endDate} 
                                    onChange={(e) => setEndDate(e.target.value)} 
                                    className="bg-slate-50"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Table */}
                    <Card className="border-border/50 shadow-sm overflow-hidden overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-border/50 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                                <tr>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('created_at')}>
                                        <div className="flex items-center">Timestamp {getSortIcon('created_at')}</div>
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('product_name')}>
                                        <div className="flex items-center">Product Name {getSortIcon('product_name')}</div>
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('type')}>
                                        <div className="flex items-center">Type {getSortIcon('type')}</div>
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => requestSort('quantity')}>
                                        <div className="flex items-center justify-center">Qty {getSortIcon('quantity')}</div>
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors text-right" onClick={() => requestSort('price')}>
                                        <div className="flex items-center justify-end">Unit Price {getSortIcon('price')}</div>
                                    </th>
                                    <th className="px-6 py-4 text-right">Reference</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30 text-neutral">
                                {loading ? (
                                    <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">Reading ledger records...</td></tr>
                                ) : sortedHistory.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">No movements match your filters.</td></tr>
                                ) : (
                                    sortedHistory.map((entry, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 text-xs whitespace-nowrap">
                                                {new Date(entry.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{entry.product_name}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono tracking-tight">{entry.sku || 'NO-SKU'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tight",
                                                    entry.type === 'RESTOCK' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-blue-50 text-blue-600 border border-blue-100"
                                                )}>
                                                    {entry.type}
                                                </span>
                                            </td>
                                            <td className={cn(
                                                "px-6 py-4 text-center font-bold",
                                                entry.quantity > 0 ? "text-emerald-600" : "text-blue-600"
                                            )}>
                                                {entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-600">
                                                Rp {entry.price.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-xs text-slate-400">
                                                {entry.invoice_number || '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </Card>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
