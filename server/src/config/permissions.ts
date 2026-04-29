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

export const canUnmask = (field: string, role: UserRole): boolean => {
  return FIELD_VISIBILITY[field]?.includes(role) ?? false;
};
