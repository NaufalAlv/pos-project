'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import api from '@/utils/api';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, Phone, CreditCard, Banknote, QrCode } from 'lucide-react';
import { Receipt } from '@/components/pos/Receipt';

interface Product {
    id: number;
    name: string;
    price: number;
    stock: number;
    sku: string;
    category_is_active?: number;
}

interface CartItem extends Product {
    quantity: number;
}

export default function POSPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Checkout State
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'debit' | 'qris' | 'transfer'>('cash');
    const [completedTransaction, setCompletedTransaction] = useState<any>(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/inventory/products');
            setProducts(res.data);
        } catch (error) {
            console.error('Failed to fetch products', error);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (product: Product) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.id === product.id);
            if (existing) {
                if (existing.quantity >= product.stock) return prev; // Stock limit
                return prev.map((item) =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const updateQuantity = (id: number, delta: number) => {
        setCart((prev) =>
            prev.map((item) => {
                if (item.id === id) {
                    const newQty = item.quantity + delta;
                    if (newQty > item.stock) return item; // Stock limit
                    return { ...item, quantity: Math.max(1, newQty) };
                }
                return item;
            })
        );
    };

    const removeFromCart = (id: number) => {
        setCart((prev) => prev.filter((item) => item.id !== id));
    };

    const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    // const tax = subtotal * 0.11; // 11% PPN
    const total = subtotal;

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setIsActionLoading(true);
        try {
            // Simulated loading delay
            await new Promise(r => setTimeout(r, 600));

            const transactionData = {
                total_amount: total,
                payment_method: paymentMethod,
                customer_name: customerName,
                customer_phone: customerPhone,
                items: cart.map((item) => ({
                    product_id: item.id,
                    name: item.name, // For receipt
                    quantity: item.quantity,
                    price: item.price,
                })),
            };

            const res = await api.post('/transactions', transactionData);

            // Set data for Receipt
            setCompletedTransaction({
                ...transactionData,
                invoice_number: res.data.invoice_number,
                created_at: new Date().toISOString()
            });

            // Cleanup
            setCart([]);
            setCustomerName('');
            setCustomerPhone('');
            fetchProducts(); // Refresh stock
        } catch (error) {
            console.error('Checkout failed', error);
            alert('Checkout failed');
        } finally {
            setIsActionLoading(false);
        }
    };

    const filteredProducts = products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="flex h-[calc(100vh-100px)] gap-6">
                    {/* Product Grid */}
                    <div className="flex-1 flex flex-col space-y-4 text-black">
                        <div className="flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black" />
                                <input
                                    type="text"
                                    placeholder="Search products by name or SKU..."
                                    className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-black bg-white"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 content-start relative">
                            {isActionLoading && (
                                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                            )}
                            {filteredProducts.map((product) => {
                                const isDisabled = product.stock === 0 || product.category_is_active === 0;
                                return (
                                    <div
                                        key={product.id}
                                        className={`bg-white p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between
                            ${isDisabled ? 'opacity-50 grayscale border-gray-200 pointer-events-none' : 'border-gray-200 hover:shadow-md'}
                        `}
                                        onClick={() => !isDisabled && addToCart(product)}
                                    >
                                        <div>
                                            <h3 className="font-semibold text-black line-clamp-2">{product.name}</h3>
                                            <p className="text-xs text-black mt-1">{product.sku}</p>
                                        </div>
                                        <div className="mt-4 flex justify-between items-end">
                                            <span className="font-bold text-blue-600">Rp {product.price.toLocaleString()}</span>
                                            <span className={`text-xs px-2 py-1 rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {product.stock} left
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Cart Sidebar */}
                    <div className="w-96 bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col h-full overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h2 className="font-bold text-black flex items-center">
                                <ShoppingCart className="mr-2 h-5 w-5" />
                                Current Order
                            </h2>
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{cart.length} items</span>
                        </div>

                        {/* Customer Info Section */}
                        <div className="p-4 border-b border-gray-100 bg-white space-y-3">
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black opacity-40" />
                                <input
                                    type="text"
                                    placeholder="Customer Name"
                                    className="w-full pl-9 pr-4 py-2 text-sm rounded-md border border-gray-200 focus:border-blue-500 outline-none text-black bg-gray-50"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                />
                            </div>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black opacity-40" />
                                <input
                                    type="text"
                                    placeholder="Customer Phone (Optional)"
                                    className="w-full pl-9 pr-4 py-2 text-sm rounded-md border border-gray-200 focus:border-blue-500 outline-none text-black bg-gray-50"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-black">
                                    <ShoppingCart className="h-12 w-12 mb-2 opacity-10" />
                                    <p className="text-gray-400">Cart is empty</p>
                                </div>
                            ) : (
                                cart.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center group">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-black line-clamp-1">{item.name}</h4>
                                            <p className="text-xs text-blue-600 sm:text-xs">Rp {item.price.toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center bg-gray-100 rounded-lg">
                                                <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-gray-200 rounded-l-lg text-black">
                                                    <Minus className="h-3 w-3" />
                                                </button>
                                                <span className="w-8 text-center text-sm font-medium text-black">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-gray-200 rounded-r-lg text-black">
                                                    <Plus className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <button onClick={() => removeFromCart(item.id)} className="text-black hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Payment Method Selector */}
                        <div className="p-4 border-t border-gray-100 bg-white">
                            <p className="text-xs font-semibold text-black mb-3 uppercase tracking-wider">Payment Method</p>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => setPaymentMethod('cash')}
                                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${paymentMethod === 'cash' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-black hover:bg-gray-50'}`}
                                >
                                    <Banknote className="h-4 w-4 mb-1" />
                                    <span className="text-[10px] font-bold">CASH</span>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('qris')}
                                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${paymentMethod === 'qris' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-black hover:bg-gray-50'}`}
                                >
                                    <QrCode className="h-4 w-4 mb-1" />
                                    <span className="text-[10px] font-bold">QRIS</span>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('debit')}
                                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${paymentMethod === 'debit' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-black hover:bg-gray-50'}`}
                                >
                                    <CreditCard className="h-4 w-4 mb-1" />
                                    <span className="text-[10px] font-bold">DEBIT</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-3">
                            <div className="flex justify-between text-sm text-black">
                                <span>Subtotal</span>
                                <span>Rp {subtotal.toLocaleString()}</span>
                            </div>
                            {/* <div className="flex justify-between text-sm text-black">
                                <span>Tax (11%)</span>
                                <span>Rp {tax.toLocaleString()}</span>
                            </div> */}
                            <div className="flex justify-between text-lg font-bold text-black pt-2 border-t border-gray-200">
                                <span>Total</span>
                                <span>Rp {total.toLocaleString()}</span>
                            </div>
                            <Button className="w-full mt-4 h-12 text-lg font-bold" size="lg" onClick={handleCheckout} disabled={cart.length === 0 || isActionLoading}>
                                {isActionLoading ? 'PROCESSING...' : 'CHECKOUT'}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Receipt Modal */}
                {completedTransaction && (
                    <Receipt
                        transaction={completedTransaction}
                        onClose={() => setCompletedTransaction(null)}
                    />
                )}
            </DashboardLayout>
        </ProtectedRoute>
    );
}
