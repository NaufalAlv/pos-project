import React, { useState, useEffect, useRef } from 'react';
import { useSearchStore, SearchResult } from '../../store/useSearchStore';
import { Search, User, Package, Loader2, X } from 'lucide-react';
import { cn } from '../../utils/cn'; // Assuming you have a standard cn utility

interface SmartAutocompleteProps {
    onSelect: (result: SearchResult) => void;
    placeholder?: string;
    className?: string;
}

export function SmartAutocomplete({ onSelect, placeholder = 'Search customers or products...', className }: SmartAutocompleteProps) {
    const { query, setQuery, results, isLoading, performSearch, clear } = useSearchStore();
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim()) {
                performSearch(query);
            } else {
                clear();
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, performSearch, clear]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const maskPII = (type: string, value: string) => {
        if (!value) return '';
        if (type === 'customer' && value.match(/^[0-9+-\s]+$/)) {
            // Mask phone numbers: e.g. 08123456789 -> 0812-****-6789
            if (value.length > 8) {
                return value.slice(0, 4) + '-****-' + value.slice(-4);
            }
            return '***-****';
        }
        return value;
    };

    return (
        <div ref={wrapperRef} className={cn("relative w-full", className)}>
            <div className="relative flex items-center">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all outline-none text-sm"
                />
                {query && (
                    <button
                        onClick={() => {
                            clear();
                            setIsOpen(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {isOpen && (query.trim().length > 0) && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-border overflow-hidden animate-in fade-in slide-in-from-top-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-8 text-slate-400">
                            <Loader2 className="animate-spin h-6 w-6 mr-2" />
                            <span className="text-sm font-medium">Searching...</span>
                        </div>
                    ) : results.length > 0 ? (
                        <ul className="max-h-80 overflow-y-auto py-2">
                            {results.map((result, idx) => (
                                <li
                                    key={`${result.type}-${result.id}-${idx}`}
                                    onClick={() => {
                                        onSelect(result);
                                        setIsOpen(false);
                                        clear();
                                    }}
                                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-4 group border-b border-border/40 last:border-0"
                                >
                                    <div className={cn(
                                        "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
                                        result.type === 'customer' 
                                            ? "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white" 
                                            : "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white"
                                    )}>
                                        {result.type === 'customer' ? <User size={18} /> : <Package size={18} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-neutral truncate">
                                            {result.title}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate font-mono mt-0.5">
                                            {maskPII(result.type, result.subtitle)}
                                        </p>
                                    </div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-300 group-hover:text-slate-400">
                                        {result.type}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            No results found for "{query}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
