'use client';

import React, { useEffect, useState, useMemo } from 'react';
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

    // Derived Summary Metrics
    const summary = useMemo(() => {
        if (!reportData || !reportData.itemBreakdown) return null;
        
        const data = reportData.itemBreakdown;
        const totalItems = data.length;
        if (totalItems === 0) return null;

        const uniqueItems = new Set(data.map(item => item.item_name)).size;
        const totalQty = data.reduce((sum, item) => sum + item.quantity, 0);
        const totalBuy = data.reduce((sum, item) => sum + (item.buy_price * item.quantity), 0);
        const totalSell = data.reduce((sum, item) => sum + (item.sell_price * item.quantity), 0);
        const totalMargin = totalSell - totalBuy;

        const avgBuy = totalBuy / totalQty;
        const avgSell = totalSell / totalQty;

        // Calculate days
        const start = new Date(filters.startDate);
        const end = new Date(filters.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        return {
            diffDays,
            totalTransactions: reportData.metrics.totalTransactions,
            uniqueItems,
            totalQty,
            totalBuy,
            totalSell,
            totalMargin,
            avgBuy,
            avgSell
        };
    }, [reportData, filters]);

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
                            <h1 className="text-3xl font-heading text-neutral">Transaction Report</h1>
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
                                <Button onClick={handleGenerate} variant="primary" disabled={loading} className="w-full md:w-auto px-8 font-bold text-lg">
                                    {loading ? 'Generating...' : 'Generate Report'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Report Output Canvas */}
                    {hasGenerated && reportData && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none print:bg-transparent report-container">
                            {/* Formal Printed Header block */}
                            <div className="p-8 border-b border-slate-100 hidden print:block bg-slate-50">
                                <h1 className="text-4xl font-black text-black uppercase tracking-tight">Transaction Report</h1>
                                <p className="text-slate-500 mt-2 font-medium">POS Workshop - System Generated Report</p>
                                <div className="mt-6 grid grid-cols-2 gap-y-2 text-sm border-t border-slate-200 pt-4">
                                    <div><span className="text-slate-400 font-bold uppercase text-[10px]">Report Period:</span> <span className="ml-2 font-bold">{filters.startDate} — {filters.endDate}</span></div>
                                    <div><span className="text-slate-400 font-bold uppercase text-[10px]">Exported On:</span> <span className="ml-2 font-bold">{new Date().toLocaleString('id-ID')}</span></div>
                                    <div><span className="text-slate-400 font-bold uppercase text-[10px]">Payment Method:</span> <span className="ml-2 font-bold uppercase">{filters.paymentMethod}</span></div>
                                    <div><span className="text-slate-400 font-bold uppercase text-[10px]">Category ID:</span> <span className="ml-2 font-bold uppercase">{filters.categoryId}</span></div>
                                </div>
                            </div>

                            {/* Dashboard Aggregate Metrics */}
                            <div className="p-6 bg-slate-50 border-b border-border/50 grid grid-cols-2 md:grid-cols-4 gap-4 print:bg-white print:border-y-2 print:border-black print:px-0">
                                <div className="p-4 bg-white rounded-xl border border-border/50 shadow-sm print:border-none print:shadow-none">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><FileText size={14}/> Transactions</p>
                                    <p className="text-2xl font-black text-neutral mt-1">{reportData.metrics.totalTransactions}</p>
                                </div>
                                <div className="p-4 bg-white rounded-xl border border-border/50 shadow-sm print:border-none print:shadow-none">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><Boxes size={14}/> Items Sold</p>
                                    <p className="text-2xl font-black text-neutral mt-1">{reportData.metrics.totalItemsSold}</p>
                                </div>
                                <div className="p-4 bg-white rounded-xl border border-border/50 shadow-sm print:border-none print:shadow-none">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><Coins size={14}/> Gross Revenue</p>
                                    <p className="text-2xl font-black text-neutral mt-1">Rp {reportData.metrics.totalRevenue.toLocaleString()}</p>
                                </div>
                                <div className="p-4 bg-white rounded-xl border border-border/50 shadow-sm print:border-none print:shadow-none">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><TrendingUp size={14}/> Net Profit</p>
                                    <p className={cn("text-2xl font-black mt-1", reportData.metrics.totalProfit > 0 ? "text-emerald-600" : "text-red-600")}>
                                        Rp {reportData.metrics.totalProfit.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Granular Table */}
                            <div className="overflow-x-auto print:mt-6 print:overflow-visible">
                                <table className="w-full text-left text-[11px] print:text-[10px] leading-tight print:table-fixed">
                                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px] tracking-wider print:bg-slate-200">
                                        <tr className="border-b border-black/10">
                                            <th className="px-4 py-3 w-[15%]">Date</th>
                                            <th className="px-4 py-3 w-[10%]">Invoice</th>
                                            <th className="px-4 py-3 w-[20%]">Item Name</th>
                                            <th className="px-4 py-3 w-[10%]">Pay</th>
                                            <th className="px-4 py-3 text-center w-[5%]">Qty</th>
                                            <th className="px-4 py-3 text-right w-[15%]">Buy Price</th>
                                            <th className="px-4 py-3 text-right w-[15%]">Sell Price</th>
                                            <th className="px-4 py-3 text-right w-[10%]">Margin</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50 text-neutral">
                                        {reportData.itemBreakdown.length === 0 ? (
                                            <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">No sales found matching these criteria.</td></tr>
                                        ) : (
                                            reportData.itemBreakdown.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 group transition-colors odd:bg-slate-50/20">
                                                    <td className="px-4 py-2 opacity-70 italic">{new Date(row.transaction_date).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short'})}</td>
                                                    <td className="px-4 py-2 font-mono font-bold">{row.invoice_number}</td>
                                                    <td className="px-4 py-2 font-semibold">
                                                        <div className="flex flex-col">
                                                            <span>{row.item_name}</span>
                                                            <span className="text-[8px] text-slate-400 uppercase">{row.category_name || '-'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 uppercase font-black text-[9px]">{row.payment_method}</td>
                                                    <td className="px-4 py-2 text-center font-black">{row.quantity}</td>
                                                    <td className="px-4 py-2 text-right text-slate-500 font-mono">Rp {row.buy_price.toLocaleString()}</td>
                                                    <td className="px-4 py-2 text-right font-black font-mono">Rp {row.sell_price.toLocaleString()}</td>
                                                    <td className={cn(
                                                        "px-4 py-2 text-right font-black font-mono",
                                                        row.margin >= 0 ? "text-emerald-700" : "text-red-700"
                                                    )}>
                                                        {row.margin < 0 && '-' }Rp {Math.abs(row.margin).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    
                                    {/* Summary Footer Row */}
                                    {summary && (
                                        <tfoot className="border-t-2 border-slate-900 bg-slate-900 text-white font-bold uppercase text-[9px]">
                                            <tr>
                                                <td className="px-4 py-3" colSpan={4}>
                                                    <div className="flex flex-col gap-1">
                                                        <span>Totals ({summary.diffDays} Days / {summary.totalTransactions} Trans)</span>
                                                        <span className="text-[7px] text-slate-400 normal-case italic">{summary.uniqueItems} unique items found</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center border-x border-slate-700 text-[11px]">
                                                    {summary.totalQty}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex flex-col">
                                                        <span>Rp {summary.totalBuy.toLocaleString()}</span>
                                                        <span className="text-[7px] text-slate-400">Avg: Rp {Math.round(summary.avgBuy).toLocaleString()}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex flex-col">
                                                        <span>Rp {summary.totalSell.toLocaleString()}</span>
                                                        <span className="text-[7px] text-slate-400">Avg: Rp {Math.round(summary.avgSell).toLocaleString()}</span>
                                                    </div>
                                                </td>
                                                <td className={cn(
                                                    "px-4 py-3 text-right text-[11px]",
                                                    summary.totalMargin >= 0 ? "text-emerald-400" : "text-red-400"
                                                )}>
                                                    Rp {summary.totalMargin.toLocaleString()}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <style jsx global>{`
                    @media print {
                        @page {
                            size: portrait;
                            margin: 10mm;
                        }
                        nav, aside, header, .print\\:hidden {
                            display: none !important;
                        }
                        body {
                            background: white !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            -webkit-print-color-adjust: exact;
                        }
                        .report-container {
                            border: 2px solid #000 !important;
                            border-radius: 0 !important;
                            transform-origin: top left;
                            width: 100% !important;
                        }
                        main {
                            padding: 0 !important;
                            margin: 0 !important;
                        }
                        table {
                            width: 100% !important;
                            border-collapse: collapse !important;
                            table-layout: fixed !important;
                        }
                        th, td {
                            word-break: break-word !important;
                        }
                        tfoot {
                            display: table-footer-group !important;
                            background-color: #000 !important;
                            color: #fff !important;
                        }
                        tfoot td {
                            border: none !important;
                        }
                    }
                `}</style>
            </DashboardLayout>
        </ProtectedRoute>
    );
};

