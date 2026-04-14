'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/utils/api';
import { FileText, Download, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Receipt } from '@/components/pos/Receipt';

export default function ReportsPage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTransaction, setActiveTransaction] = useState<any | null>(null);

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const res = await api.get('/transactions');
                setTransactions(res.data);
            } catch (error) {
                console.error('Failed to fetch transactions', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTransactions();
    }, []);

    const handlePrint = () => {
        window.print();
    };

    const handleView = async (id: number) => {
        try {
            const res = await api.get(`/transactions/${id}`);
            setActiveTransaction(res.data);
        } catch (error) {
            console.error('Failed to fetch transaction details', error);
            alert('Could not load transaction details');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this transaction? This will also RESTORE the product stock.')) return;
        try {
            await api.delete(`/transactions/${id}`);
            const res = await api.get('/transactions');
            setTransactions(res.data);
        } catch (error) {
            console.error('Failed to delete transaction', error);
            alert('Failed to delete transaction');
        }
    };

    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center print:hidden">
                        <h1 className="text-2xl font-bold text-black">Sales Reports</h1>
                        <Button variant="outline" onClick={handlePrint}>
                            <Download className="mr-2 h-4 w-4" />
                            Export / Print
                        </Button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-semibold text-black flex items-center">
                                <FileText className="mr-2 h-5 w-5 text-blue-600" />
                                Transaction History
                            </h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-black">
                                <thead className="bg-gray-50 text-black font-medium">
                                    <tr>
                                        <th className="px-6 py-3">Invoice</th>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Customer</th>
                                        <th className="px-6 py-3">Cashier</th>
                                        <th className="px-6 py-3">Qty</th>
                                        <th className="px-6 py-3">Payment</th>
                                        <th className="px-6 py-3 text-right">Total</th>
                                        <th className="px-6 py-3 text-right print:hidden">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr><td colSpan={7} className="px-6 py-4 text-center">Loading...</td></tr>
                                    ) : transactions.length === 0 ? (
                                        <tr><td colSpan={7} className="px-6 py-4 text-center text-black">No transactions found.</td></tr>
                                    ) : (
                                        transactions.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-gray-50 text-black">
                                                <td className="px-6 py-4 font-medium text-black">{tx.invoice_number}</td>
                                                <td className="px-6 py-4 text-black text-xs">
                                                    {new Date(tx.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} | {new Date(tx.created_at).toLocaleTimeString('id-ID')}
                                                </td>
                                                <td className="px-6 py-4 text-black">{tx.customer_name || '-'}</td>
                                                <td className="px-6 py-4 text-black">{tx.username}</td>
                                                <td className="px-6 py-4 text-black font-medium text-center">{tx.total_items || 0}</td>
                                                <td className="px-6 py-4 uppercase text-black font-bold tracking-wider text-xs">{tx.payment_method}</td>
                                                <td className="px-6 py-4 text-right font-medium text-black">Rp {tx.total_amount.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right print:hidden space-x-3">
                                                    <button onClick={() => handleView(tx.id)} className="text-blue-600 hover:text-blue-800">
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(tx.id)} className="text-red-600 hover:text-red-800">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {transactions.length > 0 && (
                                    <tfoot className="bg-gray-50 border-t-2 border-gray-100 font-bold text-black">
                                        <tr>
                                            <td colSpan={2} className="px-6 py-4 text-black">TOTAL ({transactions.length} Transactions)</td>
                                            <td colSpan={2} className="px-6 py-4"></td>
                                            <td className="px-6 py-4 text-center text-black">
                                                {transactions.reduce((acc, tx) => acc + (tx.total_items || 0), 0)} Items
                                            </td>
                                            <td className="px-6 py-4"></td>
                                            <td className="px-6 py-4 text-right text-blue-700 text-lg">
                                                Rp {transactions.reduce((acc, tx) => acc + (tx.total_amount || 0), 0).toLocaleString()}
                                            </td>
                                            <td className="print:hidden"></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </div>

                {activeTransaction && (
                    <Receipt
                        transaction={activeTransaction}
                        onClose={() => setActiveTransaction(null)}
                    />
                )}
            </DashboardLayout>
        </ProtectedRoute>
    );
};
