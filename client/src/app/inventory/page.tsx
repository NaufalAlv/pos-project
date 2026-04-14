'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import api from '@/utils/api';
import { Plus, Search, Edit, Trash2, Package, Filter, MoreVertical, Coins, Boxes, Layers, ClipboardList, History, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import { cn } from '@/utils/cn';
import Link from 'next/link';

interface Product {
    id: number;
    name: string;
    sku: string;
    stock: number;
    price: number;
    buy_price?: number;
    category_name?: string;
}

export default function InventoryPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Restock State
    const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
    const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);
    const [restockForm, setRestockForm] = useState({ quantity: 0, buy_price: 0 });

    // History State
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
    const [productHistory, setProductHistory] = useState<any[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    // Categories State
    const [categories, setCategories] = useState<any[]>([]);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Inventory Stats State
    const [stats, setStats] = useState({
        totalValuation: 0,
        totalStock: 0,
        activeCategories: 0,
        totalProducts: 0
    });

    // Filtering & Sorting State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Product; direction: 'asc' | 'desc' } | null>({
        key: 'name',
        direction: 'asc'
    });

    // UI State for 2x2 Menu
    const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        sku: '',
        stock: 0,
        price: 0,
        buy_price: 0,
        category_id: ''
    });

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

    const fetchCategories = async () => {
        try {
            const res = await api.get('/inventory/categories');
            setCategories(res.data);
        } catch (error) {
            console.error('Failed to fetch categories', error);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/analytics/inventory');
            setStats(res.data);
        } catch (error) {
            console.error('Failed to fetch inventory stats', error);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
        fetchStats();
    }, []);

    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        setError(null);
        setFormData({
            name: product.name,
            description: (product as any).description || '',
            sku: product.sku || '',
            stock: product.stock,
            price: product.price,
            buy_price: (product as any).buy_price || 0,
            category_id: (product as any).category_id?.toString() || ''
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
        setError(null);
        setFormData({ name: '', description: '', sku: '', stock: 0, price: 0, buy_price: 0, category_id: '' });
    };

    // Filtered and Sorted Products
    const filteredProducts = React.useMemo(() => {
        return products.filter(product => {
            const matchesSearch = searchTerm === '' ||
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesCategory = selectedCategory === 'all' || product.category_name === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchTerm, selectedCategory]);

    const sortedProducts = React.useMemo(() => {
        let sortableProducts = [...filteredProducts];
        if (sortConfig !== null) {
            sortableProducts.sort((a, b) => {
                const aValue = a[sortConfig.key] ?? '';
                const bValue = b[sortConfig.key] ?? '';

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableProducts;
    }, [filteredProducts, sortConfig]);

    const requestSort = (key: keyof Product) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof Product) => {
        if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown size={14} className="ml-1 opacity-20" />;
        return sortConfig.direction === 'asc' ?
            <ArrowUp size={14} className="ml-1 text-primary" /> :
            <ArrowDown size={14} className="ml-1 text-primary" />;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsActionLoading(true);
        try {
            // Simulated loading delay
            await new Promise(r => setTimeout(r, 600));

            const payload = {
                ...formData,
                category_id: formData.category_id ? Number(formData.category_id) : null
            };

            if (editingProduct) {
                await api.put(`/inventory/products/${editingProduct.id}`, payload);
            } else {
                await api.post('/inventory/products', payload);
            }

            closeModal();
            fetchProducts();
            fetchStats();
        } catch (err: any) {
            console.error('Failed to save product', err);
            const serverMessage = err.response?.data?.error?.message || err.response?.data?.message || '';

            if (serverMessage.includes('PRODUCT_NAME_DUPLICATE')) {
                setError('DUPLICATE NAME: An item with this name already exists.');
            } else if (serverMessage.includes('SKU_DUPLICATE')) {
                setError('DUPLICATE SKU: This SKU is already assigned to another item.');
            } else {
                setError('Failed to save product. Please check your inputs.');
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        setIsActionLoading(true);
        try {
            await new Promise(r => setTimeout(r, 600)); // Simulated delay
            await api.delete(`/inventory/products/${id}`);
            fetchProducts();
            fetchStats();
        } catch (error) {
            console.error('Failed to delete product', error);
        } finally {
            setIsActionLoading(false);
        }
    };

    const openRestockModal = (product: Product) => {
        setRestockingProduct(product);
        setRestockForm({ quantity: 0, buy_price: (product as any).buy_price || 0 });
        setIsRestockModalOpen(true);
    };

    const handleRestock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!restockingProduct) return;
        setIsActionLoading(true);
        try {
            await new Promise(r => setTimeout(r, 500));
            await api.post(`/inventory/products/${restockingProduct.id}/restock`, restockForm);
            setIsRestockModalOpen(false);
            setRestockingProduct(null);
            fetchProducts();
            fetchStats();
        } catch (err: any) {
            console.error('Failed to restock product', err);
            setError('Failed to restock product');
        } finally {
            setIsActionLoading(false);
        }
    };

    const openHistoryModal = async (product: Product) => {
        setHistoryProduct(product);
        setIsHistoryModalOpen(true);
        setIsHistoryLoading(true);
        try {
            const res = await api.get(`/inventory/products/${product.id}/history`);
            setProductHistory(res.data);
        } catch (error) {
            console.error('Failed to fetch product history', error);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        setIsActionLoading(true);
        try {
            await new Promise(r => setTimeout(r, 400));
            await api.post('/inventory/categories', { name: newCategoryName });
            setNewCategoryName('');
            fetchCategories();
        } catch (error) {
            console.error('Failed to create category', error);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleToggleCategory = async (id: number) => {
        setIsActionLoading(true);
        try {
            await api.patch(`/inventory/categories/${id}/toggle`);
            fetchCategories();
            fetchProducts(); // refresh products because their active state might change
            fetchStats();
        } catch (error) {
            console.error('Failed to toggle category', error);
        } finally {
            setIsActionLoading(false);
        }
    };

    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="space-y-8 animate-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-heading text-neutral">Inventory Management</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-slate-500">Track and manage your workshop supplies and parts.</p>
                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                <Link href="/inventory/history" className="text-primary font-bold text-sm hover:underline flex items-center gap-1 group">
                                    <History size={14} className="group-hover:rotate-45 transition-transform" />
                                    View All Movements
                                </Link>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setIsCategoryModalOpen(true)}>
                                Manage Categories
                            </Button>
                            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add New Product
                            </Button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="hover:scale-[1.02] transition-transform duration-300">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                                        <Coins size={24} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Valuation</span>
                                </div>
                                <div className="mt-4">
                                    <h3 className="text-sm font-semibold text-slate-500">Total Valuation</h3>
                                    <p className="text-2xl font-bold text-neutral mt-1 font-heading">
                                        Rp {stats.totalValuation.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-2 flex items-center">
                                        Total asset value (buy price)
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="hover:scale-[1.02] transition-transform duration-300">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="p-3 rounded-2xl bg-secondary/10 text-secondary">
                                        <Boxes size={24} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">In Stock</span>
                                </div>
                                <div className="mt-4">
                                    <h3 className="text-sm font-semibold text-slate-500">Items Stored</h3>
                                    <p className="text-2xl font-bold text-neutral mt-1 font-heading">
                                        {stats.totalStock.toLocaleString()} units
                                    </p>
                                    <p className="text-xs text-slate-400 mt-2 flex items-center">
                                        Cumulative quantity stored
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="hover:scale-[1.02] transition-transform duration-300">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="p-3 rounded-2xl bg-tertiary/10 text-tertiary">
                                        <Layers size={24} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Active</span>
                                </div>
                                <div className="mt-4">
                                    <h3 className="text-sm font-semibold text-slate-500">Categories Sold</h3>
                                    <p className="text-2xl font-bold text-neutral mt-1 font-heading">
                                        {stats.activeCategories} types
                                    </p>
                                    <p className="text-xs text-slate-400 mt-2 flex items-center">
                                        Active category groups
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="hover:scale-[1.02] transition-transform duration-300">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-600">
                                        <ClipboardList size={24} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Product List</span>
                                </div>
                                <div className="mt-4">
                                    <h3 className="text-sm font-semibold text-slate-500">Different Products</h3>
                                    <p className="text-2xl font-bold text-neutral mt-1 font-heading">
                                        {stats.totalProducts} items
                                    </p>
                                    <p className="text-xs text-slate-400 mt-2 flex items-center">
                                        Unique product models
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card shadow-premium>
                        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search products by name or SKU..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all outline-none text-sm"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-border">
                                    <div className="pl-3 pr-1 py-1 text-slate-400">
                                        <Filter size={14} />
                                    </div>
                                    <select
                                        className="bg-transparent text-sm font-medium text-slate-600 outline-none pr-3 py-1.5 cursor-pointer max-w-[150px]"
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                    >
                                        <option value="all">All Categories</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.name}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm table-fixed min-w-[800px]">
                                    <thead>
                                        <tr className="border-b border-border/50 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors w-[30%]" onClick={() => requestSort('name')}>
                                                <div className="flex items-center">Product Details {getSortIcon('name')}</div>
                                            </th>
                                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => requestSort('category_name')}>
                                                <div className="flex items-center">Category {getSortIcon('category_name')}</div>
                                            </th>
                                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => requestSort('stock')}>
                                                <div className="flex items-center">Stock Level {getSortIcon('stock')}</div>
                                            </th>
                                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => requestSort('buy_price')}>
                                                <div className="flex items-center">Avg. Buy Price {getSortIcon('buy_price')}</div>
                                            </th>
                                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => requestSort('price')}>
                                                <div className="flex items-center">Selling Price {getSortIcon('price')}</div>
                                            </th>
                                            <th className="px-6 py-4 text-right w-[100px]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {(loading || sortedProducts.length === 0) ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                                                    {loading ? 'Fetching inventory data...' : 'No products found match your search.'}
                                                </td>
                                            </tr>
                                        ) : (
                                            sortedProducts.map((product) => (
                                                <tr key={product.id} className="hover:bg-slate-50/50 group transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                                <Package size={20} />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-neutral">{product.name}</span>
                                                                <span className="text-[10px] text-slate-400 font-mono tracking-wider">{product.sku}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                                                            {product.category_name || 'General'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center space-x-2">
                                                            <div className={cn(
                                                                "h-1.5 w-1.5 rounded-full animate-pulse",
                                                                product.stock > 10 ? "bg-emerald-500" : "bg-red-500"
                                                            )} />
                                                            <span className={cn(
                                                                "font-bold",
                                                                product.stock > 10 ? "text-emerald-600" : "text-red-500"
                                                            )}>
                                                                {product.stock} pcs
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-slate-500">
                                                        Rp {(product.buy_price || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center space-x-2">
                                                            <div className={cn(
                                                                "h-1.5 w-1.5 rounded-full",
                                                                product.price > (product.buy_price || 0) ? "bg-emerald-500" : (product.price === (product.buy_price || 0) ? "bg-yellow-500" : "bg-red-500")
                                                            )} />
                                                            <span className={cn(
                                                                "font-bold",
                                                                product.price > (product.buy_price || 0) ? "text-emerald-600" : (product.price === (product.buy_price || 0) ? "text-yellow-600" : "text-red-500")
                                                            )}>
                                                                Rp {product.price.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right relative">
                                                        <div className="flex justify-end">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveMenuId(activeMenuId === product.id ? null : product.id);
                                                                }}
                                                                className={cn(
                                                                    "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                                                                    activeMenuId === product.id ? "bg-primary text-white" : "text-slate-400 hover:bg-slate-100"
                                                                )}
                                                            >
                                                                <MoreVertical size={18} />
                                                            </button>

                                                            {activeMenuId === product.id && (
                                                                <>
                                                                    <div
                                                                        className="fixed inset-0 z-60"
                                                                        onClick={() => setActiveMenuId(null)}
                                                                    />
                                                                    <div className="absolute right-0 top-10 z-70 bg-white rounded-2xl shadow-2xl border border-border p-2 min-w-[160px] animate-in fade-in zoom-in duration-200">
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <button
                                                                                onClick={() => { openHistoryModal(product); setActiveMenuId(null); }}
                                                                                className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-blue-50 text-blue-600 transition-colors group w-full aspect-square"
                                                                                title="View History"
                                                                            >
                                                                                <History size={20} className="group-hover:scale-110 transition-transform" />
                                                                                <span className="text-[10px] mt-1 font-bold">History</span>
                                                                            </button>
                                                                            <button
                                                                                onClick={() => { openRestockModal(product); setActiveMenuId(null); }}
                                                                                className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-emerald-50 text-emerald-600 transition-colors group w-full aspect-square"
                                                                                title="Add Stock"
                                                                            >
                                                                                <Plus size={20} className="group-hover:scale-110 transition-transform" />
                                                                                <span className="text-[10px] mt-1 font-bold">Restock</span>
                                                                            </button>
                                                                            <button
                                                                                onClick={() => { openEditModal(product); setActiveMenuId(null); }}
                                                                                className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors group w-full aspect-square"
                                                                                title="Edit Product"
                                                                            >
                                                                                <Edit size={20} className="group-hover:scale-110 transition-transform" />
                                                                                <span className="text-[10px] mt-1 font-bold">Edit</span>
                                                                            </button>
                                                                            <button
                                                                                onClick={() => { handleDelete(product.id); setActiveMenuId(null); }}
                                                                                className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-red-50 text-red-600 transition-colors group w-full aspect-square"
                                                                                title="Delete Item"
                                                                            >
                                                                                <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
                                                                                <span className="text-[10px] mt-1 font-bold">Delete</span>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Modern Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral/80 backdrop-blur-sm p-4 animate-in">
                        <Card className="w-full max-w-lg shadow-2xl border-white/20">
                            <CardHeader className="border-b border-border/50 pb-6">
                                <CardTitle className="text-2xl font-heading">{editingProduct ? 'Edit Product' : 'Add New Product'}</CardTitle>
                                <CardDescription>Enter the details for this inventory item.</CardDescription>
                            </CardHeader>

                            <CardContent className="pt-6">
                                {error && (
                                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold animate-pulse">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="md:col-span-2">
                                            <Input
                                                label="Product Name"
                                                required
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="e.g. Engine Oil 5W-40"
                                            />
                                        </div>
                                        <Input
                                            label="SKU / Barcode"
                                            disabled={!!editingProduct}
                                            value={formData.sku}
                                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                            placeholder="Barcode"
                                        />
                                        <div className="flex flex-col space-y-1.5">
                                            <label className="text-sm font-bold text-slate-700">Product Category</label>
                                            <select
                                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 sm:text-sm shadow-sm transition-all text-neutral disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 disabled:cursor-not-allowed"
                                                disabled={!!editingProduct}
                                                value={formData.category_id}
                                                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                            >
                                                <option value="">Select Category</option>
                                                {categories.filter(c => c.is_active !== 0).map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <Input
                                            label="Current Stock"
                                            type="number"
                                            disabled={!!editingProduct}
                                            required
                                            value={formData.stock}
                                            onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                                        />
                                        <Input
                                            label="Selling Price (Rp)"
                                            type="number"
                                            required
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                        />
                                        <Input
                                            label="Avg. Buy Price / Cost (Rp)"
                                            disabled={!!editingProduct}
                                            type="number"
                                            required
                                            value={formData.buy_price}
                                            onChange={(e) => setFormData({ ...formData, buy_price: Number(e.target.value) })}
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-border/50">
                                        <Button type="button" variant="outline" onClick={closeModal} className="px-6" disabled={isActionLoading}>Cancel</Button>
                                        <Button type="submit" variant="primary" className="px-8 font-bold tracking-wide" disabled={isActionLoading}>
                                            {isActionLoading ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Restock Modal */}
                {isRestockModalOpen && restockingProduct && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral/80 backdrop-blur-sm p-4 animate-in">
                        <Card className="w-full max-w-sm shadow-2xl border-white/20">
                            <CardHeader className="border-b border-border/50 pb-6 flex justify-between flex-row items-center">
                                <div>
                                    <CardTitle className="text-2xl font-heading">Restock Item</CardTitle>
                                    <CardDescription>{restockingProduct.name}</CardDescription>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setIsRestockModalOpen(false)}>✕</Button>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <form onSubmit={handleRestock} className="space-y-4">
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4 text-sm text-slate-600 flex justify-between">
                                        <span>Current Stock: <b>{restockingProduct.stock}</b></span>
                                        <span>Avg Cost: <b>Rp {(restockingProduct as any).buy_price?.toLocaleString() || 0}</b></span>
                                    </div>
                                    <Input
                                        label="Quantity to Add"
                                        type="number"
                                        required
                                        min="1"
                                        value={restockForm.quantity}
                                        onChange={(e) => setRestockForm({ ...restockForm, quantity: Number(e.target.value) })}
                                    />
                                    <Input
                                        label="Incoming Buy Price (per unit)"
                                        type="number"
                                        required
                                        min="0"
                                        value={restockForm.buy_price}
                                        onChange={(e) => setRestockForm({ ...restockForm, buy_price: Number(e.target.value) })}
                                    />
                                    <div className="flex justify-end gap-3 mt-6">
                                        <Button type="button" variant="outline" onClick={() => setIsRestockModalOpen(false)} disabled={isActionLoading}>Cancel</Button>
                                        <Button type="submit" variant="primary" disabled={isActionLoading || restockForm.quantity <= 0}>
                                            {isActionLoading ? 'Saving...' : 'Add Stock'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* History Modal */}
                {isHistoryModalOpen && historyProduct && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral/80 backdrop-blur-sm p-4 animate-in">
                        <Card className="w-full max-w-2xl shadow-2xl border-white/20">
                            <CardHeader className="border-b border-border/50 pb-6 flex justify-between flex-row items-center">
                                <div>
                                    <CardTitle className="text-2xl font-heading">Stock Ledger History</CardTitle>
                                    <CardDescription>{historyProduct.name} ({historyProduct.sku})</CardDescription>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setIsHistoryModalOpen(false)}>✕</Button>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="max-h-96 overflow-y-auto pr-2">
                                    {isHistoryLoading ? (
                                        <div className="py-20 text-center text-slate-400 italic">Loading ledger...</div>
                                    ) : productHistory.length === 0 ? (
                                        <div className="py-20 text-center text-slate-400 italic">No movement recorded yet.</div>
                                    ) : (
                                        <table className="w-full text-left text-xs">
                                            <thead className="sticky top-0 bg-white border-b border-border/50 text-slate-400 font-bold uppercase tracking-widest z-10">
                                                <tr>
                                                    <th className="pb-3">Date & Time</th>
                                                    <th className="pb-3">Type</th>
                                                    <th className="pb-3 text-center">Qty</th>
                                                    <th className="pb-3 text-right">Unit Price</th>
                                                    <th className="pb-3 text-right">Reference</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/20">
                                                {productHistory.map((entry, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                        <td className="py-3 text-slate-500">
                                                            {new Date(entry.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                                                        </td>
                                                        <td className="py-3">
                                                            <span className={cn(
                                                                "px-2 py-0.5 rounded-md font-bold uppercase tracking-tight",
                                                                entry.type === 'RESTOCK' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                                                            )}>
                                                                {entry.type}
                                                            </span>
                                                        </td>
                                                        <td className={cn(
                                                            "py-3 text-center font-bold",
                                                            entry.quantity > 0 ? "text-emerald-600" : "text-blue-600"
                                                        )}>
                                                            {entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}
                                                        </td>
                                                        <td className="py-3 text-right font-medium">Rp {entry.price.toLocaleString()}</td>
                                                        <td className="py-3 text-right font-mono text-slate-400">{entry.invoice_number || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)}>Close Ledger</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Categories Management Modal */}
                {isCategoryModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral/80 backdrop-blur-sm p-4 animate-in">
                        <Card className="w-full max-w-md shadow-2xl border-white/20">
                            <CardHeader className="border-b border-border/50 pb-6 flex justify-between flex-row items-center">
                                <div>
                                    <CardTitle className="text-2xl font-heading">Categories</CardTitle>
                                    <CardDescription>Manage inventory categories.</CardDescription>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setIsCategoryModalOpen(false)}>✕</Button>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <form onSubmit={handleCreateCategory} className="flex gap-2 mb-6">
                                    <Input
                                        placeholder="New category name..."
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                    />
                                    <Button type="submit" variant="primary" disabled={isActionLoading || !newCategoryName.trim()}>Add</Button>
                                </form>
                                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                    {categories.map(cat => (
                                        <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                            <span className={cn("font-medium", cat.is_active === 0 ? "text-slate-400 line-through" : "text-neutral")}>
                                                {cat.name}
                                            </span>
                                            <Button
                                                variant={cat.is_active === 0 ? "primary" : "outline"}
                                                size="sm"
                                                className={cn("h-8 px-3 text-xs", cat.is_active === 0 ? "" : "text-red-500 border-red-200 hover:bg-red-50")}
                                                onClick={() => handleToggleCategory(cat.id)}
                                                disabled={isActionLoading}
                                            >
                                                {cat.is_active === 0 ? 'Enable' : 'Disable'}
                                            </Button>
                                        </div>
                                    ))}
                                    {categories.length === 0 && <p className="text-center text-sm text-slate-400 py-4">No categories created yet.</p>}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </DashboardLayout>
        </ProtectedRoute>
    );
}
