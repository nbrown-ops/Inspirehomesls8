import { UserRole } from '@/types'

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  staff: 'Staff',
  social_worker: 'Social Worker',
  auditor: 'Auditor',
}

export const READ_ONLY_ROLES: UserRole[] = ['social_worker', 'auditor']

export const ADMIN_ROLES: UserRole[] = ['super_admin', 'manager']

export function canWrite(role: UserRole): boolean {
  return !READ_ONLY_ROLES.includes(role)
}

export function isAdmin(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role)
}

export function isSuperAdmin(role: UserRole): boolean {
  return role === 'super_admin'
}
