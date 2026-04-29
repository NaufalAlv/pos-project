import { create } from 'zustand';
import api from '../utils/api';

export interface SearchResult {
    type: 'customer' | 'product' | 'transaction' | 'page';
    id: string | number;
    title: string;
    subtitle: string;
    url?: string;
    data: any;
}

interface SearchStore {
    query: string;
    results: SearchResult[];
    isLoading: boolean;
    error: string | null;
    setQuery: (q: string) => void;
    performSearch: (q: string) => Promise<void>;
    clear: () => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
    query: '',
    results: [],
    isLoading: false,
    error: null,
    
    setQuery: (q: string) => set({ query: q }),
    
    performSearch: async (q: string) => {
        if (!q || q.trim() === '') {
            set({ results: [], isLoading: false, error: null });
            return;
        }
        
        set({ isLoading: true, error: null });
        try {
            const res = await api.get(`/search?q=${encodeURIComponent(q)}`);
            set({ results: res.data, isLoading: false });
        } catch (err: any) {
            set({ error: err.message || 'Search failed', isLoading: false, results: [] });
        }
    },
    
    clear: () => set({ query: '', results: [], error: null, isLoading: false })
}));
