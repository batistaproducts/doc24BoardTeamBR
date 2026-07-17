import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ExternalLink,
  Tag,
  Clock,
  Calendar,
  AlertTriangle,
  User as UserIcon,
  HelpCircle,
  FileText,
  Copy,
  Info,
  RefreshCw,
  Unlock
} from 'lucide-react';
import { Atividade, Period, User, Permissions, LockStatus } from '../types';
import {
  getAtividadesForPeriod,
  saveAtividadesForPeriod,
  getPeriods,
  getLastDatedNote,
  getRolePermissions
} from '../lib/dataStore';

interface BoardProps {
  currentUser: User;
  isEditModeActive: boolean;
  onAtividadesChange?: () => void;
  // Triggered when an edit occurs to notify App.tsx
  onActivityEditTrigger?: () => void;
  refreshTrigger?: number;
  onManualRefresh?: () => Promise<void>;
  lockStatus: LockStatus;
  onCheckLockStatus: () => Promise<void>;
}

export default function Board({
  currentUser,
  isEditModeActive,
  onAtividadesChange,
  onActivityEditTrigger,
  refreshTrigger,
  onManualRefresh,
  lockStatus,
  onCheckLockStatus
}: BoardProps) {
  // Check if the lock is currently active on GitHub/local cache
  const isLockPhysicallyActive = (() => {
    if (!lockStatus.locked) return false;
    if (lockStatus.expiresAt) {
      const expiresTime = new Date(lockStatus.expiresAt).getTime();
      if (Date.now() > expiresTime) {
        return false; // lock has expired
      }
    }
    return true;
  })();

  const isLockedBySomeoneElse = isLockPhysicallyActive && lockStatus.lockedBy !== currentUser?.username;

  // Periods
  const [periods, setPeriods] = useState<Period[]>([]);
  const [activePeriodId, setActivePeriodId] = useState<string>('');

  // Refresh status
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (onManualRefresh) {
        await onManualRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // GitHub Lock checking status
  const [isCheckingLock, setIsCheckingLock] = useState(false);

  const handleCheckLockClick = async () => {
    if (isCheckingLock) return;
    setIsCheckingLock(true);
    try {
      await onCheckLockStatus();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingLock(false);
    }
  };

  // Activities for the active period
  const [atividades, setAtividades] = useState<Atividade[]>([]);

  // Filtering & Sorting State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOwner, setFilterOwner] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterPriority, setFilterPriority] = useState('Todos');
  const [filterCategory, setFilterCategory] = useState('Todos');
  const [sortByColumn, setSortByColumn] = useState<keyof Atividade>('priority');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Inline editing cell state: { taskId, field }
  const [editingCell, setEditingCell] = useState<{ taskId: string; field: keyof Atividade } | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>('');

  // Modal State for task creation
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Atividade>>({
    name: '',
    jiraOrMovidesk: '',
    priority: 'P2',
    owner: '',
    status: 'Pendente',
    category: 'Funcional',
    startDate: '',
    endDate: '',
    description: '',
    notes: ''
  });

  // Modal State for viewing full history of notes
  const [selectedNotesTask, setSelectedNotesTask] = useState<Atividade | null>(null);

  // Load permissions
  const permissionsData = getRolePermissions();
  const userPermissions = permissionsData.roles[currentUser.role]?.permissions;

  // Initial Load & refresh periods
  useEffect(() => {
    const loadedPeriods = getPeriods();
    setPeriods(loadedPeriods);
    if (loadedPeriods.length > 0 && !activePeriodId) {
      // Newest period first by default (pre-sorted in getPeriods)
      setActivePeriodId(loadedPeriods[0].id);
    }
  }, [refreshTrigger]);

  // Load activities when active period changes or refresh occurs
  useEffect(() => {
    if (activePeriodId) {
      const tasks = getAtividadesForPeriod(activePeriodId);
      if (!editingCell) {
        setAtividades(tasks);
      }
    }
  }, [activePeriodId, refreshTrigger, editingCell]);

  // Save activities to localStorage
  const saveTasks = (updatedTasks: Atividade[]) => {
    setAtividades(updatedTasks);
    saveAtividadesForPeriod(activePeriodId, updatedTasks);
    if (onAtividadesChange) onAtividadesChange();
  };

  // Create Task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditModeActive) {
      alert('Por favor, ative a chave "Modo de Edição" no topo da tela para fazer alterações.');
      return;
    }
    if (!newTask.name || !newTask.owner) {
      alert('Nome da atividade e Proprietário são obrigatórios!');
      return;
    }

    const created: Atividade = {
      id: `task-${activePeriodId}-${Date.now()}`,
      name: newTask.name || '',
      jiraOrMovidesk: newTask.jiraOrMovidesk || '',
      priority: (newTask.priority as 'P0' | 'P1' | 'P2' | 'P3') || 'P2',
      owner: newTask.owner || '',
      status: newTask.status || 'Pendente',
      category: (newTask.category as 'Funcional' | 'Suporte Integração') || 'Funcional',
      startDate: newTask.startDate || '',
      endDate: newTask.endDate || '',
      description: newTask.description || '',
      notes: newTask.notes || ''
    };

    const updated = [...atividades, created];
    saveTasks(updated);
    setIsCreateModalOpen(false);
    // Reset form
    setNewTask({
      name: '',
      jiraOrMovidesk: '',
      priority: 'P2',
      owner: '',
      status: 'Pendente',
      category: 'Funcional',
      startDate: '',
      endDate: '',
      description: '',
      notes: ''
    });
  };

  // Delete Task
  const handleDeleteTask = (id: string) => {
    if (!isEditModeActive) {
      alert('Por favor, ative a chave "Modo de Edição" no topo da tela para fazer alterações.');
      return;
    }
    if (!userPermissions?.tasks.includes('delete')) {
      alert('Seu perfil não tem permissão para excluir atividades.');
      return;
    }
    if (window.confirm('Tem certeza de que deseja excluir esta atividade? Esta ação não pode ser desfeita.')) {
      const updated = atividades.filter(t => t.id !== id);
      saveTasks(updated);
    }
  };

  // Start Inline Editing for a specific cell
  const startInlineEdit = (task: Atividade, field: keyof Atividade) => {
    if (!isEditModeActive) {
      alert('Por favor, ative a chave "Modo de Edição" no topo da tela para alterar valores.');
      return;
    }
    if (!userPermissions?.tasks.includes('update')) {
      alert('Seu perfil não tem permissão para atualizar atividades.');
      return;
    }

    setEditingCell({ taskId: task.id, field });
    setInlineEditValue(task[field] as string);
    if (onActivityEditTrigger) {
      onActivityEditTrigger(); // Reset user activity/lock timer
    }
  };

  // Save Inline Editing
  const saveInlineEdit = (taskId: string, field: keyof Atividade) => {
    const updated = atividades.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          [field]: inlineEditValue
        };
      }
      return task;
    });

    saveTasks(updated);
    setEditingCell(null);
    setInlineEditValue('');
  };

  // Copy Ticket ID or Url helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para a área de transferência!');
  };

  // Get list of unique values for dropdown filters
  const uniqueOwners = Array.from(new Set(atividades.map(t => t.owner).filter(Boolean)));
  const uniqueStatuses = Array.from(new Set(atividades.map(t => t.status).filter(Boolean)));

  // Filter & Sort core logic
  const filteredAtividades = atividades
    .filter(task => {
      // 1. Keyword search (Name, owner partial search, description, notes, jiraOrMovidesk)
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        task.name.toLowerCase().includes(term) ||
        task.owner.toLowerCase().includes(term) ||
        task.description.toLowerCase().includes(term) ||
        task.notes.toLowerCase().includes(term) ||
        task.jiraOrMovidesk.toLowerCase().includes(term);

      // 2. Owner filter with partial capability
      let matchesOwner = true;
      if (filterOwner !== 'Todos') {
        matchesOwner = task.owner.toLowerCase().includes(filterOwner.toLowerCase());
      }

      // 3. Status filter
      const matchesStatus = filterStatus === 'Todos' || task.status === filterStatus;

      // 4. Priority filter
      const matchesPriority = filterPriority === 'Todos' || task.priority === filterPriority;

      // 5. Category filter
      const matchesCategory = filterCategory === 'Todos' || task.category === filterCategory;

      return matchesSearch && matchesOwner && matchesStatus && matchesPriority && matchesCategory;
    })
    .sort((a, b) => {
      // Sort logic helper
      let valueA = a[sortByColumn] || '';
      let valueB = b[sortByColumn] || '';

      // Priority sort (P0 > P1 > P2 > P3)
      if (sortByColumn === 'priority') {
        const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
        const orderA = priorityOrder[a.priority] !== undefined ? priorityOrder[a.priority] : 99;
        const orderB = priorityOrder[b.priority] !== undefined ? priorityOrder[b.priority] : 99;
        return sortDirection === 'asc' ? orderA - orderB : orderB - orderA;
      }

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDirection === 'asc'
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }

      return 0;
    });

  const handleSortClick = (column: keyof Atividade) => {
    if (sortByColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortByColumn(column);
      setSortDirection('asc');
    }
  };

  // Render a cell inline input or output
  const renderCellContent = (task: Atividade, field: keyof Atividade, type: 'text' | 'select' | 'textarea' | 'date', options?: string[]) => {
    const isEditing = editingCell?.taskId === task.id && editingCell?.field === field;

    if (isEditing) {
      return (
        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
          {type === 'select' && options ? (
            <select
              value={inlineEditValue}
              onChange={(e) => setInlineEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveInlineEdit(task.id, field);
                } else if (e.key === 'Escape') {
                  setEditingCell(null);
                }
              }}
              className="px-2 py-1 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-white text-slate-900"
              autoFocus
            >
              {options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : type === 'textarea' ? (
            <textarea
              value={inlineEditValue}
              onChange={(e) => setInlineEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  saveInlineEdit(task.id, field);
                } else if (e.key === 'Escape') {
                  setEditingCell(null);
                }
              }}
              className="px-2 py-1 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-white text-slate-900 min-w-[200px]"
              rows={3}
              autoFocus
            />
          ) : type === 'date' ? (
            <input
              type="date"
              value={inlineEditValue}
              onChange={(e) => setInlineEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveInlineEdit(task.id, field);
                } else if (e.key === 'Escape') {
                  setEditingCell(null);
                }
              }}
              className="px-2 py-1 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-white text-slate-900"
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={inlineEditValue}
              onChange={(e) => setInlineEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveInlineEdit(task.id, field);
                } else if (e.key === 'Escape') {
                  setEditingCell(null);
                }
              }}
              className="px-2 py-1 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-white text-slate-900 w-full"
              autoFocus
            />
          )}

          <div className="flex flex-col space-y-0.5">
            <button
              onClick={() => saveInlineEdit(task.id, field)}
              className="p-0.5 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors cursor-pointer"
              title="Salvar"
            >
              <Check className="h-3 w-3" />
            </button>
            <button
              onClick={() => setEditingCell(null)}
              className="p-0.5 rounded-md bg-red-100 hover:bg-red-200 text-red-800 transition-colors cursor-pointer"
              title="Cancelar"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      );
    }

    // Default viewing state
    const rawValue = task[field] as string;

    return (
      <div className="group relative flex items-center justify-between min-h-[30px] pr-4">
        <span className="text-slate-800 text-sm break-words leading-relaxed">
          {field === 'startDate' || field === 'endDate' ? (
            rawValue ? (
              <span className="flex items-center space-x-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>{rawValue.split('-').reverse().join('/')}</span>
              </span>
            ) : (
              <span className="text-slate-400 italic text-xs">não há registro/data definida</span>
            )
          ) : (
            rawValue || <span className="text-slate-300 italic text-xs">Vazio</span>
          )}
        </span>

        {/* Edit pencil icon visible on hover if Lock is active and user has permission */}
        {isEditModeActive && userPermissions?.tasks.includes('update') && (
          <button
            onClick={() => startInlineEdit(task, field)}
            className="opacity-0 group-hover:opacity-100 absolute right-0 p-1 text-slate-400 hover:text-[#343180] hover:bg-slate-100 rounded-md transition-all cursor-pointer"
            title="Editar campo"
          >
            <Edit2 className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6" id="board-component-root">
      {/* Period Tabs Row */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-2 shadow-xs flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
            Períodos:
          </span>
          {periods.map(period => (
            <button
              key={period.id}
              onClick={() => setActivePeriodId(period.id)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                activePeriodId === period.id
                  ? 'bg-[#343180] text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center space-x-2">
          {/* Manual Refresh Button */}
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className={`flex items-center space-x-1.5 px-4 py-2 font-semibold text-sm rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer border ${
              isRefreshing
                ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-[#343180] hover:border-[#343180]/40'
            }`}
            id="btn-refresh-data"
            title="Sincronizar com os arquivos do servidor (GitHub)"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Sincronizando...' : 'Atualizar'}</span>
          </button>

          {/* Check GitHub Lock Status Button (Shown when the board is locked by someone else / edit mode button is blocked) */}
          {isLockedBySomeoneElse && (
            <button
              onClick={handleCheckLockClick}
              disabled={isCheckingLock}
              className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg border text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 transition-all cursor-pointer shadow-xs hover:shadow-sm`}
              title="Buscar status de bloqueio no GitHub (Verificar se foi liberado para editar)"
              id="btn-check-lock-github"
            >
              <Unlock className={`h-3.5 w-3.5 ${isCheckingLock ? 'animate-spin' : ''}`} />
              <span>{isCheckingLock ? 'Verificando...' : 'Verificar Desbloqueio'}</span>
            </button>
          )}

          {/* Create Task Button */}
          {userPermissions?.tasks.includes('create') && (
            <button
              onClick={() => {
                if (!isEditModeActive) {
                  alert('Por favor, ative a chave "Modo de Edição" no topo da tela para fazer alterações.');
                  return;
                }
                setIsCreateModalOpen(true);
              }}
              className={`flex items-center space-x-1.5 px-4 py-2 font-semibold text-sm rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer ${
                isEditModeActive
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
              id="btn-create-task"
            >
              <Plus className="h-4 w-4" />
              <span>Adicionar Atividade</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter Box */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
          <Search className="h-5 w-5 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800">Filtros e Busca de Atividades</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Keyword Search */}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Busca por Palavra-Chave
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
              placeholder="Nome, ID, descrição, notas..."
            />
          </div>

          {/* Owner Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Proprietário
            </label>
            <select
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
            >
              <option value="Todos">Todos</option>
              {uniqueOwners.map(owner => (
                <option key={owner} value={owner}>{owner}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Estado / Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
            >
              <option value="Todos">Todos</option>
              {uniqueStatuses.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Prioridade
            </label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
            >
              <option value="Todos">Todos</option>
              <option value="P0">P0 (Crítico)</option>
              <option value="P1">P1 (Alto)</option>
              <option value="P2">P2 (Médio)</option>
              <option value="P3">P3 (Baixo)</option>
            </select>
          </div>
        </div>

        {/* Quick Clear Filter Button */}
        {(searchTerm || filterOwner !== 'Todos' || filterStatus !== 'Todos' || filterPriority !== 'Todos') && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterOwner('Todos');
                setFilterStatus('Todos');
                setFilterPriority('Todos');
                setFilterCategory('Todos');
              }}
              className="text-xs font-semibold text-slate-500 hover:text-[#343180] transition-colors cursor-pointer"
            >
              Limpar Todos os Filtros
            </button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto table-container">
          <table className="w-full border-collapse text-left text-sm" id="activities-board-table">
            <thead className="bg-slate-50/75 border-b border-slate-200">
              <tr>
                {/* Columns headers with sorting option */}
                <th
                  onClick={() => handleSortClick('name')}
                  className="px-6 py-4 font-bold text-slate-700 select-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Atividade / Tarefa</span>
                    <span className="text-slate-400">
                      {sortByColumn === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>

                <th
                  onClick={() => handleSortClick('jiraOrMovidesk')}
                  className="px-4 py-4 font-bold text-slate-700 select-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Ticket ID / Link</span>
                    <span className="text-slate-400">
                      {sortByColumn === 'jiraOrMovidesk' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>

                <th
                  onClick={() => handleSortClick('priority')}
                  className="px-4 py-4 font-bold text-slate-700 select-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Prioridade</span>
                    <span className="text-slate-400">
                      {sortByColumn === 'priority' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>

                <th
                  onClick={() => handleSortClick('owner')}
                  className="px-4 py-4 font-bold text-slate-700 select-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Proprietário</span>
                    <span className="text-slate-400">
                      {sortByColumn === 'owner' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>

                <th
                  onClick={() => handleSortClick('status')}
                  className="px-4 py-4 font-bold text-slate-700 select-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Estado</span>
                    <span className="text-slate-400">
                      {sortByColumn === 'status' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>

                <th
                  onClick={() => handleSortClick('category')}
                  className="px-4 py-4 font-bold text-slate-700 select-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Categoria</span>
                    <span className="text-slate-400">
                      {sortByColumn === 'category' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>

                <th className="px-4 py-4 font-bold text-slate-700">Datas (Início / Fim)</th>

                {/* Critical column */}
                <th className="px-6 py-4 font-bold text-slate-700 w-[240px]">Último Progresso / Anotação</th>

                <th className="px-4 py-4 font-bold text-slate-700 text-right">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredAtividades.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 italic">
                    Nenhuma atividade encontrada para os filtros aplicados neste período.
                  </td>
                </tr>
              ) : (
                filteredAtividades.map((task) => {
                  const parsedNote = getLastDatedNote(task.notes);

                  // Priority style maps
                  const priorityStyles = {
                    P0: 'bg-red-100 text-red-700 border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-full',
                    P1: 'bg-orange-100 text-orange-700 border-orange-200 text-[10px] font-bold px-2 py-0.5 rounded-full',
                    P2: 'bg-blue-100 text-blue-700 border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full',
                    P3: 'bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full'
                  };

                  const getPriorityLabel = (priority: string) => {
                    if (priority === 'P0') return 'P0 - Crítico';
                    if (priority === 'P1') return 'P1 - Alta';
                    if (priority === 'P2') return 'P2 - Média';
                    if (priority === 'P3') return 'P3 - Baixo';
                    return priority;
                  };

                  const getStatusDotColor = (status: string) => {
                    const s = status.toLowerCase();
                    if (s.includes('finaliz') || s.includes('concl')) return 'bg-emerald-500';
                    if (s.includes('deploy')) return 'bg-yellow-400';
                    if (s.includes('desenvolv') || s.includes('andamento')) return 'bg-blue-400';
                    if (s.includes('teste')) return 'bg-purple-500';
                    return 'bg-slate-300';
                  };

                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-slate-50/50 transition-colors group/row"
                    >
                      {/* Name Cell */}
                      <td className="px-6 py-4 font-medium max-w-[200px]">
                        {renderCellContent(task, 'name', 'text')}
                      </td>

                      {/* Ticket Link or Badge Cell */}
                      <td className="px-4 py-4">
                        {editingCell?.taskId === task.id && editingCell?.field === 'jiraOrMovidesk' ? (
                          renderCellContent(task, 'jiraOrMovidesk', 'text')
                        ) : (
                          <div className="flex items-center space-x-1.5">
                            {task.jiraOrMovidesk ? (
                              task.jiraOrMovidesk.startsWith('http') ? (
                                <a
                                  href={task.jiraOrMovidesk}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center space-x-1 text-xs font-semibold text-[#343180] hover:underline"
                                >
                                  <span>JIRA</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <div className="flex items-center space-x-1">
                                  <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700">
                                    Movidesk #{task.jiraOrMovidesk}
                                  </span>
                                  <button
                                    onClick={() => handleCopy(task.jiraOrMovidesk)}
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                                    title="Copiar Número do Ticket"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </div>
                              )
                            ) : (
                              <span className="text-slate-400 italic text-xs">Nenhum</span>
                            )}

                            {/* Edit Pencil icon */}
                            {isEditModeActive && userPermissions?.tasks.includes('update') && (
                              <button
                                onClick={() => startInlineEdit(task, 'jiraOrMovidesk')}
                                className="opacity-0 group-hover/row:opacity-100 p-1 text-slate-400 hover:text-[#343180] rounded transition-all cursor-pointer"
                                title="Editar Ticket"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Priority Cell */}
                      <td className="px-4 py-4">
                        {editingCell?.taskId === task.id && editingCell?.field === 'priority' ? (
                          renderCellContent(task, 'priority', 'select', ['P0', 'P1', 'P2', 'P3'])
                        ) : (
                          <div className="flex items-center space-x-1.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${priorityStyles[task.priority] || 'bg-slate-50 text-slate-700'}`}>
                              {getPriorityLabel(task.priority)}
                            </span>

                            {isEditModeActive && userPermissions?.tasks.includes('update') && (
                              <button
                                onClick={() => startInlineEdit(task, 'priority')}
                                className="opacity-0 group-hover/row:opacity-100 p-1 text-slate-400 hover:text-[#343180] rounded transition-all cursor-pointer"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Owner Cell */}
                      <td className="px-4 py-4 max-w-[160px]">
                        {renderCellContent(task, 'owner', 'text')}
                      </td>

                      {/* Status/Estado Cell */}
                      <td className="px-4 py-4">
                        {editingCell?.taskId === task.id && editingCell?.field === 'status' ? (
                          renderCellContent(task, 'status', 'select', [
                            'Pendente',
                            'Em Desenvolvimento',
                            'Ag. Desenvolvimento',
                            'Em Teste',
                            'Ag. Deploy',
                            'Finalizada'
                          ])
                        ) : (
                          <div className="flex items-center space-x-1.5">
                            <span className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${getStatusDotColor(task.status)}`}></span>
                              <span className="font-medium text-slate-800 text-xs">{task.status}</span>
                            </span>

                            {isEditModeActive && userPermissions?.tasks.includes('update') && (
                              <button
                                onClick={() => startInlineEdit(task, 'status')}
                                className="opacity-0 group-hover/row:opacity-100 p-1 text-slate-400 hover:text-[#343180] rounded transition-all cursor-pointer"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Category Cell */}
                      <td className="px-4 py-4">
                        {editingCell?.taskId === task.id && editingCell?.field === 'category' ? (
                          renderCellContent(task, 'category', 'select', ['Funcional', 'Suporte Integração'])
                        ) : (
                          <div className="flex items-center space-x-1.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                              task.category === 'Funcional'
                                ? 'bg-slate-100 border-slate-200 text-slate-700'
                                : 'bg-sky-100 border-sky-200 text-sky-800'
                            }`}>
                              {task.category}
                            </span>

                            {isEditModeActive && userPermissions?.tasks.includes('update') && (
                              <button
                                onClick={() => startInlineEdit(task, 'category')}
                                className="opacity-0 group-hover/row:opacity-100 p-1 text-slate-400 hover:text-[#343180] rounded transition-all cursor-pointer"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Date Range Cells */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="text-[11px] text-slate-500">
                            Início: {renderCellContent(task, 'startDate', 'date')}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Fim: {renderCellContent(task, 'endDate', 'date')}
                          </div>
                        </div>
                      </td>

                      {/* Critical column: Last dated progress */}
                      <td className="px-6 py-4 max-w-[240px]">
                        {editingCell?.taskId === task.id && editingCell?.field === 'notes' ? (
                          renderCellContent(task, 'notes', 'textarea')
                        ) : (
                          <div className="space-y-1.5">
                            {parsedNote.date ? (
                              <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-lg p-2 hover:bg-[#fef3c7]/60 transition-colors">
                                <div className="flex items-center justify-between text-[10px] font-bold text-amber-800 uppercase tracking-wide mb-1">
                                  <span>Progresso ({parsedNote.date})</span>
                                  <span className="bg-amber-100 px-1 py-0.2 rounded font-mono text-[9px] text-amber-700">Mais Recente</span>
                                </div>
                                <p className="text-xs text-amber-900 line-clamp-3 leading-relaxed">
                                  {parsedNote.content}
                                </p>
                              </div>
                            ) : (
                              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-500 italic">
                                {parsedNote.content}
                              </div>
                            )}

                            {/* Note counter / view historical trigger */}
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => setSelectedNotesTask(task)}
                                className="inline-flex items-center text-[10px] text-[#343180] hover:text-[#2c2a6d] font-bold hover:underline transition-colors"
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                Ver histórico completo ({parsedNote.count})
                              </button>

                              {isEditModeActive && userPermissions?.tasks.includes('update') && (
                                <button
                                  onClick={() => startInlineEdit(task, 'notes')}
                                  className="opacity-0 group-hover/row:opacity-100 p-0.5 text-slate-400 hover:text-[#343180] rounded transition-all cursor-pointer"
                                  title="Adicionar anotação"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Actions (Delete only) */}
                      <td className="px-4 py-4 text-right">
                        {userPermissions?.tasks.includes('delete') ? (
                          <button
                            onClick={() => {
                              if (!isEditModeActive) {
                                alert('Por favor, ative a chave "Modo de Edição" no topo da tela para fazer alterações.');
                                return;
                              }
                              handleDeleteTask(task.id);
                            }}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isEditModeActive
                                ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                : 'text-slate-200 cursor-not-allowed'
                            }`}
                            title={isEditModeActive ? "Excluir Atividade" : "Ative o Modo de Edição para excluir"}
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        ) : (
                          <span className="text-slate-300 italic text-xs">Sem ações</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 shadow-xl rounded-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#343180] px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-semibold text-lg font-display">Adicionar Atividade no Período</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nome Principal da Atividade / Tarefa *
                </label>
                <input
                  type="text"
                  required
                  value={newTask.name}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] bg-slate-50/50"
                  placeholder="Ex: Correção de BUG crítico no Login"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    JIRA URL ou ID Movidesk
                  </label>
                  <input
                    type="text"
                    value={newTask.jiraOrMovidesk}
                    onChange={(e) => setNewTask({ ...newTask, jiraOrMovidesk: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] bg-slate-50/50"
                    placeholder="Ex: https://... ou 329104"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Prioridade
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] bg-slate-50/50"
                  >
                    <option value="P0">P0 (Crítico)</option>
                    <option value="P1">P1 (Alto)</option>
                    <option value="P2">P2 (Médio)</option>
                    <option value="P3">P3 (Baixo)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Proprietário *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTask.owner}
                    onChange={(e) => setNewTask({ ...newTask, owner: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] bg-slate-50/50"
                    placeholder="Ex: Antônio Gonçalves"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Estado / Status
                  </label>
                  <select
                    value={newTask.status}
                    onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] bg-slate-50/50"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Em Desenvolvimento">Em Desenvolvimento</option>
                    <option value="Ag. Desenvolvimento">Ag. Desenvolvimento</option>
                    <option value="Em Teste">Em Teste</option>
                    <option value="Ag. Deploy">Ag. Deploy</option>
                    <option value="Finalizada">Finalizada</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Categoria
                  </label>
                  <select
                    value={newTask.category}
                    onChange={(e) => setNewTask({ ...newTask, category: e.target.value as any })}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] bg-slate-50/50"
                  >
                    <option value="Funcional">Funcional</option>
                    <option value="Suporte Integração">Suporte Integração</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Data Início
                    </label>
                    <input
                      type="date"
                      value={newTask.startDate}
                      onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Data Fim
                    </label>
                    <input
                      type="date"
                      value={newTask.endDate}
                      onChange={(e) => setNewTask({ ...newTask, endDate: e.target.value })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] bg-slate-50/50"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Descrição Simplificada
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] bg-slate-50/50"
                  placeholder="Ex: Levantamento técnico dos gargalos de performance..."
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Anotações Datadas (Progresso / Histórico)
                </label>
                <textarea
                  value={newTask.notes}
                  onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] bg-slate-50/50"
                  placeholder="Ex: [15/07] Servidor configurado por Antônio. [16/07] Integração em andamento."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-xs hover:shadow-md cursor-pointer"
                >
                  Criar Atividade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Historical Notes Modal */}
      {selectedNotesTask && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 shadow-xl rounded-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#343180] px-6 py-4 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <h3 className="font-semibold text-base font-display">Histórico de Progresso</h3>
              </div>
              <button onClick={() => setSelectedNotesTask(null)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Atividade</span>
                <h4 className="text-sm font-bold text-slate-900">{selectedNotesTask.name}</h4>
                <p className="text-xs text-slate-500 mt-1">{selectedNotesTask.description || 'Sem descrição adicional'}</p>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">Histórico Detalhado</span>
                {selectedNotesTask.notes ? (
                  <div className="space-y-3">
                    {/* Render notes beautifully by splitting them or just rendering them with nice wrapping */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                      {selectedNotesTask.notes}
                    </div>

                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 flex items-start space-x-2">
                      <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-[11px] text-amber-800 leading-relaxed">
                        <strong>Dica de Organização:</strong> O sistema analisa este campo de trás para frente buscando datas como [DD/MM] ou DD/MM para obter o progresso mais recente automaticamente.
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">Não há anotações registradas para esta atividade.</p>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedNotesTask(null)}
                  className="px-5 py-2 bg-[#343180] hover:bg-[#2c2a6d] text-white rounded-lg text-sm font-semibold cursor-pointer"
                >
                  Fechar Histórico
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
