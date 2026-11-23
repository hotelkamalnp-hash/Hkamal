import type { StaffRole } from '../src/types/hotel';

export const ALL_STAFF_ROLES: readonly StaffRole[] = [
  'super_admin',
  'admin',
  'hotel_manager',
  'restaurant_owner',
  'receptionist',
  'chef',
  'waiter',
  'housekeeping',
] as const;

export const ROLE_PERMISSIONS: Record<StaffRole, readonly string[]> = {
  super_admin: [
    'all_access',
    'manage_staff',
    'edit_cms',
    'modify_rates',
    'manage_bookings',
    'manage_rooms',
    'view_finances',
    'view_audit_logs',
    'supabase_sync',
    'manage_smtp',
  ],
  admin: [
    'edit_cms',
    'modify_rates',
    'manage_bookings',
    'manage_rooms',
    'view_finances',
    'manage_coupons',
    'process_checkin',
    'manage_smtp',
  ],
  hotel_manager: [
    'manage_bookings',
    'manage_rooms',
    'modify_rates',
    'process_checkin',
    'view_finances',
    'view_audit_logs',
  ],
  restaurant_owner: [
    'manage_restaurant_pos',
    'view_dining_revenue',
    'manage_menu_specials',
    'view_kot',
    'manage_inventory',
  ],
  receptionist: [
    'process_checkin',
    'manage_bookings',
    'view_availability',
    'assign_rooms',
    'print_bills',
  ],
  chef: [
    'view_dining_orders',
    'manage_menu_specials',
    'view_breakfast_counts',
  ],
  waiter: [
    'view_dining_orders',
    'room_service_dispatch',
    'view_guest_preferences',
  ],
  housekeeping: [
    'manage_rooms_cleanliness',
    'view_availability',
  ],
};

export function isValidStaffRole(value: unknown): value is StaffRole {
  return typeof value === 'string' && (ALL_STAFF_ROLES as readonly string[]).includes(value);
}

export function getPermissionsForRole(role: StaffRole): string[] {
  return [...(ROLE_PERMISSIONS[role] || ['view_availability'])];
}

export function hasRolePermission(role: StaffRole | 'guest' | null | undefined, permission: string): boolean {
  if (!role || role === 'guest') return false;
  if (role === 'super_admin') return true;
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes('all_access') || perms.includes(permission);
}
