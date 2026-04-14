import * as React from 'react';
import { cn } from '@/utils/cn';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'tertiary' | 'outline' | 'ghost' | 'danger' | 'glass';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
        const variants = {
            primary: 'bg-primary text-white hover:brightness-110 shadow-premium focus:ring-primary/50',
            secondary: 'bg-secondary text-white hover:brightness-110 focus:ring-secondary/50',
            tertiary: 'bg-tertiary text-white hover:brightness-110 focus:ring-tertiary/50',
            outline: 'border border-border bg-transparent hover:bg-slate-50 text-neutral',
            ghost: 'bg-transparent hover:bg-slate-100 text-neutral',
            danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
            glass: 'glass hover:bg-white/80 text-primary border-primary/10',
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-sm h-8',
            md: 'px-4 py-2 text-base h-10',
            lg: 'px-6 py-3 text-lg h-12',
        };

        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
                    variants[variant],
                    sizes[size],
                    className
                )}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
