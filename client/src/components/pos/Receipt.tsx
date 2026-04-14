import React from 'react';
import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ReceiptProps {
    transaction: {
        invoice_number: string;
        created_at: string;
        customer_name?: string;
        customer_phone?: string;
        payment_method: string;
        total_amount: number;
        items: any[];
        cash_handed?: number;
        cash_change?: number;
        adjustment_amount?: number;
    };
    onClose: () => void;
}

export const Receipt: React.FC<ReceiptProps> = ({ transaction, onClose }) => {
    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=450,height=600');
        if (!printWindow) return alert('Please allow popups for printing');

        const date = new Date(transaction.created_at || new Date());
        const dateStr = date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + " | " + date.toLocaleTimeString('id-ID');
        const itemsHtml = transaction.items.map(item => `
            <tr>
                <td style="padding: 4px 0;">${item.name}</td>
                <td style="padding: 4px 0; text-align: center;">${item.quantity}</td>
                <td style="padding: 4px 0; text-align: right;">Rp ${(item.price * item.quantity).toLocaleString()}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Invoice - ${transaction.invoice_number}</title>
                    <style>
                        body { font-family: 'Courier New', Courier, monospace; color: black; background: white; margin: 0; padding: 10px; width: 80mm; }
                        h1 { margin: 0; font-size: 20px; font-weight: 900; text-align: center; }
                        p { margin: 2px 0; font-size: 10px; text-align: center; }
                        .dashed { border-top: 1px dashed black; margin: 8px 0; }
                        .details { font-size: 11px; margin-bottom: 8px; }
                        .flex { display: flex; justify-content: space-between; }
                        table { width: 100%; font-size: 11px; border-collapse: collapse; margin-bottom: 8px; }
                        .total { font-size: 14px; font-weight: bold; border-top: 1px dashed black; padding-top: 8px; margin-top: 4px; }
                        .barcode { display: flex; justify-content: center; gap: 2px; margin-top: 8px; }
                        .bar { background: black; height: 30px; }
                        @media print { body { width: 80mm; } }
                    </style>
                </head>
                <body>
                    <h1>POS BENGKEL</h1>
                    <p>Professional Auto Service</p>
                    <p>Jl. Raya Workshop No. 123, Jakarta</p>
                    <p>Telp: 0812-3456-7890</p>
                    <div class="dashed"></div>
                    <div class="details">
                        <div class="flex"><span>Invoice:</span><b>${transaction.invoice_number}</b></div>
                        <div class="flex"><span>Date:</span><span>${dateStr}</span></div>
                        <div class="flex"><span>Cashier:</span><span>Admin</span></div>
                        ${transaction.customer_name ? `<div class="flex"><span>Customer:</span><b>${transaction.customer_name}</b></div>` : ''}
                        ${transaction.customer_phone ? `<div class="flex"><span>Phone:</span><span>${transaction.customer_phone}</span></div>` : ''}
                        <div class="flex"><span>Payment:</span><b>${transaction.payment_method.toUpperCase()}</b></div>
                    </div>
                    <div class="dashed"></div>
                    <table>
                        <thead>
                            <tr style="border-bottom: 1px solid #eee;">
                                <th align="left">Item</th>
                                <th align="center">Qty</th>
                                <th align="right">Price</th>
                            </tr>
                        </thead>
                        <tbody>${itemsHtml}</tbody>
                    </table>
                    <div class="details">
                        <div class="flex"><span>Subtotal</span><span>Rp ${subtotal.toLocaleString()}</span></div>
                        <div class="flex"><span>PPN (0%)</span><span>Rp 0</span></div>
                        ${transaction.adjustment_amount ? `<div class="flex"><span>Adjustment</span><span>Rp ${transaction.adjustment_amount.toLocaleString()}</span></div>` : ''}
                        <div class="flex total"><span>TOTAL</span><span>Rp ${transaction.total_amount.toLocaleString()}</span></div>
                        ${transaction.cash_handed ? `
                        <div class="flex" style="margin-top: 4px;"><span>Handed</span><span>Rp ${transaction.cash_handed.toLocaleString()}</span></div>
                        <div class="flex font-bold"><span>Change</span><span>Rp ${transaction.cash_change?.toLocaleString()}</span></div>
                        ` : ''}
                    </div>
                    <div class="dashed" style="margin-top: 16px;"></div>
                    <p style="font-style: italic;">Thank you for trusting our workshop!</p>
                    <p style="font-weight: bold;">Please come again!</p>
                    <div class="barcode">
                        <div class="bar" style="width: 4px;"></div><div class="bar" style="width: 2px;"></div>
                        <div class="bar" style="width: 8px;"></div><div class="bar" style="width: 2px;"></div>
                        <div class="bar" style="width: 4px;"></div><div class="bar" style="width: 6px;"></div>
                    </div>
                    <p style="font-size: 8px; opacity: 0.6; margin-top: 8px;">System-Generated Receipt</p>
                    <script>
                        window.onload = function() {
                           window.print();
                           setTimeout(function() { window.close(); }, 500);
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const subtotal = transaction.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const tax = 0; // Disable tax for now as per dashboard logic

    return (
        <div id="receipt-modal-root" className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 print:bg-white print:static print:inset-auto">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 relative print:shadow-none print:p-0 print:max-w-none print:mx-0 print:rounded-none">
                {/* Close/Print Buttons - Hidden when printing */}
                <div className="absolute right-4 top-4 flex gap-2 print:hidden">
                    <button onClick={handlePrint} className="p-2 hover:bg-gray-100 rounded-full text-blue-600 transition-colors">
                        <Printer className="h-5 w-5" />
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-black transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Receipt Content */}
                <div id="receipt-print-area" className="flex flex-col items-center text-center space-y-4 font-mono text-black">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black uppercase tracking-tighter">POS BENGKEL</h1>
                        <p className="text-xs">Professional Auto Service</p>
                        <p className="text-[10px] opacity-70">Jl. Raya Workshop No. 123, Jakarta</p>
                        <p className="text-[10px] opacity-70">Telp: 0812-3456-7890</p>
                    </div>

                    <div className="w-full border-t border-dashed border-gray-300 my-2"></div>

                    <div className="w-full text-left text-xs space-y-1">
                        <div className="flex justify-between">
                            <span>Invoice:</span>
                            <span className="font-bold">{transaction.invoice_number}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Date:</span>
                            <span className="text-[10px] sm:text-xs">
                                {new Date(transaction.created_at || new Date()).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} | {new Date(transaction.created_at || new Date()).toLocaleTimeString('id-ID')}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Cashier:</span>
                            <span>Admin</span>
                        </div>
                        {transaction.customer_name && (
                            <div className="flex justify-between items-start">
                                <span>Customer:</span>
                                <div className="text-right">
                                    <p className="font-bold uppercase italic">{transaction.customer_name}</p>
                                    {transaction.customer_phone && <p className="opacity-50 text-[10px]">{transaction.customer_phone}</p>}
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between capitalize">
                            <span>Payment:</span>
                            <span className="font-bold underline">{transaction.payment_method}</span>
                        </div>
                    </div>

                    <div className="w-full border-t border-dashed border-gray-300 my-2"></div>

                    <table className="w-full text-xs text-left">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="py-1">Item</th>
                                <th className="py-1 text-center">Qty</th>
                                <th className="py-1 text-right">Price</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 border-b border-gray-100 italic">
                            {transaction.items.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="py-1 max-w-[120px] truncate">{item.name}</td>
                                    <td className="py-1 text-center underline italic">{item.quantity}</td>
                                    <td className="py-1 text-right">Rp {(item.price * item.quantity).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="w-full space-y-1 text-xs">
                        <div className="flex justify-between mt-2">
                            <span>Subtotal</span>
                            <span>Rp {subtotal.toLocaleString()}</span>
                        </div>
                        {transaction.adjustment_amount ? (
                            <div className="flex justify-between italic text-slate-500">
                                <span>Adjustment</span>
                                <span>Rp {transaction.adjustment_amount.toLocaleString()}</span>
                            </div>
                        ) : null}
                        <div className="flex justify-between text-base font-black border-t border-dashed border-gray-300 pt-2 font-sans tracking-wide underline decoration-double">
                            <span className="uppercase">TOTAL</span>
                            <span>Rp {transaction.total_amount.toLocaleString()}</span>
                        </div>
                        {transaction.cash_handed && transaction.cash_handed > 0 && (
                            <div className="pt-2 border-t border-gray-100 bg-slate-50 p-2 rounded-lg mt-2">
                                <div className="flex justify-between">
                                    <span>Cash Handed</span>
                                    <span>Rp {transaction.cash_handed.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between font-bold text-emerald-600 mt-1">
                                    <span>Change</span>
                                    <span>Rp {transaction.cash_change?.toLocaleString()}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-full border-t border-dashed border-gray-300 my-4"></div>

                    <div className="text-center space-y-2">
                        <p className="text-[10px] italic">Thank you for trusting our workshop!</p>
                        <p className="text-[11px] font-bold">Please come again!</p>
                        <div className="flex justify-center gap-1 mt-2">
                            <div className="w-1 h-8 bg-black"></div>
                            <div className="w-0.5 h-8 bg-black"></div>
                            <div className="w-2 h-8 bg-black"></div>
                            <div className="w-0.5 h-8 bg-black"></div>
                            <div className="w-1 h-8 bg-black"></div>
                            <div className="w-1.5 h-8 bg-black"></div>
                            <div className="w-0.5 h-8 bg-black"></div>
                        </div>
                        <p className="text-[8px] opacity-70">POSBengkel v1.0 • System-Generated Receipt</p>
                    </div>
                </div>

                <div className="mt-8 print:hidden">
                    <Button onClick={onClose} className="w-full">Done</Button>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    /* Completely remove non-receipt content from the print flow */
                    body > *:not(#receipt-modal-root) {
                        display: none !important;
                    }
                    
                    /* If not using a portal, hide the layout and show only the receipt */
                    .dashboard-layout-main, .sidebar-container, .navbar-container {
                        display: none !important;
                    }

                    /* The modal container should not have dark fixed backgrounds */
                    .fixed.inset-0 {
                        position: static !important;
                        background: white !important;
                        display: block !important;
                        padding: 0 !important;
                    }

                    #receipt-print-area {
                        visibility: visible !important;
                        display: block !important;
                        width: 80mm !important; /* Standard Receipt Width */
                        margin: 0 auto !important;
                        padding: 0 !important;
                    }

                    #receipt-print-area * {
                        visibility: visible !important;
                    }

                    .print\\:hidden, button, .no-print {
                        display: none !important;
                    }

                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                }
            `}</style>
        </div>
    );
};
