'use client';

import React, { useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Database, Plus, Trash2, Lock, EyeOff, Save } from 'lucide-react';
import { cn } from '@/utils/cn';

interface MetadataField {
    id: string;
    key: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'boolean';
    isEncrypted: boolean;
    isMasked: boolean;
}

export default function MetadataEditor() {
    const [customerFields, setCustomerFields] = useState<MetadataField[]>([
        { id: '1', key: 'tax_id', label: 'Tax ID (NPWP)', type: 'text', isEncrypted: true, isMasked: true },
        { id: '2', key: 'vessel_name', label: 'Vessel Name', type: 'text', isEncrypted: false, isMasked: false }
    ]);

    const [productFields, setProductFields] = useState<MetadataField[]>([
        { id: '3', key: 'viscosity', label: 'Viscosity (Oil)', type: 'text', isEncrypted: false, isMasked: false },
        { id: '4', key: 'thread_size', label: 'Thread Size', type: 'text', isEncrypted: false, isMasked: false }
    ]);

    const addField = (target: 'customer' | 'product') => {
        const newField: MetadataField = {
            id: Date.now().toString(),
            key: '',
            label: '',
            type: 'text',
            isEncrypted: false,
            isMasked: false
        };
        if (target === 'customer') {
            setCustomerFields([...customerFields, newField]);
        } else {
            setProductFields([...productFields, newField]);
        }
    };

    const updateField = (target: 'customer' | 'product', id: string, updates: Partial<MetadataField>) => {
        if (target === 'customer') {
            setCustomerFields(fields => fields.map(f => f.id === id ? { ...f, ...updates } : f));
        } else {
            setProductFields(fields => fields.map(f => f.id === id ? { ...f, ...updates } : f));
        }
    };

    const removeField = (target: 'customer' | 'product', id: string) => {
        if (target === 'customer') {
            setCustomerFields(fields => fields.filter(f => f.id !== id));
        } else {
            setProductFields(fields => fields.filter(f => f.id !== id));
        }
    };

    const renderFieldList = (fields: MetadataField[], target: 'customer' | 'product') => (
        <div className="space-y-4 mt-6">
            {fields.map((field) => (
                <div key={field.id} className="flex flex-col md:flex-row gap-4 p-4 rounded-xl border border-border bg-slate-50/50 items-start md:items-center">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                        <Input 
                            label="JSON Key" 
                            value={field.key} 
                            onChange={e => updateField(target, field.id, { key: e.target.value.toLowerCase().replace(/\s+/g, '_') })} 
                            placeholder="e.g. tax_id"
                        />
                        <Input 
                            label="Display Label" 
                            value={field.label} 
                            onChange={e => updateField(target, field.id, { label: e.target.value })} 
                            placeholder="e.g. Tax ID (NPWP)"
                        />
                        <div className="flex flex-col space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">Data Type</label>
                            <select 
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:border-primary outline-none transition-all text-sm"
                                value={field.type}
                                onChange={e => updateField(target, field.id, { type: e.target.value as any })}
                            >
                                <option value="text">Text</option>
                                <option value="number">Number</option>
                                <option value="date">Date</option>
                                <option value="boolean">Boolean</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 md:mt-6 w-full md:w-auto justify-between md:justify-end">
                        <div className="flex bg-white rounded-lg border border-border p-1">
                            <button
                                onClick={() => updateField(target, field.id, { isMasked: !field.isMasked })}
                                className={cn("px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors", field.isMasked ? "bg-amber-100 text-amber-700" : "text-slate-400 hover:text-slate-600")}
                                title="Mask in UI"
                            >
                                <EyeOff size={14} /> UI Mask
                            </button>
                            <button
                                onClick={() => updateField(target, field.id, { isEncrypted: !field.isEncrypted })}
                                className={cn("px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors", field.isEncrypted ? "bg-red-100 text-red-700" : "text-slate-400 hover:text-slate-600")}
                                title="Encrypt at Rest (AES-256)"
                            >
                                <Lock size={14} /> Encrypt
                            </button>
                        </div>
                        <Button variant="ghost" className="text-red-500 hover:bg-red-50 p-2" onClick={() => removeField(target, field.id)}>
                            <Trash2 size={16} />
                        </Button>
                    </div>
                </div>
            ))}
            <Button variant="outline" onClick={() => addField(target)} className="w-full border-dashed">
                <Plus size={16} className="mr-2" /> Add {target === 'customer' ? 'Customer' : 'Product'} Field
            </Button>
        </div>
    );

    return (
        <ProtectedRoute requireAdmin={true}>
            <DashboardLayout>
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                <Database className="h-8 w-8 text-primary" />
                                Master Metadata Editor
                            </h1>
                            <p className="text-slate-500 mt-1">Define custom JSON schema fields for Customers and Inventory with built-in data governance.</p>
                        </div>
                        <Button variant="primary" className="font-bold tracking-wide shadow-premium">
                            <Save size={16} className="mr-2" /> Save Schemas
                        </Button>
                    </div>

                    <Card className="shadow-premium border-0">
                        <CardHeader className="bg-slate-50/50 border-b border-border/40 pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                Customer Profile Schema
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-500 mt-4">These fields will appear in the CRM 360 view and POS customer creation modal.</p>
                            {renderFieldList(customerFields, 'customer')}
                        </CardContent>
                    </Card>

                    <Card className="shadow-premium border-0">
                        <CardHeader className="bg-slate-50/50 border-b border-border/40 pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                                Product / Inventory Schema
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-500 mt-4">These fields define dynamic attributes for attribute-based inventory entry.</p>
                            {renderFieldList(productFields, 'product')}
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
