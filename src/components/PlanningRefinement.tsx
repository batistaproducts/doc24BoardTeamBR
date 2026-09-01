import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ExternalLink,
  Layers,
  ArrowRight,
  Sparkles,
  Search,
  Filter,
  FileText,
  Bookmark,
  Calendar,
  AlertCircle,
  RefreshCw,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Send
} from 'lucide-react';
import { RefinementItem, PlanningItem, Period, User } from '../types';
import MultiSelectFilter from './MultiSelectFilter';
import {
  getPeriods,
  getRefinementData,
  saveRefinementData,
  saveRefinementDataAsync,
  getPlanningData,
  savePlanningData,
  savePlanningDataAsync,
  getRolePermissions,
  getAppParameters,
  getUsers
} from '../lib/dataStore';

interface PlanningRefinementProps {
  currentUser: User;
  isEditModeActive: boolean;
  refreshTrigger?: number;
  onDataChange?: () => void;
}

// Antonio Batista - SEG_002 - Componente de gestão do fluxo de Refinement e Planning da TI (estimativa de Story Points, estados e priorização).
export default function PlanningRefinement({
  currentUser,
  isEditModeActive,
  refreshTrigger = 0,
  onDataChange
}: PlanningRefinementProps) {
  // Navigation tabs: 'refinement' or 'planning'
  const [activeSubTab, setActiveSubTab] = useState<'refinement' | 'planning'>('refinement');
  
  // Data States
  const [periods, setPeriods] = useState<Period[]>([]);
  const [activePeriodId, setActivePeriodId] = useState<string>('');
  const [refinementItems, setRefinementItems] = useState<RefinementItem[]>([]);
  const [planningItems, setPlanningItems] = useState<PlanningItem[]>([]);
  
  // App parameters
  const parameters = getAppParameters();
  
  // Search, Multi-Select Filters & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [filterComponents, setFilterComponents] = useState<string[]>([]);
  const [filterEstados, setFilterEstados] = useState<string[]>([]);
  const [filterPriorities, setFilterPriorities] = useState<string[]>([]);

  // Sorting State
  const [sortByColumn, setSortByColumn] = useState<string>('priority');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Options for MultiSelectFilter
  const componentOptions = (parameters.components || parameters.classifications || []).map(c => ({
    id: c.id,
    label: c.label,
    color: c.color
  }));

  const statusOptions = (parameters.statuses || []).map(s => ({
    id: s.id,
    label: s.label,
    color: s.color
  }));

  const priorityOptions = (parameters.priorities || []).map(p => ({
    id: p.id,
    label: p.label,
    color: p.color
  }));

  // Antonio Batista - SEG_002 - Retorna a ordenação numérica baseada no peso da prioridade (P0, P1, P2, P3).
  const getPriorityWeight = (p: string) => {
    if (!p) return 99;
    const clean = p.trim().toUpperCase();
    if (clean === 'P0') return 0;
    if (clean === 'P1') return 1;
    if (clean === 'P2') return 2;
    if (clean === 'P3') return 3;
    if (clean === 'P4') return 4;
    return 10;
  };

  // Antonio Batista - SEG_002 - Alterna a coluna e o sentido de ordenação da tabela.
  const handleSort = (column: string) => {
    if (sortByColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortByColumn(column);
      setSortDirection('asc');
    }
  };

  // Antonio Batista - SEG_002 - Ordena uma lista de itens de acordo com a coluna e direção selecionadas.
  const sortItems = <T extends RefinementItem | PlanningItem>(items: T[]): T[] => {
    return [...items].sort((a, b) => {
      let comparison = 0;
      if (sortByColumn === 'atividade') {
        comparison = (a.atividade || '').localeCompare(b.atividade || '', 'pt-BR');
      } else if (sortByColumn === 'jiraTicket') {
        comparison = (a.jiraTicket || '').localeCompare(b.jiraTicket || '', 'pt-BR');
      } else if (sortByColumn === 'owner') {
        comparison = (a.owner || '').localeCompare(b.owner || '', 'pt-BR');
      } else if (sortByColumn === 'priority') {
        comparison = getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
      } else if (sortByColumn === 'componente') {
        comparison = (a.componente || '').localeCompare(b.componente || '', 'pt-BR');
      } else if (sortByColumn === 'estado') {
        comparison = (a.estado || '').localeCompare(b.estado || '', 'pt-BR');
      } else if (sortByColumn === 'storyPoint') {
        const spA = parseFloat(String(a.storyPoint || '0')) || 0;
        const spB = parseFloat(String(b.storyPoint || '0')) || 0;
        comparison = spA - spB;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // Antonio Batista - SEG_002 - Renderiza o cabeçalho de coluna interativo para ordenação da tabela.
  const renderSortHeader = (label: string, columnKey: string, align: 'left' | 'center' | 'right' = 'left') => {
    const isSorted = sortByColumn === columnKey;
    return (
      <th 
        key={columnKey}
        onClick={() => handleSort(columnKey)}
        className={`px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none group ${
          align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
        }`}
        title={`Clique para ordenar por ${label}`}
      >
        <div className={`inline-flex items-center space-x-1.5 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
          <span>{label}</span>
          {isSorted ? (
            sortDirection === 'asc' ? (
              <ChevronUp className="h-3.5 w-3.5 text-[#343180]" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-[#343180]" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 text-slate-300 opacity-60 group-hover:opacity-100" />
          )}
        </div>
      </th>
    );
  };

  // Modals & Form states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Allowed users for Proprietário dropdown (Admin and Analista)
  const adminAnalistaUsers = useMemo(() => {
    const users = getUsers();
    return users
      .filter(u => u.role === 'Admin' || u.role === 'Analista')
      .map(u => u.name)
      .filter(Boolean);
  }, [refreshTrigger]);

  // Form Field States
  const [formAtividade, setFormAtividade] = useState('');
  const [formJiraTicket, setFormJiraTicket] = useState('');
  const [formPriority, setFormPriority] = useState<string>((parameters.priorities || [])[0]?.id || 'P2');
  const [formComponente, setFormComponente] = useState<string>((parameters.components || parameters.classifications || [])[0]?.id || 'Back-End');
  const [formEstado, setFormEstado] = useState('Ag. refinamento');
  const [formStoryPoint, setFormStoryPoint] = useState<string>('0');
  const [formOwner, setFormOwner] = useState<string>('');

  // Load user permissions
  const permissionsData = getRolePermissions();
  const userPermissions = permissionsData.roles[currentUser.role]?.permissions;

  // Initial Load
  useEffect(() => {
    const loadedPeriods = getPeriods();
    setPeriods(loadedPeriods);
    if (loadedPeriods.length > 0 && !activePeriodId) {
      setActivePeriodId(loadedPeriods[0].id);
    }
    
    setRefinementItems(getRefinementData());
    setPlanningItems(getPlanningData());
  }, [refreshTrigger]);

  // Antonio Batista - SEG_002 - Re-sincroniza os dados de Refinement e Planning obtidos do dataStore.
  const reloadData = () => {
    setRefinementItems(getRefinementData());
    setPlanningItems(getPlanningData());
    if (onDataChange) onDataChange();
  };

  const hasActiveFilters = 
    searchTerm.trim() !== '' ||
    filterComponents.length > 0 ||
    filterEstados.length > 0 ||
    filterPriorities.length > 0;

  // Antonio Batista - SEG_002 - Reseta todos os filtros ativas de busca, componentes, estados e prioridades.
  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterComponents([]);
    setFilterEstados([]);
    setFilterPriorities([]);
  };

  // Filter & sort items by current period, search term, multi-select dropdowns
  const currentRefinementItems = sortItems(
    refinementItems.filter(item => {
      if (item.periodId !== activePeriodId) return false;
      
      const matchesSearch = 
        !searchTerm.trim() ||
        item.atividade.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.jiraTicket.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesComponent = filterComponents.length === 0 || filterComponents.includes(item.componente);
      const matchesEstado = filterEstados.length === 0 || filterEstados.includes(item.estado);
      const matchesPriority = filterPriorities.length === 0 || filterPriorities.includes(item.priority);
      
      return matchesSearch && matchesComponent && matchesEstado && matchesPriority;
    })
  );

  const currentPlanningItems = sortItems(
    planningItems.filter(item => {
      if (item.periodId !== activePeriodId) return false;
      
      const matchesSearch = 
        !searchTerm.trim() ||
        item.atividade.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.jiraTicket.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesComponent = filterComponents.length === 0 || filterComponents.includes(item.componente);
      const matchesEstado = filterEstados.length === 0 || filterEstados.includes(item.estado);
      const matchesPriority = filterPriorities.length === 0 || filterPriorities.includes(item.priority);
      
      return matchesSearch && matchesComponent && matchesEstado && matchesPriority;
    })
  );

  // Calculate totals for active period
  const totalRefinementPoints = refinementItems
    .filter(item => item.periodId === activePeriodId)
    .reduce((sum, item) => sum + (parseFloat(item.storyPoint as string) || 0), 0);

  const totalPlanningPoints = planningItems
    .filter(item => item.periodId === activePeriodId)
    .reduce((sum, item) => sum + (parseFloat(item.storyPoint as string) || 0), 0);

  // Row counts for active sub-tab
  const displayedCount = activeSubTab === 'refinement' ? currentRefinementItems.length : currentPlanningItems.length;
  const totalPeriodCount = (activeSubTab === 'refinement' ? refinementItems : planningItems).filter(item => item.periodId === activePeriodId).length;

  // Status distributions
  const metricStatusIds = ['Pendente', 'Ag. refinamento', 'Refinado', 'Finalizada'];
  const metricStatuses = metricStatusIds.map(id => {
    const found = parameters.statuses.find(s => s.id === id || s.label === id || s.id.trim() === id.trim());
    return found || { id, label: id, color: '#334155' };
  });

  const refinementStatusCounts = refinementItems
    .filter(item => item.periodId === activePeriodId)
    .reduce((acc, item) => {
      const st = (item.estado || '').trim();
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const planningStatusCounts = planningItems
    .filter(item => item.periodId === activePeriodId)
    .reduce((acc, item) => {
      const st = (item.estado || '').trim();
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  // Antonio Batista - SEG_002 - Verifica se um item de Refinement já foi promovido para o planejamento (Planning).
  const isItemInPlanning = (item: RefinementItem | PlanningItem) => {
    const planId = `plan-${item.id.replace('ref-', '')}`;
    const cleanTicket = (item.jiraTicket || '').trim().toLowerCase();
    const cleanAtividade = (item.atividade || '').trim().toLowerCase();

    return planningItems.some(p => {
      if (p.id === planId || p.id === item.id) return true;
      if (cleanTicket && cleanTicket.length > 2 && p.jiraTicket && p.jiraTicket.trim().toLowerCase() === cleanTicket) return true;
      if (p.periodId === item.periodId && p.atividade && p.atividade.trim().toLowerCase() === cleanAtividade) return true;
      return false;
    });
  };

  // Antonio Batista - SEG_002 - Envia uma atividade refinada diretamente para a lista de Planning (valida Story Points > 0).
  const handleSendToPlanning = async (item: RefinementItem | PlanningItem) => {
    if (!isEditModeActive) {
      alert('Por favor, ative a chave "Modo de Edição" no topo da tela para fazer alterações.');
      return;
    }

    // Require storypoints > 0
    const spTrimmed = String(item.storyPoint || '0').trim();
    const spNum = parseFloat(spTrimmed);
    if (!spTrimmed || spTrimmed === '0' || isNaN(spNum) || spNum <= 0) {
      alert('Para enviar a task para a planning, o item deve possuir um Story Points maior que 0. Edite o item e preencha os Story Points.');
      return;
    }

    if (isItemInPlanning(item)) {
      alert('Esta task já consta na Planning.');
      return;
    }

    setIsSaving(true);
    try {
      const planningId = `plan-${item.id.replace('ref-', '')}`;
      const newPlanningItem: PlanningItem = {
        id: planningId,
        atividade: item.atividade,
        jiraTicket: item.jiraTicket,
        priority: item.priority,
        componente: item.componente,
        estado: 'Ag. Priorização',
        storyPoint: item.storyPoint || '0',
        periodId: item.periodId || activePeriodId,
        owner: item.owner || ''
      };

      const freshPlanning = getPlanningData();
      const updatedPlanning = [...freshPlanning.filter(p => p.id !== planningId), newPlanningItem];
      const resPlan = await savePlanningDataAsync(updatedPlanning);
      if (!resPlan.success) {
        alert(`Erro ao enviar item para a Planning: ${resPlan.error}`);
        return;
      }

      reloadData();
      if (onDataChange) {
        onDataChange();
      }
    } catch (err: any) {
      console.error('[PlanningRefinement] Failed to send item to planning:', err);
      alert('Erro ao enviar item para a Planning.');
    } finally {
      setIsSaving(false);
    }
  };

  // Antonio Batista - SEG_002 - Abre o modal para criação de uma nova atividade na sub-aba ativa (Refinement ou Planning).
  const handleOpenCreateModal = () => {
    if (!isEditModeActive) {
      alert('Por favor, ative a chave "Modo de Edição" no topo da tela para fazer alterações.');
      return;
    }
    setFormAtividade('');
    setFormJiraTicket('');
    setFormPriority('P2');
    setFormComponente('Back-End');
    setFormEstado(activeSubTab === 'refinement' ? 'Ag. refinamento' : 'Ag. Priorização');
    setFormStoryPoint('0');
    setFormOwner(adminAnalistaUsers[0] || '');
    setIsCreateModalOpen(true);
  };

  // Antonio Batista - SEG_002 - Processa a inclusão do novo item no armazenamento e valida se estado Refinado exige Story Points > 0.
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAtividade.trim()) {
      alert('A descrição da atividade é obrigatória.');
      return;
    }

    if (activeSubTab === 'refinement' && formEstado.trim() === 'Refinado') {
      const spTrimmed = String(formStoryPoint).trim();
      const spNum = parseFloat(spTrimmed);
      if (!spTrimmed || spTrimmed === '0' || isNaN(spNum) || spNum <= 0) {
        alert('Para definir o estado como "Refinado", você deve informar um valor de Story Point maior que 0 (ex: 1, 2, 3, 5, 8).');
        return;
      }
    }

    setIsSaving(true);
    try {
      if (activeSubTab === 'refinement') {
        const newItemId = `ref-${Date.now()}`;
        const newItem: RefinementItem = {
          id: newItemId,
          atividade: formAtividade,
          jiraTicket: formJiraTicket,
          priority: formPriority,
          componente: formComponente,
          estado: formEstado as any,
          storyPoint: formStoryPoint || '0',
          periodId: activePeriodId,
          owner: formOwner
        };
        
        const updated = [...refinementItems, newItem];
        const res = await saveRefinementDataAsync(updated);
        if (!res.success) {
          alert(`Erro ao salvar novo item de Refinement no GitHub/Servidor: ${res.error}`);
          return;
        }
      } else {
        const newItem: PlanningItem = {
          id: `plan-${Date.now()}`,
          atividade: formAtividade,
          jiraTicket: formJiraTicket,
          priority: formPriority,
          componente: formComponente,
          estado: formEstado,
          storyPoint: formStoryPoint || '0',
          periodId: activePeriodId,
          owner: formOwner
        };
        
        const updated = [...planningItems, newItem];
        const res = await savePlanningDataAsync(updated);
        if (!res.success) {
          alert(`Erro ao salvar novo item de Planning no GitHub/Servidor: ${res.error}`);
          return;
        }
      }

      setIsCreateModalOpen(false);
      reloadData();
      if (onDataChange) {
        onDataChange();
      }
    } catch (err: any) {
      console.error('[PlanningRefinement] Failed to create item:', err);
      alert('Erro inesperado ao criar o item.');
    } finally {
      setIsSaving(false);
    }
  };

  // Antonio Batista - SEG_002 - Prepara os estados do formulário e exibe o modal de edição para o item selecionado.
  const handleOpenEditModal = (item: any) => {
    if (!isEditModeActive) {
      alert('Por favor, ative a chave "Modo de Edição" no topo da tela para fazer alterações.');
      return;
    }
    setEditingItem(item);
    setFormAtividade(item.atividade);
    setFormJiraTicket(item.jiraTicket);
    setFormPriority(item.priority);
    setFormComponente(item.componente);
    setFormEstado(item.estado);
    setFormStoryPoint(String(item.storyPoint));
    setFormOwner(item.owner || adminAnalistaUsers[0] || '');
  };

  // Antonio Batista - SEG_002 - Salva as modificações da atividade no arquivo correspondente (Refinement ou Planning).
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    if (activeSubTab === 'refinement' && formEstado.trim() === 'Refinado') {
      const spTrimmed = String(formStoryPoint).trim();
      const spNum = parseFloat(spTrimmed);
      if (!spTrimmed || spTrimmed === '0' || isNaN(spNum) || spNum <= 0) {
        alert('Para definir o estado como "Refinado", você deve informar um valor de Story Point maior que 0 (ex: 1, 2, 3, 5, 8).');
        return;
      }
    }

    setIsSaving(true);
    try {
      if (activeSubTab === 'refinement') {
        const updated = refinementItems.map(item => {
          if (item.id === editingItem.id) {
            return {
              ...item,
              atividade: formAtividade,
              jiraTicket: formJiraTicket,
              priority: formPriority,
              componente: formComponente,
              estado: formEstado as any,
              storyPoint: formStoryPoint,
              owner: formOwner
            };
          }
          return item;
        });
        const res = await saveRefinementDataAsync(updated);
        if (!res.success) {
          alert(`Erro ao salvar alteração de Refinement no GitHub/Servidor: ${res.error}`);
          return;
        }
      } else {
        const updated = planningItems.map(item => {
          if (item.id === editingItem.id) {
            return {
              ...item,
              atividade: formAtividade,
              jiraTicket: formJiraTicket,
              priority: formPriority,
              componente: formComponente,
              estado: formEstado,
              storyPoint: formStoryPoint,
              owner: formOwner
            };
          }
          return item;
        });
        const res = await savePlanningDataAsync(updated);
        if (!res.success) {
          alert(`Erro ao salvar alteração de Planning no GitHub/Servidor: ${res.error}`);
          return;
        }
      }

      setEditingItem(null);
      reloadData();
      if (onDataChange) {
        onDataChange();
      }
    } catch (err: any) {
      console.error('[PlanningRefinement] Failed to update item:', err);
      alert('Erro inesperado ao atualizar o item.');
    } finally {
      setIsSaving(false);
    }
  };

  // Antonio Batista - SEG_002 - Exclui o item selecionado da lista de Refinement ou Planning e atualiza a persistência.
  const handleDeleteItem = async (id: string) => {
    if (!isEditModeActive) {
      alert('Por favor, ative a chave "Modo de Edição" no topo da tela para fazer alterações.');
      return;
    }
    if (!window.confirm('Tem certeza de que deseja excluir este item permanentemente?')) {
      return;
    }

    setIsSaving(true);
    try {
      if (activeSubTab === 'refinement') {
        const updated = refinementItems.filter(item => item.id !== id);
        const res = await saveRefinementDataAsync(updated);
        if (!res.success) {
          alert(`Erro ao excluir item de Refinement no GitHub/Servidor: ${res.error}`);
          return;
        }
      } else {
        const updated = planningItems.filter(item => item.id !== id);
        const res = await savePlanningDataAsync(updated);
        if (!res.success) {
          alert(`Erro ao excluir item de Planning no GitHub/Servidor: ${res.error}`);
          return;
        }
      }
      reloadData();
      if (onDataChange) {
        onDataChange();
      }
    } catch (err: any) {
      console.error('[PlanningRefinement] Failed to delete item:', err);
      alert('Erro inesperado ao excluir o item.');
    } finally {
      setIsSaving(false);
    }
  };

  // Styling maps
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

  const getComponentStyle = (component: string) => {
    const comps = parameters.components || parameters.classifications || [];
    const param = comps.find(c => c.id === component);
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

  const getStatusColor = (status: string) => {
    const param = (parameters.statuses || []).find(s => s.id === status);
    return param ? param.color : '#cbd5e1';
  };

  return (
    <div className="space-y-6" id="planning-refinement-root">
      
      {/* 1. HEADER SECTOR */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 font-sans">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-lg bg-[#343180]/10 text-[#343180]">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-display">Planning / Refinement</h1>
            <p className="text-slate-500 text-sm">
              Gerencie o refinamento de atividades técnicas e o planejamento de entregas.
            </p>
          </div>
        </div>

        {/* Period selection */}
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Período:</span>
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            {periods.map(period => (
              <button
                key={period.id}
                onClick={() => setActivePeriodId(period.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activePeriodId === period.id
                    ? 'bg-white text-[#343180] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. SUBTABS TOGGLE & ACTION SUMMARY */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Main tabs */}
        <div className="flex border-b border-slate-200 pb-px">
          <button
            onClick={() => {
              setActiveSubTab('refinement');
              handleClearFilters();
            }}
            className={`px-5 py-3 border-b-2 font-semibold text-sm transition-all flex items-center space-x-2 cursor-pointer ${
              activeSubTab === 'refinement'
                ? 'border-[#343180] text-[#343180]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Refinement</span>
          </button>
          
          <button
            onClick={() => {
              setActiveSubTab('planning');
              handleClearFilters();
            }}
            className={`px-5 py-3 border-b-2 font-semibold text-sm transition-all flex items-center space-x-2 cursor-pointer ${
              activeSubTab === 'planning'
                ? 'border-[#343180] text-[#343180]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bookmark className="h-4 w-4" />
            <span>Planning</span>
          </button>
        </div>

        {/* New Item Trigger Button */}
        {(isEditModeActive || userPermissions?.planning_refinement?.includes('create')) && (
          <button
            onClick={handleOpenCreateModal}
            className={`flex items-center space-x-1.5 px-4 py-2 font-semibold text-sm rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer ${
              isEditModeActive
                ? 'bg-[#343180] hover:bg-[#282664] text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title={isEditModeActive ? "Criar novo item" : "Ative o Modo de Edição no topo para criar"}
          >
            <Plus className="h-4 w-4" />
            <span>Novo Item ({activeSubTab === 'refinement' ? 'Refinement' : 'Planning'})</span>
          </button>
        )}
      </div>

      {/* 3. METRICS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 overflow-x-auto pb-2">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs min-w-[150px]">
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Total Story Points</div>
          <div className="text-2xl font-extrabold text-[#343180]">
            {activeSubTab === 'refinement' ? totalRefinementPoints : totalPlanningPoints} SP
          </div>
          <div className="text-slate-500 text-[10px] mt-1">Pontuação do período</div>
        </div>

        {metricStatuses.map((status) => (
          <div key={status.id} className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs min-w-[150px]">
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">{status.label}</div>
            <div className="text-2xl font-extrabold" style={{ color: status.color }}>
              {activeSubTab === 'refinement' 
                ? (refinementStatusCounts[status.id.trim()] || refinementStatusCounts[status.label] || 0) 
                : (planningStatusCounts[status.id.trim()] || planningStatusCounts[status.label] || 0)}
            </div>
            <div className="text-slate-500 text-[10px] mt-1">Status atualizado</div>
          </div>
        ))}
      </div>

      {/* 4. ADVANCED SEARCH & FILTER PANEL */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-[#343180]" />
            <h3 className="text-sm font-semibold text-slate-800">Filtrar Atividades do Período</h3>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center space-x-1 hover:underline cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Busca por Descrição ou Ticket JIRA
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
                placeholder="Digite palavra-chave..."
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <MultiSelectFilter
            label="Componente"
            options={componentOptions}
            selectedValues={filterComponents}
            onChange={setFilterComponents}
          />

          <MultiSelectFilter
            label="Estado / Status"
            options={statusOptions}
            selectedValues={filterEstados}
            onChange={setFilterEstados}
          />

          <MultiSelectFilter
            label="Prioridade"
            options={priorityOptions}
            selectedValues={filterPriorities}
            onChange={setFilterPriorities}
          />
        </div>
      </div>

      {/* Table Row Counter */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1 py-1 font-medium">
        <span>
          Exibindo <strong className="text-slate-800">{displayedCount}</strong> {displayedCount === 1 ? 'registro' : 'registros'}
          {displayedCount !== totalPeriodCount && ` (filtrado de ${totalPeriodCount} no total)`}
        </span>
      </div>

      {/* 5. DATA TABLE SECTION */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left font-sans text-sm">
            <thead className="bg-slate-50/60 border-b border-slate-200/80">
              <tr>
                {renderSortHeader("Atividade / Tarefa", "atividade", "left")}
                {renderSortHeader("Ticket JIRA", "jiraTicket", "left")}
                {renderSortHeader("Proprietário", "owner", "left")}
                {renderSortHeader("Prioridade", "priority", "left")}
                {renderSortHeader("Componente", "componente", "left")}
                {renderSortHeader("Estado", "estado", "left")}
                {renderSortHeader("Story Point", "storyPoint", "center")}
                <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeSubTab === 'refinement' ? (
                currentRefinementItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">
                      Nenhum item de refinement encontrado para este período.
                    </td>
                  </tr>
                ) : (
                  currentRefinementItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 max-w-[300px]">
                        {item.atividade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.jiraTicket ? (
                          item.jiraTicket.startsWith('http') ? (
                            <a
                              href={item.jiraTicket}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-xs font-semibold text-[#343180] hover:underline"
                            >
                              <span>Acessar JIRA</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700">
                              {item.jiraTicket}
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 italic text-xs">Sem link</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-700 font-medium">
                        {item.owner || <span className="text-slate-400 italic text-xs">Não atribuído</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                          style={getPriorityStyle(item.priority)}
                        >
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
                          style={getComponentStyle(item.componente)}
                        >
                          {item.componente}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <span 
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: getStatusColor(item.estado) }}
                          ></span>
                          <span className="font-semibold text-slate-700">{item.estado}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-slate-800">
                        {item.storyPoint} SP
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {item.estado?.trim() === 'Refinado' && (
                            isItemInPlanning(item) ? (
                              <button
                                disabled
                                className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-400 border border-slate-200 rounded-lg cursor-not-allowed opacity-80"
                                title="Esta task já consta na Planning"
                              >
                                <Check className="h-3.5 w-3.5 text-slate-400" />
                                <span>Já consta em planning</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSendToPlanning(item)}
                                disabled={isSaving}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-all cursor-pointer"
                                title="Enviar atividade para a Planning"
                              >
                                <Send className="h-3.5 w-3.5" />
                                <span>Enviar a planning</span>
                              </button>
                            )
                          )}
                          {(isEditModeActive || userPermissions?.planning_refinement?.includes('update')) && (
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 text-slate-500 hover:text-[#343180] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Editar item"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          {(isEditModeActive || userPermissions?.planning_refinement?.includes('delete')) && (
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )
              ) : (
                currentPlanningItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">
                      Nenhum item de planejamento encontrado para este período.
                    </td>
                  </tr>
                ) : (
                  currentPlanningItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 max-w-[300px]">
                        {item.atividade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.jiraTicket ? (
                          item.jiraTicket.startsWith('http') ? (
                            <a
                              href={item.jiraTicket}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-xs font-semibold text-[#343180] hover:underline"
                            >
                              <span>Acessar JIRA</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700">
                              {item.jiraTicket}
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 italic text-xs">Sem link</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-700 font-medium">
                        {item.owner || <span className="text-slate-400 italic text-xs">Não atribuído</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                          style={getPriorityStyle(item.priority)}
                        >
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
                          style={getComponentStyle(item.componente)}
                        >
                          {item.componente}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <span 
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: getStatusColor(item.estado) }}
                          ></span>
                          <span className="font-semibold text-slate-700">{item.estado}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-slate-800">
                        {item.storyPoint} SP
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {(isEditModeActive || userPermissions?.planning_refinement?.includes('update')) && (
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 text-slate-500 hover:text-[#343180] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Editar item"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          {(isEditModeActive || userPermissions?.planning_refinement?.includes('delete')) && (
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 shadow-xl rounded-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#343180] px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-semibold text-lg font-display">
                Adicionar Novo Item ({activeSubTab === 'refinement' ? 'Refinement' : 'Planning'})
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 overflow-y-auto space-y-4 font-sans">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Descrição da Atividade / Tarefa *
                </label>
                <textarea
                  required
                  value={formAtividade}
                  onChange={(e) => setFormAtividade(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
                  placeholder="Ex: Refatorar API de sincronização do GitHub"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Ticket do JIRA
                  </label>
                  <input
                    type="text"
                    value={formJiraTicket}
                    onChange={(e) => setFormJiraTicket(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
                    placeholder="Link ou código"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Prioridade
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
                  >
                    {(parameters.priorities || []).map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Componente
                  </label>
                  <select
                    value={formComponente}
                    onChange={(e) => setFormComponente(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
                  >
                    {(parameters.components || parameters.classifications || []).map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Estado
                  </label>
                  <select
                    value={formEstado}
                    onChange={(e) => setFormEstado(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
                  >
                    {(parameters.statuses || []).map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Story Points
                  </label>
                  <input
                    type="text"
                    value={formStoryPoint}
                    onChange={(e) => setFormStoryPoint(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50 font-semibold"
                    placeholder="Ex: 5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Proprietário
                  </label>
                  <select
                    value={formOwner}
                    onChange={(e) => setFormOwner(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
                  >
                    <option value="">Selecione o proprietário...</option>
                    {adminAnalistaUsers.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#343180] hover:bg-[#282664] rounded-lg cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Item</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 shadow-xl rounded-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#343180] px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-semibold text-lg font-display">
                Editar Item de {activeSubTab === 'refinement' ? 'Refinement' : 'Planning'}
              </h3>
              <button onClick={() => setEditingItem(null)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 overflow-y-auto space-y-4 font-sans">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Descrição da Atividade / Tarefa *
                </label>
                <textarea
                  required
                  value={formAtividade}
                  onChange={(e) => setFormAtividade(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
                  placeholder="Ex: Refatorar API de sincronização do GitHub"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Ticket do JIRA
                  </label>
                  <input
                    type="text"
                    value={formJiraTicket}
                    onChange={(e) => setFormJiraTicket(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
                    placeholder="Link ou código"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Prioridade
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
                  >
                    {(parameters.priorities || []).map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Componente
                  </label>
                  <select
                    value={formComponente}
                    onChange={(e) => setFormComponente(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
                  >
                    {(parameters.components || parameters.classifications || []).map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Estado
                  </label>
                  <select
                    value={formEstado}
                    onChange={(e) => setFormEstado(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
                  >
                    {(parameters.statuses || []).map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Story Points
                  </label>
                  <input
                    type="text"
                    value={formStoryPoint}
                    onChange={(e) => setFormStoryPoint(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50 font-semibold"
                    placeholder="Ex: 5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Proprietário
                  </label>
                  <select
                    value={formOwner}
                    onChange={(e) => setFormOwner(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
                  >
                    <option value="">Selecione o proprietário...</option>
                    {Array.from(new Set([...adminAnalistaUsers, formOwner].filter(Boolean))).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#343180] hover:bg-[#282664] rounded-lg cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Alterações</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
