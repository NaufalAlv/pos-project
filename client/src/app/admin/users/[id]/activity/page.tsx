'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, User, Activity, Calendar, Shield, Power, LogIn, KeyRound, Trash2, Edit3 } from 'lucide-react';
import api from '@/utils/api';
import { ROLE_MAP, UserRole } from '@/utils/roles';

interface AuditEntry {
    id: string;
    table_name: string;
    record_id: string;
    action: string;
    ip_address: string | null;
    reason: string | null;
    created_at: string;
}

interface UserProfile {
    id: number;
    username: string;
    role: string;
    is_active: number;
    created_at: string;
}

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    LOGIN: { icon: <LogIn size={14} />, color: 'bg-emerald-500', label: 'Login' },
    CREATE: { icon: <User size={14} />, color: 'bg-blue-500', label: 'Created Record' },
    UPDATE: { icon: <Edit3 size={14} />, color: 'bg-amber-500', label: 'Updated Record' },
    DELETE: { icon: <Trash2 size={14} />, color: 'bg-red-500', label: 'Deleted Record' },
    USER_ENABLED: { icon: <Power size={14} />, color: 'bg-emerald-500', label: 'User Enabled' },
    USER_DISABLED: { icon: <Power size={14} />, color: 'bg-orange-500', label: 'User Disabled' },
    PASSWORD_RESET: { icon: <KeyRound size={14} />, color: 'bg-purple-500', label: 'Password Reset' },
    IDENTITY_MERGE: { icon: <Shield size={14} />, color: 'bg-indigo-500', label: 'Identity Merge' },
};

function getActionConfig(action: string) {
    // Try exact match first, then prefix match (e.g. "POST:/api/transactions" → unknown)
    if (ACTION_CONFIG[action]) return ACTION_CONFIG[action];
    const method = action.split(':')[0];
    const colors: Record<string, string> = { POST: 'bg-blue-500', PUT: 'bg-amber-500', PATCH: 'bg-amber-500', DELETE: 'bg-red-500' };
    return { icon: <Activity size={14} />, color: colors[method] || 'bg-slate-400', label: action };
}

export default function UserActivityPage() {
    const { id } = useParams();
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [activity, setActivity] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('ALL');

    useEffect(() => {
        fetchActivity();
    }, [id]);

    const fetchActivity = async () => {
        try {
            const res = await api.get(`/users/${id}/activity`);
            setProfile(res.data.user);
            setActivity(res.data.activity);
        } catch (error) {
            console.error('Failed to fetch user activity', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <ProtectedRoute requireAdmin>
                <DashboardLayout>
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </DashboardLayout>
            </ProtectedRoute>
        );
    }

    if (!profile) {
        return (
            <ProtectedRoute requireAdmin>
                <DashboardLayout>
                    <div className="p-6 text-center">
                        <h2 className="text-xl font-bold text-slate-500">User not found</h2>
                        <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
                    </div>
                </DashboardLayout>
            </ProtectedRoute>
        );
    }

    const roleConfig = ROLE_MAP[profile.role as UserRole];
    const filteredActivity = filter === 'ALL'
        ? activity
        : activity.filter(e => e.action.startsWith(filter) || e.action === filter);

    const uniqueActions = ['ALL', ...Array.from(new Set(activity.map(a => a.action.split(':')[0])))];

    return (
        <ProtectedRoute requireAdmin>
            <DashboardLayout>
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => router.back()} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
                            <ArrowLeft size={20} className="text-slate-500" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black text-neutral uppercase tracking-tight">
                                USER ACTIVITY LOG
                            </h1>
                            <p className="text-slate-400 font-bold text-sm mt-1">All recorded interactions for this account</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                        {/* Left Column: Identity Card */}
                        <div className="md:col-span-4 space-y-6">
                            <Card className="border-border/50">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <User size={16} /> User Identity
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg ${roleConfig?.colorClass || 'bg-slate-400'}`}>
                                            {profile.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-xl font-black text-neutral">{profile.username}</p>
                                            <p className="text-sm font-bold text-slate-400 capitalize">{roleConfig?.label || profile.role}</p>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-border/50 space-y-3">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Status</p>
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-lg mt-1 ${
                                                profile.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                            }`}>
                                                <Power size={12} />
                                                {profile.is_active ? 'ACTIVE' : 'DISABLED'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Created</p>
                                            <p className="font-bold text-neutral text-sm mt-0.5">
                                                {profile.created_at ? new Date(profile.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Unknown'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Logged Events</p>
                                            <p className="font-black text-2xl text-primary mt-0.5">{activity.length}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Activity Timeline */}
                        <div className="md:col-span-8">
                            <Card className="border-border/50 h-full">
                                <CardHeader className="border-b border-border/50 bg-slate-50/50 pb-4">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                        <CardTitle className="text-sm font-black text-neutral uppercase tracking-widest flex items-center gap-2">
                                            <Activity size={16} className="text-primary" /> Interaction Timeline
                                        </CardTitle>
                                        <div className="flex flex-wrap gap-2">
                                            {uniqueActions.map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => setFilter(type)}
                                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === type ? 'bg-primary text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="max-h-[600px] overflow-y-auto p-6 space-y-6">
                                        {filteredActivity.length === 0 ? (
                                            <div className="text-center py-10 opacity-50">
                                                <Activity size={48} className="mx-auto mb-3" />
                                                <p className="font-bold">No activity found</p>
                                            </div>
                                        ) : (
                                            <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
                                                {filteredActivity.map((entry) => {
                                                    const cfg = getActionConfig(entry.action);
                                                    return (
                                                        <div key={entry.id} className="relative pl-6 group">
                                                            <div className={`absolute -left-[11px] top-0.5 h-5 w-5 rounded-full border-4 border-white ${cfg.color} flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-125`}>
                                                                {cfg.icon}
                                                            </div>
                                                            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 hover:shadow-md transition-shadow">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div>
                                                                        <span className="font-black text-neutral uppercase text-sm">{cfg.label}</span>
                                                                        <p className="text-xs text-slate-400 font-mono mt-0.5">{entry.table_name} / {entry.record_id?.substring(0, 12)}</p>
                                                                    </div>
                                                                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1 shrink-0">
                                                                        <Calendar size={12} />
                                                                        {new Date(entry.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                                {entry.reason && (
                                                                    <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">{entry.reason}</p>
                                                                )}
                                                                {entry.ip_address && (
                                                                    <p className="text-[10px] text-slate-400 font-mono mt-2">IP: {entry.ip_address}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
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
