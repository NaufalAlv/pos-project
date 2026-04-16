'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';
import { LayoutDashboard, Package, ShoppingCart, FileText, Settings, LogOut, X, User, FlaskConical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/utils/api';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [sandboxEnabled, setSandboxEnabled] = useState(false);

    useEffect(() => {
        const checkSandbox = async () => {
            try {
                const res = await api.get('/feature-flags/sandbox_enabled');
                setSandboxEnabled(res.data.enabled === 1);
            } catch (error) {
                // Silently fail — feature flags may not exist yet
            }
        };
        checkSandbox();
        // Re-check every 5 seconds for live toggle response
        const interval = setInterval(checkSandbox, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        router.push('/login');
    };

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'POS', href: '/pos', icon: ShoppingCart },
        { name: 'Inventory', href: '/inventory', icon: Package },
        { name: 'Customers', href: '/customers', icon: User },
        { name: 'Transactions', href: '/transactions', icon: FileText },
        { name: 'Reports', href: '/reports', icon: FileText },
        { name: 'Settings', href: '/settings', icon: Settings },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            <div 
                className={cn(
                    "fixed inset-0 z-40 bg-neutral/80 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            <aside 
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col bg-white border-r border-border transition-all duration-300 ease-in-out lg:static lg:translate-x-0",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-20 items-center justify-between px-6 border-b border-border/50">
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white shadow-premium">
                            <ShoppingCart size={22} strokeWidth={2.5} />
                        </div>
                        <h1 className="text-xl font-bold font-heading text-neutral tracking-tight">POS Bengkel</h1>
                    </div>
                    <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:text-neutral">
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-4">
                    <ul className="space-y-1.5">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        onClick={onClose}
                                        className={cn(
                                            'flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 group relative overflow-hidden',
                                            isActive
                                                ? 'bg-primary text-white shadow-premium'
                                                : 'text-slate-500 hover:bg-slate-50 hover:text-neutral'
                                        )}
                                    >
                                        <Icon className={cn("mr-3 h-5 w-5 transition-colors", isActive ? "text-white" : "text-slate-400 group-hover:text-neutral")} />
                                        {item.name}
                                        {isActive && (
                                            <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-white/50" />
                                        )}
                                    </Link>
                                </li>
                            );
                        })}

                        {/* Sandbox Nav — conditionally rendered */}
                        {sandboxEnabled && (
                            <li className="pt-2 mt-2 border-t border-border/50">
                                <Link
                                    href="/sandbox"
                                    onClick={onClose}
                                    className={cn(
                                        'flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 group relative overflow-hidden',
                                        pathname === '/sandbox'
                                            ? 'bg-linear-to-r from-purple-600 to-indigo-600 text-white shadow-premium'
                                            : 'text-purple-500 hover:bg-purple-50 hover:text-purple-700'
                                    )}
                                >
                                    <FlaskConical className={cn("mr-3 h-5 w-5 transition-colors", pathname === '/sandbox' ? "text-white" : "text-purple-400 group-hover:text-purple-600")} />
                                    Sandbox
                                    {pathname !== '/sandbox' && (
                                        <span className="absolute right-3 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                    )}
                                </Link>
                            </li>
                        )}
                    </ul>
                </nav>

                <div className="mt-auto border-t border-border/50 p-6">
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center rounded-xl px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 transition-all duration-200 group"
                    >
                        <LogOut className="mr-3 h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
                        Logout
                    </button>
                </div>
            </aside>
        </>
    );
}
