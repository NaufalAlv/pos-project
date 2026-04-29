'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Menu, Bell, Search, Clock, LogOut, Settings, FileText, Users, Package, ChevronDown, Receipt } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/utils/cn';
import { ROLE_MAP, UserRole } from '@/utils/roles';
import { useSearchStore } from '@/store/useSearchStore';

interface NavbarProps {
    onMenuClick?: () => void;
}

// Static navigation items for instant local filtering
const NAV_ITEMS = [
    { name: 'Dashboard', url: '/dashboard', type: 'page' },
    { name: 'POS — Sales', url: '/pos', type: 'page' },
    { name: 'Inventory Management', url: '/inventory', type: 'page' },
    { name: 'CRM — Customers', url: '/customers', type: 'page' },
    { name: 'Reports', url: '/reports', type: 'page' },
    { name: 'Settings', url: '/settings', type: 'page' },
    { name: 'Sandbox — IoT', url: '/sandbox', type: 'page' },
    { name: 'Audit Logs', url: '/admin/audit', type: 'page' },
];

type SearchEntry = { type: string; id: string | number; title: string; subtitle: string; url: string };

const RESULT_ICON: Record<string, React.ReactNode> = {
    page:        <Settings size={14} className="text-slate-400" />,
    customer:    <Users size={14} className="text-blue-500" />,
    product:     <Package size={14} className="text-emerald-500" />,
    transaction: <Receipt size={14} className="text-purple-500" />,
};

