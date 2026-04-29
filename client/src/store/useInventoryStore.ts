import { create } from 'zustand';

interface InventoryStore {
    categories: any[];
    setCategories: (categories: any[]) => void;
    // We will store category-specific metadata templates here later
}

export const useInventoryStore = create<InventoryStore>((set) => ({
    categories: [],
    setCategories: (categories) => set({ categories })
}));
