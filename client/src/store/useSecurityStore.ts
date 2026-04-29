import { create } from 'zustand';
import api from '../utils/api';

export interface AuditLog {
    id: string;
    table_name: string;
    record_id: string;
    action: string;
    changed_by: string;
    ip_address: string;
    reason: string | null;
    created_at: string;
    decryptedData?: { old: any; new: any; error?: string };
}

interface SecurityStore {
    auditLogs: AuditLog[];
    isLoading: boolean;
    error: string | null;
    fetchAuditLogs: () => Promise<void>;
    decryptLog: (id: string) => Promise<void>;
}

export const useSecurityStore = create<SecurityStore>((set, get) => ({
    auditLogs: [],
    isLoading: false,
    error: null,
    
    fetchAuditLogs: async () => {
        set({ isLoading: true, error: null });
        try {
            const res = await api.get('/audit');
            set({ auditLogs: res.data, isLoading: false });
        } catch (err: any) {
            set({ error: err.message || 'Failed to fetch audit logs', isLoading: false });
        }
    },
    
    decryptLog: async (id: string) => {
        try {
            const res = await api.post(`/audit/${id}/decrypt`);
            const { old_value, new_value } = res.data;
            
            set((state) => ({
                auditLogs: state.auditLogs.map(log => 
                    log.id === id 
                        ? { ...log, decryptedData: { old: old_value, new: new_value } } 
                        : log
                )
            }));
        } catch (err: any) {
            set((state) => ({
                auditLogs: state.auditLogs.map(log => 
                    log.id === id 
                        ? { ...log, decryptedData: { old: null, new: null, error: err.response?.data?.message || err.message } } 
                        : log
                )
            }));
            console.error("Failed to decrypt log", err);
        }
    }
}));
