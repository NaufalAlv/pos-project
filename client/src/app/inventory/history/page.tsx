'use client';

import React, { useEffect, useState, useMemo } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/utils/api';
import { History, Search, Filter, Calendar as CalendarIcon, Tag, ArrowUpDown, ArrowUp, ArrowDown, Package, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/utils/cn';

type HistoryEntry = {
    type: 'RESTOCK' | 'SALE' | 'NEW ITEM';
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

    const stats = useMemo(() => {
        return filteredHistory.reduce((acc, entry) => {
            const val = Math.abs(entry.quantity) * entry.price;
            if (entry.type === 'SALE') {
                acc.totalSoldUnits += Math.abs(entry.quantity);
                acc.totalSellValue += val;
            } else if (entry.type === 'RESTOCK') {
                acc.totalAddedUnits += entry.quantity;
                acc.totalBuyValue += val;
            } else if (entry.type === 'NEW ITEM') {
                acc.newItemsCount += 1;
                acc.totalBuyValue += val;
            }
            return acc;
        }, {
            totalSoldUnits: 0,
            totalAddedUnits: 0,
            newItemsCount: 0,
            totalBuyValue: 0,
            totalSellValue: 0
        });
    }, [filteredHistory]);

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
                    <div className="flex justify-between items-end px-2">
                        <div>
                            <h1 className="text-4xl font-black text-neutral tracking-tighter italic lg:text-5xl">LEDGER</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Audit Trail & Growth Insights</p>
                        </div>
                        <div className="flex gap-2 print:hidden mb-1">
                            <Button variant="outline" className="rounded-2xl border-slate-200 font-bold px-6 h-11" onClick={() => window.print()}>
                                Print Audit
                            </Button>
                        </div>
                    </div>

                    {/* Inventory Stats Dash */}
                    {!loading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                            <Card className="border-border/50 shadow-sm bg-blue-50/30 overflow-hidden relative group transition-all hover:shadow-md">
                                <div className="absolute -right-4 -top-4 text-blue-100 group-hover:scale-110 transition-transform"><ShoppingCart size={80} /></div>
                                <CardContent className="p-5 flex flex-col justify-between h-full relative">
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest opacity-60">Revenue Generation</p>
                                    <h3 className="text-2xl font-black text-neutral mt-1">Rp {Math.abs(stats.totalSellValue).toLocaleString()}</h3>
                                    <p className="text-xs font-bold text-slate-400 mt-2 uppercase flex items-center gap-1">
                                        <ArrowUp size={12} className="text-emerald-500" /> {stats.totalSoldUnits} Units Sold
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-border/50 shadow-sm bg-emerald-50/30 overflow-hidden relative group transition-all hover:shadow-md">
                                <div className="absolute -right-4 -top-4 text-emerald-100 group-hover:scale-110 transition-transform"><Package size={80} /></div>
                                <CardContent className="p-5 flex flex-col justify-between h-full relative">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest opacity-60">Stock Replenishment</p>
                                    <h3 className="text-2xl font-black text-neutral mt-1">{stats.totalAddedUnits}</h3>
                                    <p className="text-xs font-bold text-slate-400 mt-2 uppercase flex items-center gap-1">
                                        <ArrowDown size={12} className="text-red-400" /> Rp {stats.totalBuyValue.toLocaleString()} Invested
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-border/50 shadow-sm bg-indigo-50/30 overflow-hidden relative group transition-all hover:shadow-md">
                                <div className="absolute -right-4 -top-4 text-indigo-100 group-hover:scale-110 transition-transform"><Tag size={80} /></div>
                                <CardContent className="p-5 flex flex-col justify-between h-full relative">
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest opacity-60">Catalog Growth</p>
                                    <h3 className="text-2xl font-black text-neutral mt-1">{stats.newItemsCount} Items</h3>
                                    <p className="text-xs font-bold text-slate-400 mt-2 uppercase">Initialized this period</p>
                                </CardContent>
                            </Card>

                            <Card className="border-border/50 shadow-sm bg-neutral overflow-hidden relative group transition-all hover:shadow-md">
                                <div className="absolute -right-4 -top-4 text-white/5 group-hover:scale-110 transition-transform"><History size={80} /></div>
                                <CardContent className="p-5 flex flex-col justify-between h-full relative">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Net Monetary Effect</p>
                                    <h3 className="text-2xl font-black text-white mt-1">
                                        {stats.totalSellValue - stats.totalBuyValue >= 0 ? '+' : ''}
                                        Rp {(stats.totalSellValue - stats.totalBuyValue).toLocaleString()}
                                    </h3>
                                    <p className="text-xs font-bold text-white/30 mt-2 uppercase">Sales vs Acquisitions</p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

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
                    <Card className="border-border/50 shadow-sm overflow-hidden overflow-x-auto print:border-none print:shadow-none">
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
                                        <div className="flex items-center justify-end">Transaction Value {getSortIcon('price')}</div>
                                    </th>
                                    <th className="px-6 py-4 text-right">Reference</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30 text-neutral">
                                {loading ? (
                                    <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">Reading ledger records...</td></tr>
                                ) : sortedHistory.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">No transactions match your filters.</td></tr>
                                ) : (
                                    sortedHistory.map((entry, idx) => {
                                        const isInflow = entry.type === 'NEW ITEM' || entry.type === 'RESTOCK';
                                        return (
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
                                                        "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tight whitespace-nowrap",
                                                        entry.type === 'NEW ITEM' ? "bg-indigo-50 text-indigo-600 border border-indigo-100" :
                                                        entry.type === 'RESTOCK' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
                                                        "bg-blue-50 text-blue-600 border border-blue-100"
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
                                                <td className={cn(
                                                    "px-6 py-4 text-right font-bold whitespace-nowrap",
                                                    isInflow ? "text-red-500" : "text-emerald-600"
                                                )}>
                                                    {isInflow ? '-' : '+'}Rp {(Math.abs(entry.quantity) * entry.price).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-xs text-slate-400">
                                                    {entry.invoice_number || '-'}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </Card>
                </div>

                <style jsx global>{`
                    @media print {
                        nav, aside, header, .print\\:hidden {
                            display: none !important;
                        }
                        body {
                            background: white !important;
                            padding: 0 !important;
                            margin: 0 !important;
                        }
                        .animate-in {
                            animation: none !important;
                        }
                        main {
                            padding: 0 !important;
                            margin: 0 !important;
                        }
                        .Card {
                            border: none !important;
                            box-shadow: none !important;
                        }
                        table {
                            width: 100% !important;
                            border-collapse: collapse !important;
                        }
                        th, td {
                            border-bottom: 1px solid #eee !important;
                        }
                    }
                `}</style>
            </DashboardLayout>
        </ProtectedRoute>
    );
}

