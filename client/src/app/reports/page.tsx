'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/utils/api';
import { FileText, Download, Filter, Calendar as CalendarIcon, CreditCard, Tag, TrendingUp, Boxes, Coins } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/utils/cn';

export default function ReportsPage() {
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    
    // Filters
    const [datePreset, setDatePreset] = useState('today');
    const [filters, setFilters] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'all',
        categoryId: 'all'
    });

    // Report Results
    const [reportData, setReportData] = useState<{
        metrics: any,
        itemBreakdown: any[]
    } | null>(null);

    const [hasGenerated, setHasGenerated] = useState(false);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await api.get('/inventory/categories');
                setCategories(res.data);
            } catch (error) {
                console.error('Failed to fetch categories', error);
            }
        };
        fetchCategories();
    }, []);

    const handleDatePresetChange = (preset: string) => {
        setDatePreset(preset);
        const today = new Date();
        let start = new Date();
        let end = new Date();

        switch (preset) {
            case 'today':
                break;
            case 'yesterday':
                start.setDate(today.getDate() - 1);
                end.setDate(today.getDate() - 1);
                break;
            case 'this_week':
                start.setDate(today.getDate() - today.getDay());
                break;
            case 'this_month':
                start.setDate(1);
                break;
            case 'custom':
                return; // don't auto-set, let user pick
        }

        setFilters({
            ...filters,
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        });
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            // Build query params
            const params = new URLSearchParams();
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
            if (filters.categoryId) params.append('categoryId', filters.categoryId);

            const res = await api.get(`/reports/custom?${params.toString()}`);
            setReportData(res.data);
            setHasGenerated(true);
        } catch (error) {
            console.error('Failed to generate report', error);
            alert('Failed to generate report');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="space-y-6 animate-in">
                    
                    {/* Page Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
                        <div>
                            <h1 className="text-3xl font-heading text-neutral">Generated Reports</h1>
                            <p className="text-slate-500 mt-1">Configure filters to generate custom analytical data.</p>
                        </div>
                        {hasGenerated && (
                            <Button variant="outline" onClick={handlePrint}>
                                <Download className="mr-2 h-4 w-4" />
                                Export / Print Report
                            </Button>
                        )}
                    </div>

                    {/* Filter Control Panel */}
                    <Card className="print:hidden border-border/50 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-6 border-b border-border/50 pb-4">
                                <Filter className="h-5 w-5 text-primary" />
                                <h3 className="font-bold text-neutral">Report Configuration</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Date Range */}
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><CalendarIcon size={14}/> Date Range</label>
                                    <select 
                                        className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all outline-none text-sm text-neutral"
                                        value={datePreset}
                                        onChange={(e) => handleDatePresetChange(e.target.value)}
                                    >
                                        <option value="today">Today</option>
                                        <option value="yesterday">Yesterday</option>
                                        <option value="this_week">This Week</option>
                                        <option value="this_month">This Month</option>
                                        <option value="custom">Custom Range</option>
                                    </select>
                                </div>

                                {datePreset === 'custom' && (
                                    <>
                                        <Input type="date" label="Start Date" value={filters.startDate} onChange={(e) => setFilters({...filters, startDate: e.target.value})} />
                                        <Input type="date" label="End Date" value={filters.endDate} onChange={(e) => setFilters({...filters, endDate: e.target.value})} />
                                    </>
                                )}

                                {/* Payment Method Filter */}
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><CreditCard size={14}/> Payment Method</label>
                                    <select 
                                        className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all outline-none text-sm text-neutral"
                                        value={filters.paymentMethod}
                                        onChange={(e) => setFilters({...filters, paymentMethod: e.target.value})}
                                    >
                                        <option value="all">All Methods</option>
                                        <option value="cash">Cash</option>
                                        <option value="transfer">Bank Transfer</option>
                                        <option value="qris">QRIS</option>
                                        <option value="debit">Debit Card</option>
                                        <option value="cc">Credit Card</option>
                                    </select>
                                </div>

                                {/* Category Filter */}
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Tag size={14}/> Product Category</label>
                                    <select 
                                        className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all outline-none text-sm text-neutral"
                                        value={filters.categoryId}
                                        onChange={(e) => setFilters({...filters, categoryId: e.target.value})}
                                    >
                                        <option value="all">All Categories</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end">
                                <Button onClick={handleGenerate} variant="primary" disabled={loading} className="w-full md:w-auto px-8 font-bold">
                                    {loading ? 'Generating...' : 'Generate Report'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Report Output Canvas */}
                    {hasGenerated && reportData && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none print:bg-transparent">
                            {/* Formal Printed Header block */}
                            <div className="p-8 border-b border-slate-100 hidden print:block">
                                <h1 className="text-3xl font-black text-black">CUSTOM ANALYTICAL REPORT</h1>
                                <p className="text-slate-500 mt-2">Generated on: {new Date().toLocaleString()}</p>
                                <div className="mt-6 flex gap-6 text-sm">
                                    <div><span className="font-bold">Period:</span> {filters.startDate} to {filters.endDate}</div>
                                    <div><span className="font-bold">Payment:</span> {filters.paymentMethod.toUpperCase()}</div>
                                    <div><span className="font-bold">Category ID:</span> {filters.categoryId.toUpperCase()}</div>
                                </div>
                            </div>

                            {/* Dashboard Aggregate Metrics */}
                            <div className="p-6 bg-slate-50 border-b border-border/50 grid grid-cols-2 md:grid-cols-4 gap-4 print:bg-white print:border-y-2 print:border-black print:px-0">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><FileText size={14}/> Transactions</p>
                                    <p className="text-2xl font-black text-neutral mt-1">{reportData.metrics.totalTransactions}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><Boxes size={14}/> Items Sold</p>
                                    <p className="text-2xl font-black text-neutral mt-1">{reportData.metrics.totalItemsSold}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><Coins size={14}/> Gross Revenue</p>
                                    <p className="text-2xl font-black text-neutral mt-1">Rp {reportData.metrics.totalRevenue.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><TrendingUp size={14}/> Net Profit</p>
                                    <p className={cn("text-2xl font-black mt-1", reportData.metrics.totalProfit > 0 ? "text-emerald-600" : "text-neutral")}>
                                        Rp {reportData.metrics.totalProfit.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Granular Table */}
                            <div className="overflow-x-auto print:mt-6">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-widest print:bg-slate-200">
                                        <tr>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Invoice</th>
                                            <th className="px-6 py-4">Item Name</th>
                                            <th className="px-6 py-4">Category</th>
                                            <th className="px-6 py-4">Pay</th>
                                            <th className="px-6 py-4 text-center">Qty</th>
                                            <th className="px-6 py-4 text-right">Buy Price</th>
                                            <th className="px-6 py-4 text-right">Sell Price</th>
                                            <th className="px-6 py-4 text-right">Margin</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50 text-neutral">
                                        {reportData.itemBreakdown.length === 0 ? (
                                            <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-400 italic">No sales found matching these criteria.</td></tr>
                                        ) : (
                                            reportData.itemBreakdown.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 group transition-colors">
                                                    <td className="px-6 py-3 text-xs">{new Date(row.transaction_date).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short'})}</td>
                                                    <td className="px-6 py-3 font-mono text-xs">{row.invoice_number}</td>
                                                    <td className="px-6 py-3 font-semibold">{row.item_name}</td>
                                                    <td className="px-6 py-3 text-xs"><span className="px-2 py-0.5 bg-slate-100 rounded-md font-bold uppercase">{row.category_name || '-'}</span></td>
                                                    <td className="px-6 py-3 text-xs uppercase tracking-wider font-bold">{row.payment_method}</td>
                                                    <td className="px-6 py-3 text-center font-bold">{row.quantity}</td>
                                                    <td className="px-6 py-3 text-right text-slate-500">Rp {row.buy_price.toLocaleString()}</td>
                                                    <td className="px-6 py-3 text-right font-bold">Rp {row.sell_price.toLocaleString()}</td>
                                                    <td className="px-6 py-3 text-right font-bold text-emerald-600">Rp {row.margin.toLocaleString()}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
};
