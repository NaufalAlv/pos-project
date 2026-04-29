'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { TrendingUp, TrendingDown, DollarSign, Activity, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import api from '@/utils/api';
import { cn } from '@/utils/cn';

export default function MarginAnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [days, setDays] = useState(30);

    useEffect(() => {
        const fetchMarginData = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/analytics/margin?days=${days}`);
                setData(res.data);
            } catch (err: any) {
                setError('Failed to fetch margin analytics');
            } finally {
                setLoading(false);
            }
        };
        fetchMarginData();
    }, [days]);

    const formatRp = (val: number) => `Rp ${val.toLocaleString()}`;

    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="max-w-7xl mx-auto space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                <Activity className="h-8 w-8 text-primary" />
                                Profit Margin Analytics
                            </h1>
                            <p className="text-slate-500 mt-1">Real-time revenue vs COGS analysis.</p>
                        </div>
                        <div className="flex bg-white rounded-xl shadow-sm border border-border p-1">
                            {[7, 30, 90].map(d => (
                                <button
                                    key={d}
                                    onClick={() => setDays(d)}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                        days === d ? "bg-primary text-white shadow-premium" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                                    )}
                                >
                                    {d} Days
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
                    ) : error ? (
                        <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl">{error}</div>
                    ) : data && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <Card className="shadow-premium border-0">
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
                                                <h3 className="text-2xl font-black text-slate-800">{formatRp(data.summary.totalRevenue)}</h3>
                                            </div>
                                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><DollarSign size={20} /></div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="shadow-premium border-0">
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total COGS</p>
                                                <h3 className="text-2xl font-black text-slate-800">{formatRp(data.summary.totalCogs)}</h3>
                                            </div>
                                            <div className="p-3 bg-red-50 text-red-600 rounded-xl"><TrendingDown size={20} /></div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="shadow-premium border-0 ring-1 ring-primary/20">
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Gross Profit</p>
                                                <h3 className="text-2xl font-black text-primary">{formatRp(data.summary.totalMargin)}</h3>
                                            </div>
                                            <div className="p-3 bg-primary/10 text-primary rounded-xl"><TrendingUp size={20} /></div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className={cn("shadow-premium border-0", data.summary.averageMarginPercentage > 20 ? "bg-emerald-600 text-white" : "bg-white")}>
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", data.summary.averageMarginPercentage > 20 ? "text-emerald-200" : "text-slate-400")}>Avg Margin %</p>
                                                <h3 className="text-3xl font-black">{data.summary.averageMarginPercentage}%</h3>
                                            </div>
                                            {data.summary.averageMarginPercentage > 20 ? <ArrowUpRight size={28} className="opacity-80" /> : <ArrowDownRight size={28} className="text-slate-300" />}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Chart (Simulated with simple bars) */}
                            <Card className="shadow-premium border-0 overflow-hidden">
                                <CardHeader className="bg-slate-50/50 border-b border-border/40">
                                    <CardTitle className="text-lg">Daily Performance</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 overflow-x-auto">
                                    <div className="flex gap-4 items-end h-64 min-w-[800px] pt-8">
                                        {data.dailyData.map((d: any, i: number) => {
                                            const maxRev = Math.max(...data.dailyData.map((x: any) => x.revenue), 1);
                                            const heightRev = (d.revenue / maxRev) * 100;
                                            const heightCogs = (d.cogs / maxRev) * 100;
                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                                                    <div className="w-full relative flex justify-center h-full items-end group-hover:bg-slate-50 rounded-t-lg transition-colors">
                                                        {/* Tooltip */}
                                                        <div className="absolute bottom-full mb-2 bg-slate-800 text-white p-3 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-10 w-48 pointer-events-none flex flex-col gap-1">
                                                            <span className="text-[10px] text-slate-400 font-bold mb-1">{d.date}</span>
                                                            <div className="flex justify-between text-xs"><span className="text-emerald-400">Rev:</span> <span className="font-mono">{formatRp(d.revenue)}</span></div>
                                                            <div className="flex justify-between text-xs"><span className="text-red-400">COGS:</span> <span className="font-mono">{formatRp(d.cogs)}</span></div>
                                                            <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-700 mt-1"><span className="text-primary">Margin:</span> <span className="font-mono">{d.marginPercentage}%</span></div>
                                                        </div>
                                                        <div className="w-full max-w-[20px] bg-emerald-400/80 rounded-t-sm relative z-0" style={{ height: `${heightRev}%` }}>
                                                            <div className="absolute bottom-0 left-0 right-0 bg-red-400/80 rounded-t-sm z-10" style={{ height: `${(d.cogs / d.revenue) * 100}%` }}></div>
                                                        </div>
                                                    </div>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter truncate w-full text-center">
                                                        {new Date(d.date).getDate()}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
