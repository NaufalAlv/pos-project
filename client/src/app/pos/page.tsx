'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import api from '@/utils/api';
import { 
    Search, 
    ShoppingCart, 
    Plus, 
    Minus, 
    Trash2, 
    User, 
    Phone, 
    Banknote, 
    QrCode, 
    CreditCard,
    ClipboardList,
    X,
    Printer
} from 'lucide-react';
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
    // Cart State
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Checkout State
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'debit' | 'qris' | 'transfer'>('cash');
    const [cashHanded, setCashHanded] = useState<string>('');
    const [completedTransaction, setCompletedTransaction] = useState<any>(null);

    // Customer Search State
    const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Custom Item State
    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
    const [customItemName, setCustomItemName] = useState('');
    const [customItemPrice, setCustomItemPrice] = useState('');

    // Review & Adjustment State
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [adjustment, setAdjustment] = useState<number>(0);

    useEffect(() => {
        fetchProducts();
    }, []);

    // Live search for customer by phone
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (customerPhone.length >= 3) {
                searchExistingCustomers();
            } else {
                setCustomerSuggestions([]);
                setShowSuggestions(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [customerPhone]);

    const searchExistingCustomers = async () => {
        setIsSearching(true);
        try {
            const res = await api.get(`/customers/search?phone=${customerPhone}`);
            setCustomerSuggestions(res.data);
            setShowSuggestions(res.data.length > 0);
        } catch (error) {
            console.error('Failed to search customers', error);
        } finally {
            setIsSearching(false);
        }
    };

    const selectCustomer = (customer: any) => {
        setCustomerName(customer.name);
        setCustomerPhone(customer.phone);
        setSelectedCustomerId(customer.id);
        setShowSuggestions(false);
        setCustomerSuggestions([]);
    };

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
            if (existing && product.id > 0) { // Only group existing inventory products
                if (existing.quantity >= product.stock) return prev; // Stock limit
                return prev.map((item) =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            // For custom items or new items, add as a new entry
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const addCustomItem = () => {
        if (!customItemName || !customItemPrice) return;
        const newItem: Product = {
            id: (Date.now() + Math.random()) * -1, // Unique negative ID
            name: customItemName,
            price: Number(customItemPrice),
            stock: 999999,
            sku: 'SERVICE'
        };
        addToCart(newItem);
        setCustomItemName('');
        setCustomItemPrice('');
        setIsCustomModalOpen(false);
    };

    const updateQuantity = (id: number, delta: number) => {
        setCart((prev) =>
            prev.map((item) => {
                if (item.id === id) {
                    const newQty = item.quantity + delta;
                    if (id > 0 && newQty > item.stock) return item; // Stock limit for real products
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
    const grandTotal = subtotal + adjustment;
    const changeAmount = Number(cashHanded) > 0 ? Number(cashHanded) - grandTotal : 0;

    const handleAdjustmentChange = (value: string) => {
        const num = parseInt(value) || 0;
        // Apply constraints [-499, +100]
        if (num > 100) setAdjustment(100);
        else if (num < -499) setAdjustment(-499);
        else setAdjustment(num);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        if (paymentMethod === 'cash' && Number(cashHanded) < grandTotal) {
            alert('Cash handed is less than total amount');
            return;
        }

        setIsActionLoading(true);
        try {
            await new Promise(r => setTimeout(r, 800));

            const transactionData = {
                total_amount: grandTotal,
                payment_method: paymentMethod,
                customer_id: selectedCustomerId,
                customer_name: customerName,
                customer_phone: customerPhone,
                cash_handed: paymentMethod === 'cash' ? Number(cashHanded) : 0,
                cash_change: paymentMethod === 'cash' ? changeAmount : 0,
                adjustment_amount: adjustment,
                payment_status: 'PAID', // Default to PAID for now
                items: cart.map((item) => ({
                    product_id: item.id > 0 ? item.id : null,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                })),
            };

            const res = await api.post('/transactions', transactionData);

            setCompletedTransaction({
                ...transactionData,
                invoice_number: res.data.invoice_number,
                created_at: new Date().toISOString()
            });

            setCart([]);
            setCustomerName('');
            setCustomerPhone('');
            setSelectedCustomerId(null);
            setCashHanded('');
            setAdjustment(0);
            setIsReviewModalOpen(false);
            fetchProducts();
        } catch (error: any) {
            console.error('Checkout failed', error);
            alert(error.response?.data?.message || 'Checkout failed');
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
                    <div className="flex-1 flex flex-col space-y-4 text-black overflow-hidden">
                        <div className="flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black" />
                                <input
                                    type="text"
                                    placeholder="Search products by name or SKU..."
                                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-black bg-white transition-all shadow-sm"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" onClick={() => setIsCustomModalOpen(true)} className="gap-2 rounded-xl group hover:border-primary hover:text-primary transition-all">
                                <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Add Service
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 content-start relative pr-2 pb-10">
                            {isActionLoading && (
                                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            )}
                            {filteredProducts.map((product) => {
                                const isDisabled = product.stock === 0 || product.category_is_active === 0;
                                return (
                                    <div
                                        key={product.id}
                                        className={cn(
                                            "bg-white p-4 rounded-xl border border-border/50 cursor-pointer transition-all flex flex-col justify-between group h-40 shadow-sm",
                                            isDisabled ? 'opacity-50 grayscale pointer-events-none' : 'hover:shadow-premium hover:border-primary/30 active:scale-95'
                                        )}
                                        onClick={() => !isDisabled && addToCart(product)}
                                    >
                                        <div className="relative overflow-hidden">
                                            <h3 className="font-bold text-neutral line-clamp-2 leading-tight group-hover:text-primary transition-colors text-sm">{product.name}</h3>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{product.sku}</p>
                                        </div>
                                        <div className="mt-4 flex justify-between items-end">
                                            <span className="font-black text-primary text-base">Rp {product.price.toLocaleString()}</span>
                                            <span className={cn(
                                                "text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-tight",
                                                product.stock > 10 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                            )}>
                                                {product.stock} Units
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Cart Sidebar */}
                    <div className="w-[400px] bg-white rounded-2xl shadow-premium border border-border/50 flex flex-col h-full overflow-hidden">
                        <div className="p-4 border-b border-border/50 bg-slate-50/50 flex justify-between items-center">
                            <h2 className="font-black text-neutral flex items-center gap-2 text-sm tracking-tight">
                                <span className="p-2 bg-primary/10 text-primary rounded-lg shadow-inner"><ShoppingCart size={18} /></span>
                                CURRENT ORDER
                            </h2>
                            <span className="bg-primary text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm">{cart.length} ITEMS</span>
                        </div>

                        {/* Customer Info Section (RESTORED & ENHANCED) */}
                        <div className="p-4 border-b border-border/50 bg-white space-y-3">
                            <div className="relative group">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Customer Phone (Search...)"
                                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-gray-100 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none text-neutral bg-slate-50/30 transition-all font-bold placeholder:font-normal"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value.replace(/[^0-9]/g, ''))}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                />
                                {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>}
                                
                                {/* Customer Selection Dropdown */}
                                {showSuggestions && customerSuggestions.length > 0 && (
                                    <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-border/50 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                        {customerSuggestions.map(cust => (
                                            <div 
                                                key={cust.id} 
                                                className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-0 border-border/20 transition-colors"
                                                onMouseDown={() => selectCustomer(cust)}
                                            >
                                                <p className="font-black text-xs text-neutral">{cust.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold tracking-wider">{cust.phone}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative group">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Customer Name"
                                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-gray-100 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none text-neutral bg-slate-50/30 transition-all font-bold placeholder:font-normal"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-10 grayscale scale-90">
                                    <ShoppingCart size={80} strokeWidth={1} />
                                    <p className="font-bold mt-4 uppercase tracking-[0.2em] text-[10px]">Bag is empty</p>
                                </div>
                            ) : (
                                cart.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center group animate-in slide-in-from-right-4 duration-300">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <h4 className="font-bold text-neutral line-clamp-1 text-sm group-hover:text-primary transition-colors">{item.name}</h4>
                                            <p className="text-[10px] font-black text-primary opacity-80 uppercase tracking-tighter">Rp {item.price.toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl p-0.5">
                                                <button onClick={() => updateQuantity(item.id, -1)} className="p-1 px-2 hover:bg-white hover:text-primary rounded-lg transition-all text-slate-400">
                                                    <Minus size={12} />
                                                </button>
                                                <span className="w-8 text-center text-[10px] font-black text-neutral">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, 1)} className="p-1 px-2 hover:bg-white hover:text-primary rounded-lg transition-all text-slate-400">
                                                    <Plus size={12} />
                                                </button>
                                            </div>
                                            <button onClick={() => removeFromCart(item.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Payment Method Selector (RESTORED) */}
                        <div className="p-4 border-t border-border/50 bg-white">
                            <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest px-1">Payment Method</p>
                            <div className="grid grid-cols-4 gap-1.5 px-1">
                                <button
                                    onClick={() => setPaymentMethod('cash')}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all gap-1",
                                        paymentMethod === 'cash' ? 'bg-primary border-primary text-white shadow-premium' : 'border-gray-100 text-slate-400 hover:bg-slate-50'
                                    )}
                                >
                                    <Banknote size={16} />
                                    <span className="text-[8px] font-black uppercase">CASH</span>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('qris')}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all gap-1",
                                        paymentMethod === 'qris' ? 'bg-primary border-primary text-white shadow-premium' : 'border-gray-100 text-slate-400 hover:bg-slate-50'
                                    )}
                                >
                                    <QrCode size={16} />
                                    <span className="text-[8px] font-black uppercase">QRIS</span>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('debit')}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all gap-1",
                                        paymentMethod === 'debit' ? 'bg-primary border-primary text-white shadow-premium' : 'border-gray-100 text-slate-400 hover:bg-slate-50'
                                    )}
                                >
                                    <CreditCard size={16} />
                                    <span className="text-[8px] font-black uppercase">DEBIT</span>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('transfer')}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all gap-1",
                                        paymentMethod === 'transfer' ? 'bg-primary border-primary text-white shadow-premium' : 'border-gray-100 text-slate-400 hover:bg-slate-50'
                                    )}
                                >
                                    <ClipboardList size={16} />
                                    <span className="text-[8px] font-black uppercase">TRF</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 border-t border-border/50 bg-slate-50/80 space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest">SUBTOTAL</span>
                                <span className="text-xl font-black text-neutral">Rp {subtotal.toLocaleString()}</span>
                            </div>
                            <Button 
                                className="w-full h-14 text-sm font-black tracking-widest shadow-premium rounded-xl group active:scale-95 transition-all" 
                                onClick={() => cart.length > 0 && setIsReviewModalOpen(true)} 
                                disabled={cart.length === 0}
                            >
                                <ShoppingCart size={20} className="mr-2 group-hover:-translate-y-1 transition-transform" />
                                CHECKOUT NOW
                            </Button>
                        </div>
                    </div>
                </div>

                {/* --- CUSTOM MODALS --- */}

                {/* 1. Custom Item Modal (Existing) */}
                {isCustomModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <Card className="w-full max-w-sm shadow-2xl border-white/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <div className="p-2 bg-primary/10 text-primary rounded-lg"><Plus size={18} /></div>
                                    Add Custom Service
                                </CardTitle>
                                <CardDescription>Labor fees, towing, or professional tips.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Service Name</label>
                                    <Input 
                                        placeholder="e.g. Engine Overhaul Labor" 
                                        className="rounded-xl border-gray-100 font-bold"
                                        value={customItemName}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomItemName(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Price (Rp)</label>
                                    <Input 
                                        type="number" 
                                        placeholder="0" 
                                        className="rounded-xl border-gray-100 font-bold text-lg"
                                        value={customItemPrice}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomItemPrice(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => setIsCustomModalOpen(false)}>Cancel</Button>
                                    <Button variant="primary" className="flex-1 rounded-xl shadow-lg" onClick={addCustomItem} disabled={!customItemName || !customItemPrice}>Add to Bag</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* 2. Full Order Review Modal (Existing) */}
                {isReviewModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral/90 backdrop-blur-md p-4 md:p-8 animate-in zoom-in-95 duration-300">
                        <Card className="w-full max-w-4xl shadow-2xl border-white/10 rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
                            <CardHeader className="bg-slate-50/80 border-b border-border/50 pb-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-2xl font-black italic tracking-tighter">REVIEW ORDER</CardTitle>
                                        <CardDescription className="text-sm font-bold opacity-70">Verify items and apply adjustments before finalizing.</CardDescription>
                                    </div>
                                    <button onClick={() => setIsReviewModalOpen(false)} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm border border-border/30">
                                        <X size={24} />
                                    </button>
                                </div>
                            </CardHeader>
                            
                            <CardContent className="p-0 flex flex-col lg:flex-row h-full overflow-hidden">
                                {/* Left Side: Item Management */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 lg:border-r border-border/30">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Line Items</h4>
                                        {cart.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-primary/20 transition-all group">
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <p className="font-bold text-neutral group-hover:text-primary transition-colors">{item.name}</p>
                                                    <p className="text-xs text-slate-400 mb-1">{item.sku}</p>
                                                    <p className="font-black text-xs text-primary/70 italic">Rp {item.price.toLocaleString()}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center bg-white shadow-sm border border-slate-200 rounded-xl p-1">
                                                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 px-2 hover:bg-slate-50 hover:text-primary rounded-lg transition-all">
                                                            <Minus size={14} />
                                                        </button>
                                                        <span className="w-10 text-center text-sm font-black text-neutral">{item.quantity}</span>
                                                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 px-2 hover:bg-slate-50 hover:text-primary rounded-lg transition-all">
                                                            <Plus size={14} />
                                                        </button>
                                                    </div>
                                                    <div className="text-right min-w-[100px]">
                                                        <p className="text-sm font-black text-neutral">Rp {(item.price * item.quantity).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right Side: Totals & Payments */}
                                <div className="w-full lg:w-[350px] bg-white p-8 flex flex-col space-y-6">
                                    {/* Customer Overview */}
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BILLING TO</p>
                                        <div className="p-4 bg-primary/5 rounded-2xl flex items-center gap-3 border border-primary/10">
                                            <div className="p-2 bg-primary text-white rounded-xl shadow-sm"><User size={20} /></div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-black text-sm uppercase italic truncate">{customerName || 'Walk-in customer'}</p>
                                                <p className="text-[10px] font-bold opacity-50 truncate">{customerPhone || 'NO PHONE'}</p>
                                                <p className="text-[9px] font-black text-primary uppercase">{paymentMethod} PAYMENT</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Manual Adjustment Section */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                Manual Adj. <span className="opacity-50 lowercase font-normal italic">(-499 to +100)</span>
                                            </label>
                                        </div>
                                        <div className="relative">
                                            <Input 
                                                type="number"
                                                placeholder="e.g. -350"
                                                className="rounded-2xl border-slate-200 h-12 font-black text-primary bg-primary/2 pl-10"
                                                value={adjustment === 0 ? '' : adjustment}
                                                onChange={(e) => handleAdjustmentChange(e.target.value)}
                                            />
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary opacity-40"><span className="text-xs font-black">Rp</span></div>
                                        </div>
                                    </div>

                                    {/* Final Breakdown */}
                                    <div className="flex-1 space-y-3 pt-6 border-t border-dashed border-slate-200">
                                        <div className="flex justify-between text-xs font-bold text-slate-400">
                                            <span>ORDER SUBTOTAL</span>
                                            <span>Rp {subtotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-black text-primary italic">
                                            <span>MANUAL CORRECTION</span>
                                            <span>{adjustment > 0 ? '+' : ''} Rp {adjustment.toLocaleString()}</span>
                                        </div>
                                        
                                        <div className="pt-4 mt-6 border-t border-slate-200 space-y-4">
                                            <div className="flex flex-col items-center justify-center p-6 bg-neutral text-white rounded-4xl shadow-2xl relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary opacity-20 blur-3xl group-hover:opacity-40 transition-opacity"></div>
                                                <p className="text-[10px] font-black opacity-40 tracking-[0.3em] mb-2 uppercase">TOTAL DUE</p>
                                                <p className="text-3xl font-black italic tracking-tighter">Rp {grandTotal.toLocaleString()}</p>
                                            </div>

                                            {/* Cash Section if applicable */}
                                            {paymentMethod === 'cash' && (
                                                <div className="space-y-4">
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cash Handed</label>
                                                        <Input 
                                                            type="number" 
                                                            className="h-12 rounded-2xl text-xl font-black text-emerald-600 bg-emerald-50 border-emerald-100" 
                                                            value={cashHanded}
                                                            onChange={(e) => setCashHanded(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between items-center p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-emerald-700">
                                                        <span className="text-xs font-black uppercase">CHANGE</span>
                                                        <span className="text-xl font-black italic">Rp {changeAmount.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Button 
                                            className="h-16 rounded-4xl shadow-premium font-black tracking-widest text-base group"
                                            onClick={handleCheckout}
                                            disabled={isActionLoading || (paymentMethod === 'cash' && Number(cashHanded) < grandTotal)}
                                        >
                                            {isActionLoading ? 'PROCESSING...' : 'CONFIRM & PRINT'}
                                            <Printer size={20} className="ml-3 group-hover:scale-110 transition-transform" />
                                        </Button>
                                        <Button variant="ghost" onClick={() => setIsReviewModalOpen(false)} className="rounded-xl text-[10px] font-bold text-slate-400 uppercase">
                                            Back to Order
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}


                {/* 3. Final Success Receipt Modal */}
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

