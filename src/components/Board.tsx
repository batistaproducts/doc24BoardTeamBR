import React, { useState, useEffect, useMemo } from 'react';
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
  Unlock,
  ArrowUpRight
} from 'lucide-react';
import { Atividade, Period, User, Permissions, LockStatus, RefinementItem, DeployItem } from '../types';
import MultiSelectFilter from './MultiSelectFilter';

import {
  getAtividadesForPeriod,
  saveAtividadesForPeriod,
  getPeriods,
  getLastDatedNote,
  getRolePermissions,
  getRefinementData,
  saveRefinementData,
  saveRefinementDataAsync,
  getAppParameters,
  getUsers,
  getDatasAvisos,
  saveDatasAvisos,
  saveDatasAvisosAsync
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

// Antonio Batista - SEG_002 - Componente principal da visão de Board / Kanban das Atividades da sprint.
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

  // Antonio Batista - SEG_002 - Executa a atualização manual dos dados re-sincronizando com o GitHub/Servidor.
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

  // Antonio Batista - SEG_002 - Consulta o status atual de bloqueio de edição simultânea no repositório.
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

  // Load app parameters
  const parameters = useMemo(() => getAppParameters(), [refreshTrigger]);

  // Allowed users for Proprietário dropdown (Admin and Analista)
  const adminAnalistaUsers = useMemo(() => {
    const users = getUsers();
    return users
      .filter(u => u.role === 'Admin' || u.role === 'Analista')
      .map(u => u.name)
      .filter(Boolean);
  }, [refreshTrigger]);

  // Filtering & Sorting State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOwners, setFilterOwners] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterPriorities, setFilterPriorities] = useState<string[]>([]);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterComponents, setFilterComponents] = useState<string[]>([]);
  const [sortByColumn, setSortByColumn] = useState<keyof Atividade>('priority');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Inline editing cell state: { taskId, field }
  const [editingCell, setEditingCell] = useState<{ taskId: string; field: keyof Atividade } | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>('');

  // Modal State for task creation
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sendingTaskId, setSendingTaskId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState<Partial<Atividade>>({
    name: '',
    jiraOrMovidesk: '',
    Movidesk: '',
    priority: 'P2',
    owner: '',
    status: 'Pendente',
    category: 'Funcional',
    componente: 'Back-End',
    startDate: '',
    endDate: '',
    description: '',
    notes: ''
  });

  // Modal State for viewing full history of notes
  const [selectedNotesTask, setSelectedNotesTask] = useState<Atividade | null>(null);

  // Modal State for Deploy Data registration when status becomes 'Ag. Deploy'
  const [isDeployDataModalOpen, setIsDeployDataModalOpen] = useState(false);
  const [pendingDeployContext, setPendingDeployContext] = useState<{
    type: 'inline' | 'create';
    taskId?: string;
    createdTask?: Atividade;
  } | null>(null);
  const [deployVersaoInput, setDeployVersaoInput] = useState('');
  const [deployDataInput, setDeployDataInput] = useState(new Date().toISOString().split('T')[0]);
  const [deployComponenteInput, setDeployComponenteInput] = useState('Back-End');
  const [deployLinkInput, setDeployLinkInput] = useState('');

  // Load permissions
  const permissionsData = getRolePermissions();
  const userPermissions = permissionsData.roles[currentUser.role]?.permissions;

  // Antonio Batista - SEG_002 - Encaminha a atividade selecionada para a esteira de Refinamento salvando no GitHub.
  const handleSendToRefinement = async (task: Atividade) => {
    if (!isEditModeActive) {
      alert('Por favor, ative a chave "Modo de Edição" no topo da tela para fazer alterações.');
      return;
    }
    
    setSendingTaskId(task.id);
    try {
      const refinementData = getRefinementData();
      
      const alreadyExists = refinementData.some(item => item.atividade === task.name && item.periodId === activePeriodId);
      if (alreadyExists) {
        alert('Esta atividade já foi enviada para refinamento neste período!');
        setSendingTaskId(null);
        return;
      }

      let detectedComponent: 'Back-End' | 'Front-End' | 'Mobile' = 'Back-End';
      if (task.componente && ['Back-End', 'Front-End', 'Mobile'].includes(task.componente)) {
        detectedComponent = task.componente as 'Back-End' | 'Front-End' | 'Mobile';
      } else {
        const nameLower = task.name.toLowerCase();
        if (nameLower.includes('front') || nameLower.includes('interface') || nameLower.includes('tela') || nameLower.includes('layout')) {
          detectedComponent = 'Front-End';
        } else if (nameLower.includes('mobile') || nameLower.includes('app') || nameLower.includes('android') || nameLower.includes('ios')) {
          detectedComponent = 'Mobile';
        }
      }

      const newItem: RefinementItem = {
        id: `ref-${Date.now()}`,
        atividade: task.name,
        jiraTicket: task.jiraOrMovidesk || '',
        priority: task.priority || 'P2',
        componente: detectedComponent,
        estado: 'Pendente',
        storyPoint: '0',
        periodId: activePeriodId
      };

      const updated = [...refinementData, newItem];
      
      // Save directly to the physical file and sync to GitHub immediately!
      const saveResult = await saveRefinementDataAsync(updated);
      
      if (!saveResult.success) {
        alert(`Erro ao salvar no GitHub/Servidor: ${saveResult.error}`);
        setSendingTaskId(null);
        return;
      }
      
      // Notify that an edit has occurred to mark cache dirty and prompt sync
      if (onActivityEditTrigger) {
        onActivityEditTrigger();
      }
      if (onAtividadesChange) {
        onAtividadesChange();
      }
      
      alert('Atividade enviada para refinamento e salva com sucesso diretamente no GitHub!');
    } catch (e: any) {
      console.error('[Board] Failed to send task to refinement:', e);
      alert('Erro ao enviar atividade para refinamento.');
    } finally {
      setSendingTaskId(null);
    }
  };

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

  // Antonio Batista - SEG_002 - Atualiza o estado local e persiste a lista de atividades do período selecionado.
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
      Movidesk: newTask.Movidesk || newTask.movidesk || '',
      priority: (newTask.priority as 'P0' | 'P1' | 'P2' | 'P3') || 'P2',
      owner: newTask.owner || '',
      status: newTask.status || 'Pendente',
      category: newTask.category || 'Funcional',
      componente: newTask.componente || 'Back-End',
      startDate: newTask.startDate || '',
      endDate: newTask.endDate || '',
      description: newTask.description || '',
      notes: newTask.notes || ''
    };

    if (created.status === 'Ag. Deploy') {
      setPendingDeployContext({
        type: 'create',
        createdTask: created
      });
      setDeployVersaoInput('');
      setDeployDataInput(created.endDate || new Date().toISOString().split('T')[0]);
      setDeployComponenteInput(created.componente || 'Back-End');
      setDeployLinkInput(created.jiraOrMovidesk || '');
      setIsCreateModalOpen(false);
      setIsDeployDataModalOpen(true);
      return;
    }

    const updated = [...atividades, created];
    saveTasks(updated);
    setIsCreateModalOpen(false);
    // Reset form
    setNewTask({
      name: '',
      jiraOrMovidesk: '',
      Movidesk: '',
      priority: 'P2',
      owner: '',
      status: 'Pendente',
      category: 'Funcional',
      componente: 'Back-End',
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
    const currentValue = (task[field] as string) || '';
    if (field === 'owner') {
      setInlineEditValue(currentValue || adminAnalistaUsers[0] || '');
    } else {
      setInlineEditValue(currentValue);
    }
    if (onActivityEditTrigger) {
      onActivityEditTrigger(); // Reset user activity/lock timer
    }
  };

  // Save Inline Editing
  const saveInlineEdit = (taskId: string, field: keyof Atividade) => {
    if (field === 'status' && inlineEditValue.trim() === 'Ag. Deploy') {
      const task = atividades.find(t => t.id === taskId);
      if (task) {
        setPendingDeployContext({
          type: 'inline',
          taskId
        });
        setDeployVersaoInput('');
        setDeployDataInput(task.endDate || new Date().toISOString().split('T')[0]);
        setDeployComponenteInput(task.componente || 'Back-End');
        setDeployLinkInput(task.jiraOrMovidesk || '');
        setIsDeployDataModalOpen(true);
        setEditingCell(null);
        setInlineEditValue('');
        return;
      }
    }

    const updated = atividades.map(task => {
      if (task.id === taskId) {
        const updatedTask = {
          ...task,
          [field]: inlineEditValue
        };
        if (field === 'Movidesk' || field === 'movidesk') {
          if ('Movidesk' in task) updatedTask.Movidesk = inlineEditValue;
          if ('movidesk' in task) updatedTask.movidesk = inlineEditValue;
        }
        return updatedTask;
      }
      return task;
    });

    saveTasks(updated);
    setEditingCell(null);
    setInlineEditValue('');
  };

  // Handle Confirm Deploy modal
  const handleConfirmDeploy = () => {
    if (!deployVersaoInput.trim()) {
      alert('Por favor, informe a Versão Corretora do Deploy.');
      return;
    }

    const datasAvisos = getDatasAvisos();
    const newDeploy: DeployItem = {
      id: `deploy-${Date.now()}`,
      data: deployDataInput || new Date().toISOString().split('T')[0],
      versao: deployVersaoInput.trim(),
      componente: deployComponenteInput || 'Back-End',
      link: deployLinkInput || ''
    };

    const updatedDeploys = [...(datasAvisos.deploys || []), newDeploy];
    const updatedDatasAvisos = {
      ...datasAvisos,
      deploys: updatedDeploys
    };

    saveDatasAvisos(updatedDatasAvisos);
    saveDatasAvisosAsync(updatedDatasAvisos);

    if (pendingDeployContext?.type === 'inline' && pendingDeployContext.taskId) {
      const updated = atividades.map(task => {
        if (task.id === pendingDeployContext.taskId) {
          return { ...task, status: 'Ag. Deploy', versao: deployVersaoInput.trim() };
        }
        return task;
      });
      saveTasks(updated);
    } else if (pendingDeployContext?.type === 'create' && pendingDeployContext.createdTask) {
      const updated = [...atividades, { ...pendingDeployContext.createdTask, versao: deployVersaoInput.trim() }];
      saveTasks(updated);
      setNewTask({
        name: '',
        jiraOrMovidesk: '',
        Movidesk: '',
        priority: 'P2',
        owner: '',
        status: 'Pendente',
        category: 'Funcional',
        componente: 'Back-End',
        startDate: '',
        endDate: '',
        description: '',
        notes: ''
      });
    }

    setIsDeployDataModalOpen(false);
    setPendingDeployContext(null);
    alert('Deploy registrado com sucesso! Os dados foram mapeados na página "Datas e avisos" (seção Deploys).');
  };

  // Copy Ticket ID or Url helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para a área de transferência!');
  };

  // Get list of unique values for dropdown filters
  const ownerOptions = useMemo(() => {
    return Array.from(new Set([...atividades.map(t => t.owner), ...adminAnalistaUsers].filter(Boolean)))
      .map(owner => ({ id: String(owner), label: String(owner) }));
  }, [atividades, adminAnalistaUsers]);
  
  const statusOptions = useMemo(() => {
    return parameters.statuses.map(s => ({ id: s.id, label: s.label, color: s.color }));
  }, [parameters.statuses]);

  const priorityOptions = useMemo(() => {
    return parameters.priorities.map(p => ({ id: p.id, label: p.label, color: p.color }));
  }, [parameters.priorities]);

  const categoryOptions = useMemo(() => {
    return (parameters.classifications || []).map(c => ({ id: c.id, label: c.label, color: c.color }));
  }, [parameters.classifications]);

  const componentOptions = useMemo(() => {
    const defaultComps = [
      { id: 'Front-End', label: 'Front-End', color: '#e69100' },
      { id: 'Back-End', label: 'Back-End', color: '#031ddd' },
      { id: 'Mobile', label: 'Mobile', color: '#c8d600' },
      { id: 'Design', label: 'Design', color: '#3ed507' },
      { id: 'DevOps', label: 'DevOps', color: '#14b8a6' },
      { id: 'QA', label: 'QA', color: '#f97316' },
      { id: 'Ambos', label: 'Ambos', color: '#038c37' }
    ];
    const comps = parameters.components && parameters.components.length > 0 ? parameters.components : defaultComps;
    return comps.map(c => ({ id: c.id, label: c.label, color: c.color }));
  }, [parameters.components]);

  // Filter & Sort core logic
  const filteredAtividades = useMemo(() => {
    return atividades
      .filter(task => {
        // 1. Keyword search
        const term = searchTerm.toLowerCase();
        const movideskVal = (task.Movidesk || task.movidesk || '').toLowerCase();
        const matchesSearch =
          !term ||
          task.name.toLowerCase().includes(term) ||
          task.owner.toLowerCase().includes(term) ||
          task.description.toLowerCase().includes(term) ||
          task.notes.toLowerCase().includes(term) ||
          (task.componente && task.componente.toLowerCase().includes(term)) ||
          task.jiraOrMovidesk.toLowerCase().includes(term) ||
          movideskVal.includes(term);

        // 2. Owner filter
        const matchesOwner = filterOwners.length === 0 || filterOwners.some(owner => task.owner.toLowerCase().includes(owner.toLowerCase()));

        // 3. Status filter
        const matchesStatus = filterStatuses.length === 0 || filterStatuses.includes(task.status);

        // 4. Priority filter
        const matchesPriority = filterPriorities.length === 0 || filterPriorities.includes(task.priority);

        // 5. Category filter
        const matchesCategory = filterCategories.length === 0 || filterCategories.includes(task.category);

        // 6. Component filter
        const matchesComponent = filterComponents.length === 0 || (task.componente && filterComponents.includes(task.componente));

        return matchesSearch && matchesOwner && matchesStatus && matchesPriority && matchesCategory && matchesComponent;
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
  }, [atividades, searchTerm, filterOwners, filterStatuses, filterPriorities, filterCategories, sortByColumn, sortDirection]);

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Keyword Search */}
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Busca por Texto
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50 h-[38px]"
              placeholder="Pesquisar..."
            />
          </div>

          <MultiSelectFilter
            label="Proprietário"
            options={ownerOptions}
            selectedValues={filterOwners}
            onChange={setFilterOwners}
          />

          <MultiSelectFilter
            label="Estado / Status"
            options={statusOptions}
            selectedValues={filterStatuses}
            onChange={setFilterStatuses}
          />

          <MultiSelectFilter
            label="Prioridade"
            options={priorityOptions}
            selectedValues={filterPriorities}
            onChange={setFilterPriorities}
          />

          <MultiSelectFilter
            label="Classificação"
            options={categoryOptions}
            selectedValues={filterCategories}
            onChange={setFilterCategories}
          />

          <MultiSelectFilter
            label="Componente"
            options={componentOptions}
            selectedValues={filterComponents}
            onChange={setFilterComponents}
          />
        </div>

        {/* Quick Clear Filter Button */}
        {(searchTerm || filterOwners.length > 0 || filterStatuses.length > 0 || filterPriorities.length > 0 || filterCategories.length > 0 || filterComponents.length > 0) && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterOwners([]);
                setFilterStatuses([]);
                setFilterPriorities([]);
                setFilterCategories([]);
                setFilterComponents([]);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-[#343180] transition-colors cursor-pointer"
            >
              Limpar Todos os Filtros
            </button>
          </div>
        )}
      </div>

      {/* Table Row Counter */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1 py-1 font-medium">
        <span>
          Exibindo <strong className="text-slate-800">{filteredAtividades.length}</strong> {filteredAtividades.length === 1 ? 'atividade' : 'atividades'}
          {filteredAtividades.length !== atividades.length && ` (filtrado de ${atividades.length} no total)`}
        </span>
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
                    <span>Classificação</span>
                    <span className="text-slate-400">
                      {sortByColumn === 'category' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>

                <th
                  onClick={() => handleSortClick('componente')}
                  className="px-4 py-4 font-bold text-slate-700 select-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Componente</span>
                    <span className="text-slate-400">
                      {sortByColumn === 'componente' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
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
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400 italic">
                    Nenhuma atividade encontrada para os filtros aplicados neste período.
                  </td>
                </tr>
              ) : (
                filteredAtividades.map((task) => {
                  const parsedNote = getLastDatedNote(task.notes);

                  const getPriorityStyle = (priority: string) => {
                    const param = (parameters.priorities || []).find(p => p.id === priority);
                    if (param) {
                      return {
                        color: param.color,
                        borderColor: `${param.color}40`,
                        backgroundColor: `${param.color}10`
                      };
                    }
                    return {
                      color: '#64748b',
                      borderColor: '#e2e8f0',
                      backgroundColor: '#f8fafc'
                    };
                  };

                  const getPriorityLabel = (priority: string) => {
                    const param = (parameters.priorities || []).find(p => p.id === priority);
                    return param ? param.label : priority;
                  };

                  const getStatusDotColor = (status: string) => {
                    const param = (parameters.statuses || []).find(s => s.id === status);
                    return param ? param.color : '#cbd5e1';
                  };

                  const getCategoryStyle = (category: string) => {
                    const param = (parameters.classifications || []).find(c => c.id === category);
                    if (param) {
                      return {
                        color: param.color,
                        borderColor: `${param.color}40`,
                        backgroundColor: `${param.color}10`
                      };
                    }
                    return {
                      color: '#64748b',
                      borderColor: '#e2e8f0',
                      backgroundColor: '#f8fafc'
                    };
                  };

                  const getComponentStyle = (comp?: string) => {
                    if (!comp) return { color: '#64748b', borderColor: '#e2e8f0', backgroundColor: '#f8fafc' };
                    const param = (parameters.components || []).find(c => c.id === comp);
                    if (param) {
                      return {
                        color: param.color,
                        borderColor: `${param.color}40`,
                        backgroundColor: `${param.color}10`
                      };
                    }
                    return {
                      color: '#475569',
                      borderColor: '#cbd5e1',
                      backgroundColor: '#f1f5f9'
                    };
                  };

                  const priorityStyle = getPriorityStyle(task.priority);
                  const categoryStyle = getCategoryStyle(task.category);
                  const componentStyle = getComponentStyle(task.componente);

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
                        {editingCell?.taskId === task.id && (editingCell?.field === 'jiraOrMovidesk' || editingCell?.field === 'Movidesk' || editingCell?.field === 'movidesk') ? (
                          renderCellContent(task, editingCell.field, 'text')
                        ) : (
                          <div className="flex flex-col space-y-1.5 items-start">
                            {/* Link 1: JIRA */}
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
                                      JIRA #{task.jiraOrMovidesk}
                                    </span>
                                    <button
                                      onClick={() => handleCopy(task.jiraOrMovidesk)}
                                      className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                                      title="Copiar Ticket JIRA"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </button>
                                  </div>
                                )
                              ) : (
                                <span className="text-slate-400 italic text-xs">JIRA: -</span>
                              )}

                              {isEditModeActive && userPermissions?.tasks.includes('update') && (
                                <button
                                  onClick={() => startInlineEdit(task, 'jiraOrMovidesk')}
                                  className="opacity-0 group-hover/row:opacity-100 p-1 text-slate-400 hover:text-[#343180] rounded transition-all cursor-pointer"
                                  title="Editar Ticket JIRA"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>

                            {/* Link 2: Movidesk */}
                            <div className="flex items-center space-x-1.5">
                              {(task.Movidesk || task.movidesk) ? (
                                (task.Movidesk || task.movidesk)!.startsWith('http') ? (
                                  <a
                                    href={task.Movidesk || task.movidesk}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 hover:underline"
                                  >
                                    <span>Movidesk</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <div className="flex items-center space-x-1">
                                    <a
                                      href={`https://doc24.movidesk.com/Ticket/Edit/${task.Movidesk || task.movidesk}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 hover:underline"
                                    >
                                      <span>Movidesk #{(task.Movidesk || task.movidesk)}</span>
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                    <button
                                      onClick={() => handleCopy((task.Movidesk || task.movidesk)!)}
                                      className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                                      title="Copiar Ticket Movidesk"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </button>
                                  </div>
                                )
                              ) : (
                                <span className="text-slate-400 italic text-xs">Movidesk: -</span>
                              )}

                              {isEditModeActive && userPermissions?.tasks.includes('update') && (
                                <button
                                  onClick={() => startInlineEdit(task, task.Movidesk !== undefined ? ('Movidesk' as any) : 'movidesk')}
                                  className="opacity-0 group-hover/row:opacity-100 p-1 text-slate-400 hover:text-[#343180] rounded transition-all cursor-pointer"
                                  title="Editar Ticket Movidesk"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Priority Cell */}
                      <td className="px-4 py-4">
                        {editingCell?.taskId === task.id && editingCell?.field === 'priority' ? (
                          renderCellContent(task, 'priority', 'select', (parameters.priorities || []).map(p => p.id))
                        ) : (
                          <div className="flex items-center space-x-1.5">
                            <span 
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border"
                              style={priorityStyle}
                            >
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
                        {renderCellContent(task, 'owner', 'select', Array.from(new Set([...adminAnalistaUsers, task.owner].filter(Boolean))))}
                      </td>

                      {/* Status/Estado Cell */}
                      <td className="px-4 py-4">
                        {editingCell?.taskId === task.id && editingCell?.field === 'status' ? (
                          renderCellContent(task, 'status', 'select', (parameters.statuses || []).map(s => s.id))
                        ) : (
                          <div className="flex items-center space-x-1.5">
                            <span className="flex items-center gap-1.5">
                              <span 
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: getStatusDotColor(task.status) }}
                              ></span>
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

                      {/* Classificação Cell */}
                      <td className="px-4 py-4">
                        {editingCell?.taskId === task.id && editingCell?.field === 'category' ? (
                          renderCellContent(task, 'category', 'select', (parameters.classifications || []).map(c => c.id))
                        ) : (
                          <div className="flex items-center space-x-1.5">
                            <span 
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
                              style={categoryStyle}
                            >
                              {task.category || 'Funcional'}
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

                      {/* Componente Cell */}
                      <td className="px-4 py-4">
                        {editingCell?.taskId === task.id && editingCell?.field === 'componente' ? (
                          renderCellContent(task, 'componente', 'select', componentOptions.map(c => c.id))
                        ) : (
                          <div className="flex items-center space-x-1.5">
                            <span 
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border"
                              style={componentStyle}
                            >
                              {task.componente || 'Back-End'}
                            </span>

                            {isEditModeActive && userPermissions?.tasks.includes('update') && (
                              <button
                                onClick={() => startInlineEdit(task, 'componente')}
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

                      {/* Actions */}
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(currentUser.role === 'Admin' || currentUser.role === 'Analista') && (
                            <button
                              onClick={() => {
                                if (sendingTaskId) return;
                                handleSendToRefinement(task);
                              }}
                              disabled={sendingTaskId !== null || !isEditModeActive}
                              className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-bold border transition-all cursor-pointer ${
                                sendingTaskId === task.id
                                  ? 'bg-amber-50 border-amber-250 text-amber-700'
                                  : isEditModeActive
                                    ? 'bg-[#343180]/5 hover:bg-[#343180]/10 text-[#343180] border-[#343180]/25 hover:border-[#343180]/40'
                                    : 'bg-slate-50 text-slate-400 border-slate-250 cursor-not-allowed'
                              }`}
                              title={sendingTaskId === task.id ? "Salvando no GitHub..." : "Enviar para refinamento"}
                            >
                              {sendingTaskId === task.id ? (
                                <>
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  <span className="hidden md:inline">Enviando...</span>
                                </>
                              ) : (
                                <>
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                  <span className="hidden md:inline">Enviar para refinamento</span>
                                </>
                              )}
                            </button>
                          )}

                          {userPermissions?.tasks.includes('delete') && (
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
                          )}
                        </div>
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
                    Link / Ticket JIRA
                  </label>
                  <input
                    type="text"
                    value={newTask.jiraOrMovidesk}
                    onChange={(e) => setNewTask({ ...newTask, jiraOrMovidesk: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] bg-slate-50/50"
                    placeholder="Ex: https://doc24.atlassian.net/browse/..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Link / Ticket Movidesk
                  </label>
                  <input
                    type="text"
                    value={newTask.Movidesk || ''}
                    onChange={(e) => setNewTask({ ...newTask, Movidesk: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] bg-slate-50/50"
                    placeholder="Ex: https://doc24.movidesk.com/... ou 48018"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Prioridade
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] bg-slate-50/50"
                  >
                    {(parameters.priorities || []).map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Proprietário *
                  </label>
                  <select
                    required
                    value={newTask.owner}
                    onChange={(e) => setNewTask({ ...newTask, owner: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] bg-slate-50/50"
                  >
                    <option value="">Selecione o proprietário...</option>
                    {adminAnalistaUsers.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
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
                    {(parameters.statuses || []).map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Classificação / Categoria
                  </label>
                  <select
                    value={newTask.category}
                    onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] bg-slate-50/50"
                  >
                    {(parameters.classifications || []).map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Componente
                  </label>
                  <select
                    value={newTask.componente}
                    onChange={(e) => setNewTask({ ...newTask, componente: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] bg-slate-50/50"
                  >
                    {componentOptions.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
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

      {/* Deploy Data Modal (Triggered when status is set to Ag. Deploy) */}
      {isDeployDataModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 shadow-xl rounded-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="bg-[#343180] px-6 py-4 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <h3 className="font-semibold text-base font-display">Dados de Deploy (Ag. Deploy)</h3>
              </div>
              <button onClick={() => { setIsDeployDataModalOpen(false); setPendingDeployContext(null); }} className="text-white/80 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 flex items-start space-x-2">
                <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-800 leading-relaxed">
                  O status do ticket foi alterado para <strong>Ag. Deploy</strong>. Por favor, preencha os dados abaixo. Eles serão mapeados automaticamente na página <strong>Datas e avisos</strong> (Deploys).
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Versão Corretora do Deploy <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={deployVersaoInput}
                  onChange={(e) => setDeployVersaoInput(e.target.value)}
                  placeholder="Ex: v1.4.2-hotfix"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#343180] bg-slate-50/50"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Data do Deploy
                </label>
                <input
                  type="date"
                  value={deployDataInput}
                  onChange={(e) => setDeployDataInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#343180] bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Componente
                </label>
                <input
                  type="text"
                  value={deployComponenteInput}
                  onChange={(e) => setDeployComponenteInput(e.target.value)}
                  placeholder="Ex: Back-End, Front-End"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#343180] bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Link / Ticket Relacionado
                </label>
                <input
                  type="text"
                  value={deployLinkInput}
                  onChange={(e) => setDeployLinkInput(e.target.value)}
                  placeholder="Ex: https://jira.company.com/browse/PROJ-123"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#343180] bg-slate-50/50"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsDeployDataModalOpen(false); setPendingDeployContext(null); }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeploy}
                  className="px-5 py-2 bg-[#343180] hover:bg-[#2c2a6d] text-white rounded-lg text-sm font-semibold shadow-xs hover:shadow-md cursor-pointer"
                >
                  Salvar Deploy & Concluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
