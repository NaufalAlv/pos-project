'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import api from '@/utils/api';
import { Plus, Search, Edit, Trash2, Package, Filter, MoreVertical } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Product {
    id: number;
    name: string;
    sku: string;
    stock: number;
    price: number;
    category_name?: string;
}

export default function InventoryPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [error, setError] = useState<string | null>(null);

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

    useEffect(() => {
        fetchProducts();
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
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
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        try {
            await api.delete(`/inventory/products/${id}`);
            fetchProducts();
        } catch (error) {
            console.error('Failed to delete product', error);
        }
    };

    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="space-y-8 animate-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-heading text-neutral">Inventory Management</h1>
                            <p className="text-slate-500 mt-1">Track and manage your workshop supplies and parts.</p>
                        </div>
                        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add New Product
                        </Button>
                    </div>

                    <Card shadow-premium>
                        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search products by name or SKU..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all outline-none text-sm"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="bg-white">
                                    <Filter className="mr-2 h-4 w-4" />
                                    Filter
                                </Button>
                                <Button variant="outline" size="sm" className="bg-white">
                                    Category
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border/50 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                            <th className="px-6 py-4">Product Details</th>
                                            <th className="px-6 py-4">Category</th>
                                            <th className="px-6 py-4">Stock Level</th>
                                            <th className="px-6 py-4">Selling Price</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {loading ? (
                                            <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Fetching inventory data...</td></tr>
                                        ) : products.length === 0 ? (
                                            <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No products in inventory.</td></tr>
                                        ) : (
                                            products.map((product) => (
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
                                                    <td className="px-6 py-4 font-bold text-neutral">Rp {product.price.toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end space-x-1">
                                                            <Button onClick={() => openEditModal(product)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-primary">
                                                                <Edit size={16} />
                                                            </Button>
                                                            <Button onClick={() => handleDelete(product.id)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-red-500">
                                                                <Trash2 size={16} />
                                                            </Button>
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
                                            value={formData.sku}
                                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                            placeholder="AUTO-GEN"
                                        />
                                        <Input
                                            label="Product Category"
                                            type="text"
                                            placeholder="Select Category"
                                            value={formData.category_id}
                                            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                        />
                                        <Input
                                            label="Current Stock"
                                            type="number"
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
                                    </div>

                                    <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-border/50">
                                        <Button type="button" variant="outline" onClick={closeModal} className="px-6">Cancel</Button>
                                        <Button type="submit" variant="primary" className="px-8 font-bold tracking-wide">
                                            {editingProduct ? 'Update Product' : 'Create Product'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </DashboardLayout>
        </ProtectedRoute>
    );
}
