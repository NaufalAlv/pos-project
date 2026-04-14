'use client';

import React, { useEffect, useState } from 'react';
import { Menu, Bell, Search, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';

interface NavbarProps {
    onMenuClick?: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const username = "Staff"; // Placeholder

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between px-6 glass border-b border-border/50">
            <div className="flex items-center space-x-4">
                <button
                    onClick={onMenuClick}
                    className="p-2 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors lg:hidden"
                >
                    <Menu size={24} />
                </button>
                <div className="hidden md:flex items-center px-4 py-2 bg-slate-100 rounded-xl border border-transparent focus-within:border-primary/20 focus-within:bg-white transition-all duration-200">
                    <Search size={18} className="text-slate-400 mr-2" />
                    <input
                        type="text"
                        placeholder="Search anything..."
                        className="bg-transparent border-none outline-none text-sm text-neutral w-64 placeholder:text-slate-400"
                    />
                </div>
            </div>

            <div className="flex items-center space-x-4 lg:space-x-8">
                <div className="hidden lg:flex items-center space-x-3 px-4 py-1.5 border-r border-border pr-8">
                    <div className="p-2 bg-primary/5 rounded-lg text-primary">
                        <Clock size={18} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">System Time</span>
                        <span className="text-sm font-bold text-neutral font-mono leading-none">
                            {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <button className="relative p-2 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
                        <Bell size={20} />
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border-2 border-white" />
                    </button>

                    <div className="flex items-center pl-4 border-l border-border">
                        <div className="flex flex-col items-end mr-3 sm:flex">
                            <span className="text-sm font-bold text-neutral leading-none">{username}</span>
                            <span className="text-xs font-medium text-slate-400 mt-1">Administrator</span>
                        </div>
                        <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold shadow-premium cursor-pointer hover:scale-105 transition-transform">
                            {username.charAt(0)}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
