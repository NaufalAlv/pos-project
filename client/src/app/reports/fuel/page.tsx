'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Fuel, AlertTriangle, CalendarDays, Droplet, Loader2, ThermometerSun, Activity } from 'lucide-react';
import api from '@/utils/api';
import { cn } from '@/utils/cn';

export default function FuelCommandCenter() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTankData = async () => {
            try {
                const res = await api.get('/analytics/tank-projection');
                setData(res.data);
            } catch (err: any) {
                setError('Failed to fetch tank projections');
            } finally {
                setLoading(false);
            }
        };
        fetchTankData();
        const interval = setInterval(fetchTankData, 30000);
        return () => clearInterval(interval);
    }, []);

    const getTankColor = (percentage: number) => {
        if (percentage > 50) return 'bg-emerald-500';
        if (percentage > 20) return 'bg-amber-500';
        return 'bg-red-500 animate-pulse';
    };

    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="max-w-5xl mx-auto space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                <Fuel className="h-8 w-8 text-primary" />
                                Fuel Command Center
                            </h1>
                            <p className="text-slate-500 mt-1">Real-time tank telemetry and predictive depletion analytics.</p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Live Telemetry</span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
                    ) : error ? (
                        <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl">{error}</div>
                    ) : data && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Main Tank UI */}
                            <Card className="shadow-premium border-0 md:col-span-1 overflow-hidden relative">
                                <CardHeader className="bg-slate-50/50 border-b border-border/40 z-10 relative">
                                    <CardTitle className="flex justify-between items-center text-lg">
                                        Main Storage Tank
                                        <ThermometerSun size={20} className="text-slate-400" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 flex flex-col items-center z-10 relative min-h-[400px]">
                                    <div className="w-32 h-64 border-4 border-slate-300 rounded-b-3xl rounded-t-sm relative overflow-hidden bg-white shadow-inner mb-6">
                                        {/* Tank Fill */}
                                        <div 
                                            className={cn("absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-in-out", getTankColor(data.fillPercentage))}
                                            style={{ height: `${Math.max(0, Math.min(100, data.fillPercentage))}%` }}
                                        >
                                            <div className="absolute top-0 left-0 right-0 h-2 bg-white/20"></div>
                                        </div>
                                        
                                        {/* Markers */}
                                        <div className="absolute top-1/4 left-0 w-2 border-t-2 border-slate-400"></div>
                                        <div className="absolute top-1/2 left-0 w-4 border-t-2 border-slate-400"></div>
                                        <div className="absolute top-3/4 left-0 w-2 border-t-2 border-slate-400"></div>
                                    </div>
                                    <h2 className="text-4xl font-black text-slate-800">{data.currentLevel.toLocaleString()}<span className="text-lg text-slate-400">L</span></h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">/ {data.capacity.toLocaleString()}L Capacity</p>
                                </CardContent>
                            </Card>

                            {/* Analytics Grid */}
                            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <Card className="shadow-premium border-0">
                                    <CardContent className="p-6 flex items-start gap-4 h-full">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0"><Droplet size={24} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fill Level</p>
                                            <h3 className="text-3xl font-black text-slate-800 mb-1">{data.fillPercentage.toFixed(1)}%</h3>
                                            <p className="text-xs text-slate-500 font-medium">Of total storage capacity</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="shadow-premium border-0">
                                    <CardContent className="p-6 flex items-start gap-4 h-full">
                                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0"><Activity size={24} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Burn Rate (7d)</p>
                                            <h3 className="text-3xl font-black text-slate-800 mb-1">{data.dailyBurnRate.toLocaleString()} <span className="text-lg text-slate-400">L/day</span></h3>
                                            <p className="text-xs text-slate-500 font-medium">Based on recent transactions</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className={cn("shadow-premium border-0 sm:col-span-2", data.daysRemaining < 3 ? "bg-red-600 text-white" : "")}>
                                    <CardContent className="p-8 flex items-center justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className={cn("p-4 rounded-2xl shrink-0", data.daysRemaining < 3 ? "bg-white/20 text-white" : "bg-slate-50 text-slate-600")}><CalendarDays size={32} /></div>
                                            <div>
                                                <p className={cn("text-xs font-black uppercase tracking-widest mb-2", data.daysRemaining < 3 ? "text-red-200" : "text-slate-400")}>Estimated Depletion</p>
                                                <h3 className="text-4xl font-black mb-1">
                                                    {data.daysRemaining > 900 ? "∞" : data.daysRemaining} <span className="text-xl opacity-70">Days</span>
                                                </h3>
                                                <p className={cn("text-sm font-medium", data.daysRemaining < 3 ? "text-red-100" : "text-slate-500")}>
                                                    Projected empty on: <strong>{new Date(data.projectedEmptyDate).toLocaleDateString()}</strong>
                                                </p>
                                            </div>
                                        </div>
                                        {data.daysRemaining < 3 && (
                                            <AlertTriangle size={64} className="opacity-20 hidden md:block" />
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
