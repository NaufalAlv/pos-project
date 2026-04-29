'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProtectedRoute({ children, requireAdmin }: { children: React.ReactNode, requireAdmin?: boolean }) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');

        if (!token) {
            router.push('/login');
        } else {
            setIsAuthenticated(true);
            if (requireAdmin && role !== 'admin') {
                setIsAuthorized(false);
                router.push('/dashboard'); // or a 403 page
            }
        }
    }, [router, requireAdmin]);

    if (!isAuthenticated) {
        return null; // Or a loading spinner
    }

    if (!isAuthorized) {
        return null; // Don't render content while redirecting
    }

    return <>{children}</>;
}
