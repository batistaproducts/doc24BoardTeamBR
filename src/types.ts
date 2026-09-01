export type Role = 'Admin' | 'Analista' | 'Convidado';

export interface Permissions {
  tasks: ('create' | 'read' | 'update' | 'delete')[];
  periods: ('create' | 'read' | 'update')[];
  users: ('create' | 'read' | 'update' | 'delete')[];
  lock_control: ('bypass' | 'release')[];
  planning_refinement?: ('create' | 'read' | 'update' | 'delete')[];
  pocketknife_tools?: string[];
  status_report?: ('create' | 'read' | 'export' | string)[];
}

export interface PersonalTask {
  id: string;
  ownerUsername: string;
  title: string;
  description?: string;
  status: 'Pendente' | 'Em Andamento' | 'Concluída';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  createdAt: string;
  updatedAt?: string;
  dueDate?: string;
}

export interface TimerPreset {
  id: string;
  name: string;
  durationMinutes: number;
  category: 'Reunião' | 'Foco' | 'Intervalo' | 'Geral';
  description?: string;
  soundAlert?: boolean;
  color?: string;
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
  movidesk?: string; // Link ou Ticket Movidesk
  Movidesk?: string; // Link ou Ticket Movidesk
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  owner: string; // Proprietário
  status: string; // Estado
  category: string; // Classificação (Funcional, Suporte a integração, Suporte L2, etc)
  componente?: string; // Componente (Front-End, Back-End, Mobile, Design, etc)
  versao?: string; // Versão de deploy atribuída
  startDate: string; // Fecha de inicio
  endDate: string; // Fecha de finalización
  description: string; // Descrição
  notes: string; // Anotações
}

export interface Period {
  id: string; // "MMYYYY" pattern e.g. "072026"
  label: string; // "MM/YYYY" pattern e.g. "07/2026"
}

export interface Versionamento {
  version: string;
  date: string;
  description: string;
}

export interface ParameterItem {
  id: string;
  label: string;
  color: string;
}

export interface AppParameters {
  statuses: ParameterItem[];
  priorities: ParameterItem[];
  classifications: ParameterItem[];
  components?: ParameterItem[];
  goals?: Goal[];
}

export interface Goal {
  meta: string;
  alvo: string; // e.g. "70%"
  referencia: string; // e.g. "Finalizado,Concluído"
  type?: 'A' | 'L' | string; // "A" para Acima, "L" para Limite
}

export interface RefinementItem {
  id: string;
  atividade: string;
  jiraTicket: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  componente: 'Back-End' | 'Front-End' | 'Mobile';
  estado: 'Pendente' | 'Impedido' | 'Refinado' | 'Tajer';
  storyPoint: number | string;
  periodId: string;
  owner?: string;
  versao?: string;
}

export interface PlanningItem {
  id: string;
  atividade: string;
  jiraTicket: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  componente: 'Back-End' | 'Front-End' | 'Mobile';
  estado: string;
  storyPoint: number | string;
  periodId: string;
  owner?: string;
  versao?: string;
}

export interface FeriasDayOffItem {
  id: string;
  colaborador: string;
  tipo: 'Férias' | 'DayOff' | string;
  dataInicio: string; // YYYY-MM-DD
  dataFim: string; // YYYY-MM-DD
  observacao?: string;
  status?: 'Confirmado' | 'Ag. Aprovação' | 'Cancelado' | string;
}

export interface AusenciaTemporariaItem {
  id: string;
  colaborador: string;
  motivo: string; // e.g., "Consulta Médica", "Treinamento", "Atestado", "Compromisso Pessoal"
  data: string; // YYYY-MM-DD
  horarioInicio?: string; // e.g. "09:00"
  horarioFim?: string; // e.g. "12:00"
  observacao?: string;
}

export interface DeployItem {
  id: string;
  data: string; // YYYY-MM-DD
  versao: string; // Texto livre (versão corretora)
  componente: string; // Lista de componentes
  link?: string; // Link externo
  relatedTasks?: {
    id: string;
    name: string;
    type: 'board' | 'planning' | 'refinement';
    jiraOrMovidesk?: string;
  }[];
}

export interface DatasAvisosData {
  feriasDayOffs: FeriasDayOffItem[];
  ausenciasTemporarias: AusenciaTemporariaItem[];
  deploys: DeployItem[];
}

