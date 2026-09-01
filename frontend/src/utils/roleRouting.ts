import { RoleName } from '../types/auth';

export const ADMIN_ROLES: RoleName[] = ['system_admin', 'innovation_hub_admin', 'mentor'];

export const getRoleHome = (role: RoleName): '/admin' | '/dashboard' =>
  ADMIN_ROLES.includes(role) ? '/admin' : '/dashboard';