export default function Navbar({ onMenuClick }: NavbarProps) {
    const router = useRouter();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [userData, setUserData] = useState<{ name: string; role: UserRole | null; id: string | null }>({
        name: '', role: null, id: null,
    });

    // Profile dropdown
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    // Search state — remote via Zustand store + local nav items
    const [searchQuery, setSearchQuery] = useState('');
    const [localHits, setLocalHits] = useState<SearchEntry[]>([]);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { results: remoteResults, performSearch, clear, isLoading: isSearching } = useSearchStore();

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        setUserData({
            name: localStorage.getItem('username') || 'Staff',
            role: localStorage.getItem('role') as UserRole || null,
            id: localStorage.getItem('userId') || null,
        });

        const handleClickOutside = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setIsProfileOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            clearInterval(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Hybrid search: instant local + debounced remote
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setSearchQuery(q);
        setShowResults(true);

        // 1. Instant local filter
        setLocalHits(
            q.length >= 1
                ? NAV_ITEMS
                    .filter(item => item.name.toLowerCase().includes(q.toLowerCase()))
                    .map(item => ({ type: item.type, id: item.url, title: item.name, subtitle: 'Page', url: item.url }))
                : []
        );

        // 2. Debounced remote
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (q.length >= 2) {
            debounceRef.current = setTimeout(() => performSearch(q), 300);
        } else {
            clear();
        }
    }, [performSearch, clear]);

    const handleResultClick = (url: string) => {
        router.push(url);
        setSearchQuery('');
        setShowResults(false);
        clear();
    };

    const handleLogout = () => {
        localStorage.clear();
        router.push('/login');
    };

    const roleConfig = userData.role ? ROLE_MAP[userData.role] : null;
    const initial = userData.name ? userData.name.charAt(0).toUpperCase() : '?';

    // Merge local + remote, deduplicate by url/id
    const remoteEntries: SearchEntry[] = remoteResults.map(r => ({
        type: r.type,
        id: r.id,
        title: r.title,
        subtitle: r.subtitle,
        url: r.type === 'customer' ? `/crm/${r.id}` : r.type === 'product' ? `/inventory` : `/transactions/${r.id}`,
    }));
    const allResults = [...localHits, ...remoteEntries];
    const showDropdown = showResults && searchQuery.length >= 1 && allResults.length > 0;

    return (
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between px-6 glass border-b border-border/50">

            {/* LEFT: Hamburger + Search */}
            <div className="flex items-center space-x-4 flex-1">
                <button
                    onClick={onMenuClick}
                    className="p-2 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors lg:hidden"
                >
                    <Menu size={24} />
                </button>

                {/* Search Box */}
                <div className="relative hidden md:block" ref={searchRef}>
                    <div className={cn(
                        "flex items-center px-4 py-2 bg-slate-100 rounded-xl border transition-all duration-200 w-80",
                        showDropdown ? "border-primary/30 bg-white shadow-sm" : "border-transparent"
                    )}>
                        <Search size={18} className={cn("mr-2 transition-colors", isSearching ? "text-primary animate-pulse" : "text-slate-400")} />
                        <input
                            type="text"
                            placeholder="Search anything… (Ctrl + K)"
                            className="bg-transparent border-none outline-none text-sm text-neutral w-full placeholder:text-slate-400"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onFocus={() => searchQuery && setShowResults(true)}
                        />
                        {searchQuery && (
                            <button onClick={() => { setSearchQuery(''); clear(); setShowResults(false); }} className="text-slate-300 hover:text-slate-500 transition-colors">
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Results Dropdown */}
                    {showDropdown && (
                        <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-2xl shadow-2xl border border-border/50 py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                            {localHits.length > 0 && (
                                <>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 pt-1 pb-1">Pages</p>
                                    {localHits.map((r, i) => (
                                        <button key={`page-${i}`} onClick={() => handleResultClick(r.url)}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                                            {RESULT_ICON.page}
                                            <span className="text-sm font-medium text-neutral">{r.title}</span>
                                        </button>
                                    ))}
                                </>
                            )}
                            {remoteEntries.length > 0 && (
                                <>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 pt-2 pb-1 border-t border-border/50 mt-1">Database</p>
                                    {remoteEntries.map((r, i) => (
                                        <button key={`remote-${i}`} onClick={() => handleResultClick(r.url)}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                                            {RESULT_ICON[r.type] ?? RESULT_ICON.page}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-neutral truncate">{r.title}</p>
                                                <p className="text-[11px] text-slate-400 truncate">{r.subtitle}</p>
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md shrink-0">{r.type}</span>
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: Clock + Notifications + Profile */}
            <div className="flex items-center space-x-4 lg:space-x-6">

                {/* System Clock */}
                <div className="hidden lg:flex items-center space-x-3 px-4 py-1.5 border-r border-border pr-6">
                    <div className="p-2 bg-primary/5 rounded-lg text-primary">
                        <Clock size={18} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">System Time</span>
                        <span className="text-sm font-bold text-neutral font-mono leading-none">
                            {`${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}-${String(currentTime.getDate()).padStart(2, '0')} ${currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
                        </span>
                    </div>
                </div>

                {/* Notification Bell (IoT future hook) */}
                <div className="relative group">
                    <button className="relative p-2 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
                        <Bell size={20} />
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border-2 border-white animate-pulse" />
                    </button>
                    <div className="hidden group-hover:flex absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-border/50 p-4 flex-col items-center gap-2 z-40">
                        <Bell size={24} className="text-slate-300" />
                        <p className="text-xs font-bold text-slate-500 text-center">No new alerts from IoT Gateway</p>
                        <p className="text-[10px] text-slate-400 text-center">Real-time pump & tank notifications will appear here</p>
                    </div>
                </div>

                {/* Profile Glance Dropdown */}
                <div className="relative" ref={profileRef}>
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center space-x-3 cursor-pointer p-1 pr-3 hover:bg-slate-50 rounded-2xl transition-all"
                    >
                        <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold shadow-premium cursor-pointer hover:scale-105 transition-transform",
                            roleConfig ? roleConfig.colorClass : 'bg-gray-400'
                        )}>
                            {initial}
                        </div>
                        <div className="hidden sm:flex flex-col items-start leading-none">
                            <span className="text-sm font-bold text-neutral">{userData.name || 'Loading…'}</span>
                            <span className="text-xs font-medium text-slate-400 mt-1">{roleConfig?.label || '...'}</span>
                        </div>
                        <ChevronDown size={14} className={cn("text-slate-400 transition-transform duration-200", isProfileOpen && "rotate-180")} />
                    </button>

                    {/* Dropdown panel */}
                    {isProfileOpen && (
                        <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-border/50 overflow-hidden animate-in zoom-in-95 duration-150 z-50">
                            <div className="p-4 border-b border-border/50 bg-slate-50/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signed in as</p>
                                <p className="text-sm font-black text-neutral mt-0.5">{userData.name}</p>
                                <span className={cn(
                                    "inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md mt-1.5",
                                    roleConfig?.bgClass, roleConfig ? 'text-slate-700' : 'bg-slate-100 text-slate-500'
                                )}>
                                    {roleConfig?.label || userData.role}
                                </span>
                            </div>
                            <div className="p-2">
                                <button
                                    onClick={() => { router.push('/settings'); setIsProfileOpen(false); }}
                                    className="w-full flex items-center gap-3 p-2.5 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    <Settings size={16} />
                                    <span className="text-sm font-medium">System Settings</span>
                                </button>
                                <button
                                    onClick={() => { router.push('/admin/audit'); setIsProfileOpen(false); }}
                                    className="w-full flex items-center gap-3 p-2.5 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    <FileText size={16} />
                                    <span className="text-sm font-medium">Audit Logs</span>
                                </button>
                                <hr className="my-2 border-border/50" />
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                >
                                    <LogOut size={16} />
                                    <span className="text-sm font-bold">Terminate Session</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
