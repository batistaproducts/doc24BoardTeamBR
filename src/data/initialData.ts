import { User, RolePermissionsData, LockStatus, Atividade, Period, Versionamento } from '../types';

export const INITIAL_USERS: User[] = [
  {
    username: 'admin',
    name: 'Antônio Gonçalves Almeida Batista',
    role: 'Admin',
    password: 'admin123'
  },
  {
    username: 'analista',
    name: 'Carolina Ferreira Lima',
    role: 'Analista',
    password: 'analista123'
  },
  {
    username: 'convidado',
    name: 'Bruno Santoro',
    role: 'Convidado',
    password: 'convidado123'
  }
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
  {
    id: 'task-1',
    name: 'Migração de Servidores de Autenticação Doc24',
    jiraOrMovidesk: 'https://doc24.atlassian.net/browse/DOC24-1980',
    priority: 'P0',
    owner: 'Antônio Gonçalves Almeida Batista',
    status: 'Ag. Deploy',
    category: 'Funcional',
    startDate: '2026-07-01',
    endDate: '2026-07-20',
    description: 'Atualização e balanceamento da infraestrutura de login corporativa.',
    notes: '[02/07] Infraestrutura provisionada. [10/07] Testes de carga finalizados. [14/07] Homologado pelo QA, aguardando janela de deploy no final de semana.'
  },
  {
    id: 'task-2',
    name: 'Integração de Gateway de Pagamento Local',
    jiraOrMovidesk: 'https://doc24.atlassian.net/browse/DOC24-2104',
    priority: 'P1',
    owner: 'Carolina Ferreira Lima',
    status: 'Ag. Desenvolvimento',
    category: 'Suporte Integração',
    startDate: '2026-07-05',
    endDate: '', // empty to test fallback
    description: 'Implementação de PIX e boletos direto no fluxo de checkout.',
    notes: '[06/07] Documentação de API revisada. [12/07] Desenvolvimento do webhook com atraso devido à instabilidade do parceiro.'
  },
  {
    id: 'task-3',
    name: 'Correção de Vazamento de Memória no Dashboard',
    jiraOrMovidesk: '329104', // pure movidesk
    priority: 'P2',
    owner: 'Antônio Gonçalves Almeida Batista',
    status: 'Pendente',
    category: 'Funcional',
    startDate: '',
    endDate: '',
    description: 'Análise de heap do navegador para detecção de listeners não limpos nas abas de monitoramento.',
    notes: '[15/07] Identificado leak de memória no componente de gráficos dinâmicos.'
  },
  {
    id: 'task-4',
    name: 'Sincronização de Cadastro de Clientes CRM',
    jiraOrMovidesk: 'https://doc24.atlassian.net/browse/DOC24-1422',
    priority: 'P3',
    owner: 'Bruno Santoro',
    status: 'Finalizada',
    category: 'Suporte Integração',
    startDate: '2026-07-01',
    endDate: '2026-07-10',
    description: 'Script semanal para garantir consistência de e-mails nos sistemas internos.',
    notes: '[01/07] Script inicial criado. [05/07] Ajustes na paginação da API. [10/07] Sincronização rodou sem erros, concluído com sucesso.'
  },
  {
    id: 'task-5',
    name: 'Mapeamento de Rotas de API Parceiros',
    jiraOrMovidesk: '349012',
    priority: 'P1',
    owner: 'Carolina Ferreira Lima',
    status: 'Em Andamento',
    category: 'Suporte Integração',
    startDate: '2026-07-10',
    endDate: '2026-07-28',
    description: 'Levantamento técnico e documentação no Swagger para novos parceiros de saúde do Brasil.',
    notes: '[11/07] Reunião de kick-off com parceiro. [13/07] Definida estrutura de payload básica.'
  }
];

export const INITIAL_ATIVIDADES_062026: Atividade[] = [
  {
    id: 'task-old-1',
    name: 'Upgrade de Banco de Dados de Produção SQL',
    jiraOrMovidesk: 'https://doc24.atlassian.net/browse/DOC24-1800',
    priority: 'P0',
    owner: 'Antônio Gonçalves Almeida Batista',
    status: 'Finalizada',
    category: 'Funcional',
    startDate: '2026-06-01',
    endDate: '2026-06-15',
    description: 'Mudança de instância para otimização de queries lentas e adição de réplicas de leitura.',
    notes: '[01/06] Backup concluído com sucesso. [10/06] Executado em homologação sem erros. [15/06] Deploy realizado com sucesso no final de semana.'
  },
  {
    id: 'task-old-2',
    name: 'Implementação de Notificações via WhatsApp',
    jiraOrMovidesk: '298101',
    priority: 'P1',
    owner: 'Carolina Ferreira Lima',
    status: 'Finalizada',
    category: 'Suporte Integração',
    startDate: '2026-06-10',
    endDate: '2026-06-30',
    description: 'Envio de alertas de agendamento de consulta para médicos.',
    notes: '[11/06] Homologação de template aprovada pelo Meta. [20/06] Fluxo de disparo de mensagens desenvolvido. [30/06] Colocado em produção.'
  }
];

export const INITIAL_VERSIONAMENTO: Versionamento = {
  version: "V1.1.10",
  date: "2026-07-15",
  description: "Garantia de salvamento físico imediato no servidor (GitHub), remoção do bypass de cache local (isLocalOnlyMode) e sincronização contínua do banco de dados."
};

