'use client';

import React, { useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SmartAutocomplete } from '@/components/ui/SmartAutocomplete';
import { Merge, ArrowRight, User, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '@/utils/api';

export default function IdentityMerger() {
    const [primary, setPrimary] = useState<any>(null);
    const [secondary, setSecondary] = useState<any>(null);
    const [isMerging, setIsMerging] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleMerge = async () => {
        if (!primary || !secondary) return;
        if (primary.id === secondary.id) {
            setError('Cannot merge a profile into itself.');
            return;
        }

        if (!confirm(`Are you absolutely sure you want to merge ${secondary.title} into ${primary.title}? This will delete the secondary profile and repoint all transactions.`)) {
            return;
        }

        setIsMerging(true);
        setError('');
        
        try {
            await api.post('/customers/merge', {
                primaryUid: primary.id,
                secondaryUid: secondary.id
            });
            setSuccess(true);
            setSecondary(null);
            // Optionally clear primary or let them merge another into it
        } catch (err: any) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setIsMerging(false);
        }
    };

    const renderProfileCard = (profile: any, title: string, isPrimary: boolean) => (
        <Card className={`shadow-premium border-0 h-full ${isPrimary ? 'ring-2 ring-primary/50' : 'ring-1 ring-amber-500/50 bg-amber-50/10'}`}>
            <CardHeader className="bg-slate-50/50 border-b border-border/40 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                    <User className={isPrimary ? 'text-primary' : 'text-amber-600'} size={20} />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col items-center">
                <div className="w-full mb-6 relative z-50">
                    <SmartAutocomplete 
                        placeholder={`Search ${isPrimary ? 'Primary (Target)' : 'Secondary (Source)'} Customer...`}
                        onSelect={(res) => {
                            if (res.type !== 'customer') {
                                setError('Please select a customer, not a product.');
                                return;
                            }
                            isPrimary ? setPrimary(res) : setSecondary(res);
                            setSuccess(false);
                        }}
                    />
                </div>
                
                {profile ? (
                    <div className="w-full space-y-4">
                        <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h3 className="font-black text-xl text-neutral mb-1">{profile.title}</h3>
                            <p className="text-sm font-mono text-slate-500">{profile.subtitle}</p>
                            <div className="mt-4 inline-block px-3 py-1 bg-white border border-slate-200 rounded shadow-sm text-xs font-mono text-slate-400">
                                UID: {profile.id}
                            </div>
                        </div>
                        {isPrimary ? (
                            <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-100 font-bold">
                                <CheckCircle2 size={16} />
                                This profile will be RETAINED and inherit all data.
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 font-bold">
                                <AlertTriangle size={16} />
                                This profile will be DELETED after data is moved.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-12 text-slate-400 text-sm flex flex-col items-center">
                        <User size={48} strokeWidth={1} className="mb-4 opacity-50" />
                        No profile selected
                    </div>
                )}
            </CardContent>
        </Card>
    );

    return (
        <ProtectedRoute requireAdmin={true}>
            <DashboardLayout>
                <div className="max-w-6xl mx-auto space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                <Merge className="h-8 w-8 text-primary" />
                                Identity Merger
                            </h1>
                            <p className="text-slate-500 mt-1">Resolve duplicate CRM entries by merging a source profile into a target profile.</p>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl font-bold flex items-center gap-2">
                            <AlertTriangle size={18} /> {error}
                        </div>
                    )}
                    
                    {success && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl font-bold flex items-center gap-2">
                            <CheckCircle2 size={18} /> Identities merged successfully!
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-center">
                        {/* Secondary (Source) */}
                        <div className="h-full relative z-20">
                            {renderProfileCard(secondary, "Secondary Profile (Source)", false)}
                        </div>

                        {/* Merge Direction */}
                        <div className="flex flex-col items-center justify-center p-4">
                            <Button 
                                variant="primary" 
                                className="h-16 px-8 rounded-2xl shadow-premium font-black tracking-widest text-base group"
                                disabled={!primary || !secondary || isMerging}
                                onClick={handleMerge}
                            >
                                {isMerging ? 'MERGING...' : 'MERGE & PURGE'}
                                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>

                        {/* Primary (Target) */}
                        <div className="h-full relative z-10">
                            {renderProfileCard(primary, "Primary Profile (Target)", true)}
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
