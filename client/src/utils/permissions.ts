export type UserRole = 'admin' | 'manager' | 'cashier' | 'mechanic' | 'viewer';

export const FIELD_VISIBILITY: Record<string, UserRole[]> = {
  phone:           ['admin', 'manager', 'cashier'],
  phone_number:    ['admin', 'manager', 'cashier'],
  tax_id:          ['admin', 'manager'],
  bank_account:    ['admin'],
  date_of_birth:   ['admin', 'manager'],
  home_address:    ['admin', 'manager', 'cashier'],
  email:           ['admin', 'manager', 'cashier'],
};

export const canUnmask = (field: string, role: string): boolean => {
  return FIELD_VISIBILITY[field]?.includes(role as UserRole) ?? false;
};

export const getUserRole = (): string => {
    try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            return user.role || 'viewer';
        }
    } catch {
        return 'viewer';
    }
    return 'viewer';
};
