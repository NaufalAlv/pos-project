'use client';

import React, { useEffect, useState, useMemo } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/utils/api';
import {
    Search,
    Filter,
    Calendar as CalendarIcon,
    Eye,
    Trash2,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Clock,
    User,
    CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import { Receipt } from '@/components/pos/Receipt';

interface Transaction {
    id: number;
    invoice_number: string;
    created_at: string;
    username: string;
    customer_name: string | null;
    customer_phone: string | null;
    total_amount: number;
    payment_method: string;
    total_items: number;
    is_deleted?: boolean;
    cash_handed?: number;
    cash_change?: number;
    adjustment_amount?: number;
    payment_status?: string;
    category?: string;
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    // Receipt Preview
    const [selectedTx, setSelectedTx] = useState<any | null>(null);
    const [isReceiptLoading, setIsReceiptLoading] = useState(false);

    // Delete Confirmation
    const [voidingId, setVoidingId] = useState<number | null>(null);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const res = await api.get('/transactions');
            setTransactions(res.data);
        } catch (error) {
            console.error('Failed to fetch transactions', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewReceipt = async (id: number) => {
        setIsReceiptLoading(true);
        try {
            const res = await api.get(`/transactions/${id}`);
            setSelectedTx(res.data);
        } catch (error) {
            console.error('Failed to fetch transaction details', error);
            alert('Failed to load receipt details');
        } finally {
            setIsReceiptLoading(false);
        }
    };

    const handleVoidTransaction = async () => {
        if (!voidingId) return;
        try {
            await api.delete(`/transactions/${voidingId}`);
            setTransactions(prev => prev.filter(t => t.id !== voidingId));
            setVoidingId(null);
            alert('Transaction voided successfully. Stock has been restored.');
        } catch (error) {
            console.error('Failed to void transaction', error);
            alert('Failed to void transaction');
        }
    };

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const matchesSearch =
                tx.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
                (tx.customer_name && tx.customer_name.toLowerCase().includes(search.toLowerCase())) ||
                (tx.category && tx.category.toLowerCase().includes(search.toLowerCase()));

            const matchesDate = !dateFilter || tx.created_at.startsWith(dateFilter);

            return matchesSearch && matchesDate;
        });
    }, [transactions, search, dateFilter]);

    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="space-y-6 animate-in">

                    {/* Page Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-heading text-neutral">Transaction History</h1>
                            <p className="text-slate-500 mt-1">Review finalized sales and reprint receipts.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={fetchTransactions} disabled={loading}>
                                <Clock className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                                Refresh
                            </Button>
                        </div>
                    </div>

                    {/* Filter Panel */}
                    <Card className="border-border/50 shadow-sm">
                        <CardContent className="p-4 md:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Search size={14} /> Search</label>
                                    <Input
                                        placeholder="Invoice # or Customer name..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="bg-slate-50"
                                    />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><CalendarIcon size={14} /> Date Filter</label>
                                    <Input
                                        type="date"
                                        value={dateFilter}
                                        onChange={(e) => setDateFilter(e.target.value)}
                                        className="bg-slate-50"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <Button variant="outline" className="w-full" onClick={() => { setSearch(''); setDateFilter(''); }}>
                                        Reset Filters
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Transaction List */}
                    <Card className="border-border/50 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-100/50 border-b border-border/50 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">Invoice</th>
                                        <th className="px-6 py-4">Date & Time</th>
                                        <th className="px-6 py-4">Customer</th>
                                        <th className="px-6 py-4">Staff</th>
                                        <th className="px-6 py-4">Category</th>
                                        <th className="px-6 py-4 text-center">Items</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-right">Amount</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30 text-neutral">
                                    {loading ? (
                                        <tr><td colSpan={7} className="px-6 py-20 text-center text-slate-400 italic">Fetching transactions...</td></tr>
                                    ) : filteredTransactions.length === 0 ? (
                                        <tr><td colSpan={7} className="px-6 py-20 text-center text-slate-400 italic">No transactions found.</td></tr>
                                    ) : (
                                        filteredTransactions.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className="font-mono font-bold text-neutral">{tx.invoice_number}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">
                                                            {new Date(tx.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">
                                                            {new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-neutral uppercase truncate max-w-[150px]">{tx.customer_name || 'Walk-in'}</span>
                                                        <span className="text-[10px] text-slate-400">{tx.customer_phone || '-'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 italic text-slate-600">{tx.username}</td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                        {tx.category || 'General'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold">{tx.total_items}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={cn(
                                                        "text-[9px] font-black px-2 py-0.5 rounded-full border",
                                                        tx.payment_status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                            tx.payment_status === 'CANCELLED' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                'bg-amber-50 text-amber-600 border-amber-100'
                                                    )}>
                                                        {tx.payment_status || 'PAID'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-black text-neutral">Rp {tx.total_amount.toLocaleString()}</span>
                                                        <div className="flex items-center gap-1">
                                                            {tx.adjustment_amount && tx.adjustment_amount !== 0 ? (
                                                                <span className="text-[9px] text-slate-400 italic">
                                                                    Adj: {tx.adjustment_amount > 0 ? '+' : ''}{tx.adjustment_amount}
                                                                </span>
                                                            ) : null}
                                                            <span className="text-[9px] uppercase font-bold text-primary tracking-widest">{tx.payment_method}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-neutral hover:text-primary transition-colors"
                                                            onClick={() => handleViewReceipt(tx.id)}
                                                        >
                                                            <Eye size={16} />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                            onClick={() => setVoidingId(tx.id)}
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
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

                {/* Receipt Preview Modal */}
                {selectedTx && (
                    <Receipt
                        transaction={selectedTx}
                        onClose={() => setSelectedTx(null)}
                    />
                )}

                {/* Void Confirmation Modal */}
                {voidingId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral/80 backdrop-blur-sm p-4 animate-in">
                        <Card className="w-full max-w-sm shadow-2xl border-white/20">
                            <CardHeader className="text-center pb-2">
                                <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
                                    <Trash2 size={24} />
                                </div>
                                <CardTitle className="text-xl">Void Transaction?</CardTitle>
                                <CardDescription>
                                    This will delete the invoice and restore the item quantities to your inventory. This action cannot be undone.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 flex flex-col gap-3">
                                <Button variant="primary" className="bg-red-600 hover:bg-red-700 border-none" onClick={handleVoidTransaction}>
                                    Yes, Void Transaction
                                </Button>
                                <Button variant="outline" onClick={() => setVoidingId(null)}>
                                    Cancel
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </DashboardLayout>
        </ProtectedRoute>
    );
}
