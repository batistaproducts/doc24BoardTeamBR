import { User, RolePermissionsData, LockStatus, Atividade, Period, Versionamento } from '../types';

export const INITIAL_USERS: User[] = [
  
];

export const INITIAL_ROLE_PERMISSIONS: RolePermissionsData = {
  roles: {
    Admin: {
      description: "Acesso total ao sistema, configuração de períodos e exclusão.",
      permissions: {
        tasks: ["create", "read", "update", "delete"],
        periods: ["create", "read", "update"],
        users: ["create", "read", "update", "delete"],
        lock_control: ["bypass", "release"]
      }
    },
    Analista: {
      description: "Pode operar as tarefas do dia a dia, sem permissão de exclusão.",
      permissions: {
        tasks: ["create", "read", "update"],
        periods: ["read"],
        users: ["read"],
        lock_control: []
      }
    },
    Convidado: {
      description: "Acesso estrito de leitura para auditoria e acompanhamento.",
      permissions: {
        tasks: ["read"],
        periods: ["read"],
        users: ["read"],
        lock_control: []
      }
    }
  }
};

export const INITIAL_LOCK_STATUS: LockStatus = {
  locked: false,
  lockedBy: null,
  lockedAt: null,
  expiresAt: null
};

export const INITIAL_PERIODS: Period[] = [
  { id: '072026', label: '07/2026' },
  { id: '062026', label: '06/2026' }
];

export const INITIAL_ATIVIDADES_072026: Atividade[] = [
  
];

export const INITIAL_ATIVIDADES_062026: Atividade[] = [
  
];

export const INITIAL_VERSIONAMENTO: Versionamento = {
  version: "1.0.0",
  date: "16/07/2026",
  description: "Versão inicial"
};

