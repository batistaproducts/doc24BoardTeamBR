export type Role = 'Admin' | 'Analista' | 'Convidado';

export interface Permissions {
  tasks: ('create' | 'read' | 'update' | 'delete')[];
  periods: ('create' | 'read' | 'update')[];
  users: ('create' | 'read' | 'update' | 'delete')[];
  lock_control: ('bypass' | 'release')[];
}

export interface RoleDetail {
  description: string;
  permissions: Permissions;
}

export interface RolePermissionsData {
  roles: Record<Role, RoleDetail>;
}

export interface User {
  username: string;
  name: string;
  role: Role;
  password?: string;
}

export interface LockStatus {
  locked: boolean;
  lockedBy: string | null;
  lockedAt: string | null; // ISO String
  expiresAt: string | null; // ISO String
}

export interface Atividade {
  id: string;
  name: string; // Columna 1
  jiraOrMovidesk: string; // Link Jira ou ticket Movidesk
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  owner: string; // Proprietário
  status: string; // Estado
  category: 'Funcional' | 'Suporte Integração';
  startDate: string; // Fecha de inicio
  endDate: string; // Fecha de finalización
  description: string; // Descrição
  notes: string; // Anotações
}

export interface Period {
  id: string; // "MMYYYY" pattern e.g. "072026"
  label: string; // "MM/YYYY" pattern e.g. "07/2026"
}
