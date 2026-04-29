export type UserRole = 'admin' | 'cashier' | 'mechanic';

interface RoleStyle {
    label: string;
    colorClass: string;
    bgClass: string;
}

export const ROLE_MAP: Record<UserRole, RoleStyle> = {
    admin: {
        label: 'Administrator',
        colorClass: 'bg-rose-500',
        bgClass: 'bg-rose-50',
    },
    cashier: {
        label: 'Cashier Staff',
        colorClass: 'bg-emerald-500',
        bgClass: 'bg-emerald-50',
    },
    mechanic: {
        label: 'Workshop Mechanic',
        colorClass: 'bg-amber-500',
        bgClass: 'bg-amber-50',
    },
};