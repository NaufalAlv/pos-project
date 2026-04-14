'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import api from '@/utils/api';
import { 
    TrendingUp, 
    ShoppingCart, 
    AlertTriangle, 
    DollarSign, 
    Clock, 
    ArrowRight,
    Users,
    Hammer
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function DashboardPage() {
    const [stats, setStats] = useState({
        totalRevenue: 0,
        dailySales: 0,
        totalOrders: 0,
        lowStockCount: 0
    });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/analytics/dashboard');
                setStats(res.data.stats);
                setRecentActivity(res.data.recentActivity);
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            }
        };
        fetchData();
    }, []);

    const statConfig = [
        {
            title: 'Total Revenue',
            value: `Rp ${stats.totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            color: 'text-primary',
            bg: 'bg-primary/10',
            description: 'Cumulative sales revenue'
        },
        {
            title: 'Daily Sales',
            value: `Rp ${stats.dailySales.toLocaleString()}`,
            icon: TrendingUp,
            color: 'text-secondary',
            bg: 'bg-secondary/10',
            description: 'Net sales today'
        },
        {
            title: 'Total Orders',
            value: stats.totalOrders.toString(),
            icon: ShoppingCart,
            color: 'text-tertiary',
            bg: 'bg-tertiary/10',
            description: 'Transactions today'
        },
        {
            title: 'Low Stock',
            value: stats.lowStockCount.toString(),
            icon: AlertTriangle,
            color: stats.lowStockCount > 0 ? 'text-red-500' : 'text-emerald-500',
            bg: stats.lowStockCount > 0 ? 'bg-red-50' : 'bg-emerald-50',
            description: 'Items requiring restock'
        }
    ];

    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-heading text-neutral">Dashboard Overview</h1>
                            <p className="text-slate-500 mt-1">Real-time workshop performance metrics.</p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <Button variant="outline" size="sm" className="bg-white">
                                <Clock className="mr-2 h-4 w-4" />
                                Today
                            </Button>
                            <Button variant="primary" size="sm">
                                <TrendingUp className="mr-2 h-4 w-4" />
                                Generate Report
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {statConfig.map((item, i) => (
                            <Card key={i} className="hover:scale-[1.02] transition-transform duration-300">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className={cn("p-3 rounded-2xl", item.bg, item.color)}>
                                            <item.icon size={24} />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Live</span>
                                    </div>
                                    <div className="mt-4">
                                        <h3 className="text-sm font-semibold text-slate-500">{item.title}</h3>
                                        <p className="text-2xl font-bold text-neutral mt-1 font-heading">{item.value}</p>
                                        <p className="text-xs text-slate-400 mt-2 flex items-center">
                                            {item.description}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        <Card className="xl:col-span-2 shadow-premium">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Recent Activity</CardTitle>
                                    <CardDescription>Latest workshop transactions and service orders</CardDescription>
                                </div>
                                <Button variant="ghost" size="sm" className="text-primary font-bold">
                                    View All <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-border/50 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                                <th className="px-4 py-4">Invoice</th>
                                                <th className="px-4 py-4">Date & Time</th>
                                                <th className="px-4 py-4">Staff</th>
                                                <th className="px-4 py-4 text-center">Qty</th>
                                                <th className="px-4 py-4 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {recentActivity.length === 0 ? (
                                                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">No recent transactions found.</td></tr>
                                            ) : (
                                                recentActivity.map((tx) => (
                                                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                                                        <td className="px-4 py-4">
                                                            <span className="font-bold text-neutral group-hover:text-primary transition-colors">{tx.invoice_number}</span>
                                                        </td>
                                                        <td className="px-4 py-4 text-slate-500">
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-neutral">
                                                                    {new Date(tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                                </span>
                                                                <span className="text-[10px] opacity-70">
                                                                    {new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-center space-x-2">
                                                                <div className="h-6 w-6 rounded-full gradient-primary flex items-center justify-center text-[10px] text-white font-bold">
                                                                    {(tx.username || 'U').charAt(0)}
                                                                </div>
                                                                <span className="font-medium text-slate-600">{tx.username || 'System'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-center text-neutral font-semibold">{tx.total_items || 0}</td>
                                                        <td className="px-4 py-4 text-right font-bold text-neutral">Rp {tx.total_amount.toLocaleString()}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-8">
                            <Card className="gradient-primary text-white border-none shadow-xl overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Users size={80} />
                                </div>
                                <CardHeader>
                                    <CardTitle className="text-white">Quick Actions</CardTitle>
                                    <CardDescription className="text-white/70">Common workshop tasks</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Button variant="glass" className="w-full justify-start text-white border-white/20 hover:bg-white/20">
                                        <ShoppingCart className="mr-3 h-5 w-5" />
                                        New Transaction
                                    </Button>
                                    <Button variant="glass" className="w-full justify-start text-white border-white/20 hover:bg-white/20">
                                        <Hammer className="mr-3 h-5 w-5" />
                                        Add Inventory
                                    </Button>
                                    <Button variant="glass" className="w-full justify-start text-white border-white/20 hover:bg-white/20">
                                        <Users className="mr-3 h-5 w-5" />
                                        Manage Staff
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>System Status</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 mr-3 animate-pulse" />
                                            <span className="text-sm font-medium text-slate-600">Database Connection</span>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-600">Online</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 mr-3 animate-pulse" />
                                            <span className="text-sm font-medium text-slate-600">Network Broadcaster</span>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-600">Broadcasting</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}

// Helper for class merging
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
