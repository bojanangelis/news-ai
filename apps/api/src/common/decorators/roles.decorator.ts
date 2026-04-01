import { SetMetadata } from '@nestjs/common';

export type UserRole = 'SUPER_ADMIN' | 'EDITOR' | 'WRITER' | 'ANALYST' | 'READER';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
