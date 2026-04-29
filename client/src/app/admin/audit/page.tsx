'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useSecurityStore } from '@/store/useSecurityStore';
import { Shield, Search, Filter, LockOpen, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

export default function AuditDashboard() {
    const { auditLogs, isLoading, error, fetchAuditLogs, decryptLog } = useSecurityStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('ALL');
    const [decryptingId, setDecryptingId] = useState<string | null>(null);

    useEffect(() => {
        fetchAuditLogs();
    }, [fetchAuditLogs]);

    const handleDecrypt = async (id: string) => {
        setDecryptingId(id);
        await decryptLog(id);
        setDecryptingId(null);
    };

    const filteredLogs = auditLogs.filter(log => {
        const matchesSearch = 
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
            log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.changed_by.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.record_id.toLowerCase().includes(searchTerm.toLowerCase());
            
        const matchesAction = filterAction === 'ALL' || log.action === filterAction;
        
        return matchesSearch && matchesAction;
    });

    const getActionColor = (action: string) => {
        switch(action) {
            case 'CREATE': return 'bg-emerald-100 text-emerald-700';
            case 'UPDATE': return 'bg-blue-100 text-blue-700';
            case 'DELETE': return 'bg-red-100 text-red-700';
            case 'UNMASK': return 'bg-amber-100 text-amber-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <ProtectedRoute requireAdmin={true}>
            <DashboardLayout>
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                <Shield className="h-8 w-8 text-primary" />
                                Security Audit Vault
                            </h1>
                            <p className="text-slate-500 mt-1">Immutable, AES-256 encrypted log of all sensitive data access and mutations.</p>
                        </div>
                    </div>

                    <Card className="shadow-premium border-0 overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-border/40 pb-6">
                            <div className="flex flex-col sm:flex-row justify-between gap-4">
                                <div className="relative max-w-md w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Search by ID, Table, User, or Action..." 
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-slate-400" />
                                    <select 
                                        className="pl-3 pr-8 py-2.5 rounded-xl border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm bg-white"
                                        value={filterAction}
                                        onChange={(e) => setFilterAction(e.target.value)}
                                    >
                                        <option value="ALL">All Actions</option>
                                        <option value="CREATE">CREATE</option>
                                        <option value="UPDATE">UPDATE</option>
                                        <option value="DELETE">DELETE</option>
                                        <option value="UNMASK">UNMASK</option>
                                    </select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
                            ) : error ? (
                                <div className="p-8 text-center text-red-500 bg-red-50">{error}</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                                <th className="px-6 py-4 font-bold">Timestamp</th>
                                                <th className="px-6 py-4 font-bold">Action</th>
                                                <th className="px-6 py-4 font-bold">Target</th>
                                                <th className="px-6 py-4 font-bold">User / IP</th>
                                                <th className="px-6 py-4 font-bold text-right">Encrypted Payload</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm divide-y divide-border/40">
                                            {filteredLogs.map(log => (
                                                <React.Fragment key={log.id}>
                                                    <tr className="hover:bg-slate-50/50 transition-colors group">
                                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                                            {new Date(log.created_at).toLocaleString()}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider", getActionColor(log.action))}>
                                                                {log.action}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="font-medium text-slate-800">{log.table_name}</div>
                                                            <div className="text-xs text-slate-400 font-mono mt-0.5" title={log.record_id}>
                                                                {log.record_id.substring(0, 8)}...
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-slate-800 font-medium">User {log.changed_by}</div>
                                                            <div className="text-xs text-slate-400 font-mono mt-0.5">{log.ip_address}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                                            {!log.decryptedData ? (
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="sm" 
                                                                    onClick={() => handleDecrypt(log.id)}
                                                                    disabled={decryptingId === log.id}
                                                                    className="text-xs py-1 h-auto"
                                                                >
                                                                    {decryptingId === log.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <LockOpen className="h-3 w-3 mr-1" />}
                                                                    Audit Decrypt
                                                                </Button>
                                                            ) : (
                                                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                                                    Decrypted
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    {log.decryptedData && (
                                                        <tr className="bg-slate-50 border-t-0">
                                                            <td colSpan={5} className="px-6 py-4">
                                                                {log.decryptedData.error ? (
                                                                    <div className="text-red-500 text-xs font-mono bg-red-50 p-3 rounded">{log.decryptedData.error}</div>
                                                                ) : (
                                                                    <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-slate-900 text-green-400 p-4 rounded-xl overflow-x-auto shadow-inner">
                                                                        <div>
                                                                            <div className="text-slate-400 mb-2 font-bold uppercase tracking-widest text-[10px]">Previous State</div>
                                                                            <pre>{JSON.stringify(log.decryptedData.old, null, 2) || 'null'}</pre>
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-slate-400 mb-2 font-bold uppercase tracking-widest text-[10px]">New State</div>
                                                                            <pre>{JSON.stringify(log.decryptedData.new, null, 2) || 'null'}</pre>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                            {filteredLogs.length === 0 && !isLoading && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                                        No audit logs found matching criteria.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
