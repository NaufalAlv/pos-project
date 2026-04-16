'use client';

import React, { useEffect, useState, lazy, Suspense } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/utils/api';
import { FlaskConical, Fuel, Rocket, AlertTriangle, Loader2 } from 'lucide-react';

interface FeatureFlag {
    key: string;
    enabled: number;
    description: string;
}

// Lazy import the experimental module — Socket.io client only loads when launched
const GasolinePumpSim = lazy(() => import('@/experimental/GasolinePumpSim'));

interface ModuleConfig {
    key: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    gradient: string;
    borderColor: string;
    component: React.LazyExoticComponent<React.ComponentType>;
}

const MODULES: ModuleConfig[] = [
    {
        key: 'gasoline_pump_sim',
        name: 'Gasoline Pump Simulation',
        description: 'IoT Digital Twin — Simulates a real gasoline pump with state machine, telemetry, and animated HMI. Connects to a separate Pump Controller service on Port 5001.',
        icon: <Fuel className="h-6 w-6" />,
        gradient: 'from-amber-500 via-orange-500 to-red-500',
        borderColor: 'border-amber-200',
        component: GasolinePumpSim,
    }
];

export default function SandboxPage() {
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [sandboxEnabled, setSandboxEnabled] = useState(false);
    const [activeModule, setActiveModule] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFlags = async () => {
            try {
                const res = await api.get('/feature-flags');
                setFlags(res.data);
                const sandbox = res.data.find((f: FeatureFlag) => f.key === 'sandbox_enabled');
                setSandboxEnabled(sandbox?.enabled === 1);
            } catch (error) {
                console.error('Failed to fetch feature flags', error);
            } finally {
                setLoading(false);
            }
        };
        fetchFlags();
    }, []);

    const isModuleEnabled = (key: string) => {
        const flag = flags.find(f => f.key === key);
        return flag?.enabled === 1;
    };

    if (loading) {
        return (
            <ProtectedRoute>
                <DashboardLayout>
                    <div className="flex items-center justify-center h-96">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                    </div>
                </DashboardLayout>
            </ProtectedRoute>
        );
    }

    if (!sandboxEnabled) {
        return (
            <ProtectedRoute>
                <DashboardLayout>
                    <div className="flex flex-col items-center justify-center h-96 text-center">
                        <div className="p-4 bg-amber-50 rounded-2xl mb-4">
                            <AlertTriangle className="h-12 w-12 text-amber-500" />
                        </div>
                        <h2 className="text-xl font-bold text-black mb-2">Sandbox Disabled</h2>
                        <p className="text-slate-500 max-w-md">The Workshop Labs sandbox is currently disabled. Enable it from the Settings page to access experimental modules.</p>
                    </div>
                </DashboardLayout>
            </ProtectedRoute>
        );
    }

    // If a module is actively launched, render it
    if (activeModule) {
        const mod = MODULES.find(m => m.key === activeModule);
        if (mod) {
            const Component = mod.component;
            return (
                <ProtectedRoute>
                    <DashboardLayout>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setActiveModule(null)}
                                    className="px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                                >
                                    ← Back to Launchpad
                                </button>
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-sm font-medium text-slate-500">{mod.name}</span>
                                </div>
                            </div>
                            <Suspense fallback={
                                <div className="flex items-center justify-center h-96 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <div className="text-center">
                                        <Loader2 className="h-10 w-10 animate-spin text-purple-500 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500 font-medium">Loading experimental module...</p>
                                        <p className="text-xs text-slate-400 mt-1">Initializing WebSocket + HMI components</p>
                                    </div>
                                </div>
                            }>
                                <Component />
                            </Suspense>
                        </div>
                    </DashboardLayout>
                </ProtectedRoute>
            );
        }
    }

    // Launchpad view
    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-linear-to-br from-purple-600 to-indigo-600 rounded-2xl shadow-lg">
                            <FlaskConical className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-black">Workshop Labs</h1>
                            <p className="text-sm text-slate-500">Experimental modules sandbox — launch, test, and iterate</p>
                        </div>
                    </div>

                    {/* Environment Status Bar */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-purple-50/80 rounded-xl border border-purple-100">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-sm font-medium text-purple-800">Sandbox Environment Active</span>
                        <span className="text-xs text-purple-500 ml-auto font-mono">ENV: development</span>
                    </div>

                    {/* Module Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {MODULES.map(mod => {
                            const enabled = isModuleEnabled(mod.key);
                            return (
                                <div
                                    key={mod.key}
                                    className={`relative overflow-hidden rounded-2xl border ${mod.borderColor} bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${!enabled ? 'opacity-60' : ''}`}
                                >
                                    {/* Gradient Header Stripe */}
                                    <div className={`h-1.5 bg-linear-to-r ${mod.gradient}`} />

                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`p-3 rounded-xl bg-linear-to-br ${mod.gradient} text-white shadow-md`}>
                                                {mod.icon}
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {enabled ? 'ENABLED' : 'DISABLED'}
                                            </span>
                                        </div>

                                        <h3 className="text-lg font-bold text-black mb-2">{mod.name}</h3>
                                        <p className="text-sm text-slate-500 leading-relaxed mb-6">{mod.description}</p>

                                        <button
                                            onClick={() => enabled && setActiveModule(mod.key)}
                                            disabled={!enabled}
                                            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${enabled
                                                    ? `bg-linear-to-r ${mod.gradient} text-white shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]`
                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                }`}
                                        >
                                            <Rocket className="h-4 w-4" />
                                            {enabled ? 'Launch Module' : 'Enable in Settings'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
