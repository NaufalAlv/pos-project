'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import api from '@/utils/api';
import { ShoppingCart, Hammer, Sparkles, KeyRound, User } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/login', { username, password });
            const { token, role } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('role', role);

            router.push('/dashboard');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Invalid username or password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-secondary/20 blur-[120px] rounded-full" />
            
            <div className="max-w-md w-full px-6 relative z-10 animate-in">
                <div className="mb-10 text-center">
                    <div className="mx-auto h-16 w-16 gradient-primary rounded-2xl flex items-center justify-center shadow-premium transform -rotate-6 hover:rotate-0 transition-transform duration-300">
                        <ShoppingCart className="h-9 w-9 text-white" />
                    </div>
                </div>

                <Card variant="glass" className="border-white/10 shadow-2xl">
                    <CardHeader className="text-center pt-8">
                        <CardTitle className="text-3xl font-heading text-neutral">Welcome Back</CardTitle>
                        <CardDescription>
                            Sign in to manage your workshop operations
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="px-8 pb-10">
                        <form className="mt-6 space-y-5" onSubmit={handleLogin}>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Input
                                        id="username"
                                        name="username"
                                        type="text"
                                        label="Username"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="your_username"
                                        className="bg-white/50 border-slate-200/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        label="Password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="bg-white/50 border-slate-200/50"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50/50 backdrop-blur-sm border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs font-semibold animate-in">
                                    {error}
                                </div>
                            )}

                            <div className="pt-2">
                                <Button 
                                    type="submit" 
                                    className="w-full text-sm font-bold tracking-wide" 
                                    isLoading={isLoading}
                                    variant="primary"
                                    size="lg"
                                >
                                    Login to System
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <p className="mt-8 text-center text-sm text-slate-400 font-medium">
                    &copy; 2026 POS Bengkel System v1.0.0
                </p>
            </div>
        </div>
    );
}
