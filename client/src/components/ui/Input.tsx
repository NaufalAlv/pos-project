import * as React from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, ...props }, ref) => {
        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label className="block text-sm font-medium text-neutral">
                        {label}
                    </label>
                )}
                <div className="relative group">
                    <input
                        ref={ref}
                        className={cn(
                            'block w-full rounded-xl border border-border bg-white px-4 py-2.5 text-neutral transition-all duration-200 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 sm:text-sm shadow-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 disabled:cursor-not-allowed',
                            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/10',
                            className
                        )}
                        {...props}
                    />
                </div>
                {error && <p className="text-xs font-medium text-red-600 animate-in">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';
