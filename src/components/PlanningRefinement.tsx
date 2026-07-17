import React, { useState, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { RefinementItem, PlanningItem, Period, User } from '../types';
import {
  getPeriods,
  getRefinementData,
  saveRefinementData,
  saveRefinementDataAsync,
  getPlanningData,
  savePlanningData,
  savePlanningDataAsync,
  getRolePermissions
} from '../lib/dataStore';

interface PlanningRefinementProps {
  currentUser: User;
  isEditModeActive: boolean;
  refreshTrigger?: number;
  onDataChange?: () => void;
}

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
  
  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterComponent, setFilterComponent] = useState('Todos');
  const [filterEstado, setFilterEstado] = useState('Todos');

  // Modals & Form states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Field States
  const [formAtividade, setFormAtividade] = useState('');
  const [formJiraTicket, setFormJiraTicket] = useState('');
  const [formPriority, setFormPriority] = useState<'P0' | 'P1' | 'P2' | 'P3'>('P2');
  const [formComponente, setFormComponente] = useState<'Back-End' | 'Front-End' | 'Mobile'>('Back-End');
  const [formEstado, setFormEstado] = useState('Pendente');
  const [formStoryPoint, setFormStoryPoint] = useState<string>('0');

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

  // Sync data whenever triggered or changed
  const reloadData = () => {
    setRefinementItems(getRefinementData());
    setPlanningItems(getPlanningData());
    if (onDataChange) onDataChange();
  };

  // Filter items by current period, search term, and dropdowns
  const currentRefinementItems = refinementItems.filter(item => {
    if (item.periodId !== activePeriodId) return false;
    
    const matchesSearch = 
      item.atividade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.jiraTicket.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesComponent = filterComponent === 'Todos' || item.componente === filterComponent;
    const matchesEstado = filterEstado === 'Todos' || item.estado === filterEstado;
    
    return matchesSearch && matchesComponent && matchesEstado;
  });

  const currentPlanningItems = planningItems.filter(item => {
    if (item.periodId !== activePeriodId) return false;
    
    const matchesSearch = 
      item.atividade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.jiraTicket.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesComponent = filterComponent === 'Todos' || item.componente === filterComponent;
    const matchesEstado = filterEstado === 'Todos' || item.estado === filterEstado;
    
    return matchesSearch && matchesComponent && matchesEstado;
  });

  // Calculate totals for active period
  const totalRefinementPoints = refinementItems
    .filter(item => item.periodId === activePeriodId)
    .reduce((sum, item) => sum + (parseFloat(item.storyPoint as string) || 0), 0);

  const totalPlanningPoints = planningItems
    .filter(item => item.periodId === activePeriodId)
    .reduce((sum, item) => sum + (parseFloat(item.storyPoint as string) || 0), 0);

  // Status distributions
  const refinementStatusCounts = refinementItems
    .filter(item => item.periodId === activePeriodId)
    .reduce((acc, item) => {
      acc[item.estado] = (acc[item.estado] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const planningStatusCounts = planningItems
    .filter(item => item.periodId === activePeriodId)
    .reduce((acc, item) => {
      acc[item.estado] = (acc[item.estado] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  // Handle Create item
  const handleOpenCreateModal = () => {
    if (!isEditModeActive) {
      alert('Por favor, ative a chave "Modo de Edição" no topo da tela para fazer alterações.');
      return;
    }
    setFormAtividade('');
    setFormJiraTicket('');
    setFormPriority('P2');
    setFormComponente('Back-End');
    setFormEstado('Pendente');
    setFormStoryPoint('0');
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAtividade.trim()) {
      alert('A descrição da atividade é obrigatória.');
      return;
    }

    setIsSaving(true);
    try {
      if (activeSubTab === 'refinement') {
        const newItem: RefinementItem = {
          id: `ref-${Date.now()}`,
          atividade: formAtividade,
          jiraTicket: formJiraTicket,
          priority: formPriority,
          componente: formComponente,
          estado: formEstado as any,
          storyPoint: formStoryPoint || '0',
          periodId: activePeriodId
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
          periodId: activePeriodId
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

  // Handle Edit item
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
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

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
              storyPoint: formStoryPoint
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
              storyPoint: formStoryPoint
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

  // Handle Delete item
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
  const priorityStyles: Record<string, string> = {
    P0: 'bg-red-50 text-red-700 border-red-200',
    P1: 'bg-orange-50 text-orange-700 border-orange-200',
    P2: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    P3: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const componentStyles: Record<string, string> = {
    'Back-End': 'bg-purple-100 border-purple-200 text-purple-800',
    'Front-End': 'bg-blue-100 border-blue-200 text-blue-800',
    'Mobile': 'bg-pink-100 border-pink-200 text-pink-800'
  };

  const statusColors: Record<string, string> = {
    // Refinement states
    Pendente: 'bg-slate-400',
    Impedido: 'bg-red-500',
    Refinado: 'bg-emerald-500',
    Tajer: 'bg-indigo-500',
    // Planning states
    Planejado: 'bg-amber-500',
    'Em Progresso': 'bg-blue-500',
    Concluído: 'bg-teal-500',
    Backlog: 'bg-slate-500'
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
              setFilterComponent('Todos');
              setFilterEstado('Todos');
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
              setFilterComponent('Todos');
              setFilterEstado('Todos');
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Total de Story Points</div>
          <div className="text-2xl font-extrabold text-[#343180]">
            {activeSubTab === 'refinement' ? totalRefinementPoints : totalPlanningPoints} SP
          </div>
          <div className="text-slate-500 text-xs mt-1">Pontuação de esforço para este período</div>
        </div>

        {activeSubTab === 'refinement' ? (
          <>
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
              <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Itens Refinados</div>
              <div className="text-2xl font-extrabold text-emerald-600">
                {refinementStatusCounts['Refinado'] || 0}
              </div>
              <div className="text-slate-500 text-xs mt-1">Atividades prontas para desenvolvimento</div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
              <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Itens Pendentes</div>
              <div className="text-2xl font-extrabold text-amber-500">
                {refinementStatusCounts['Pendente'] || 0}
              </div>
              <div className="text-slate-500 text-xs mt-1">Atividades aguardando refinamento</div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
              <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Tajer / Impedidos</div>
              <div className="text-2xl font-extrabold text-red-600">
                {(refinementStatusCounts['Tajer'] || 0) + (refinementStatusCounts['Impedido'] || 0)}
              </div>
              <div className="text-slate-500 text-xs mt-1">Atividades em espera ou com bloqueios</div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
              <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Planejados</div>
              <div className="text-2xl font-extrabold text-amber-500">
                {planningStatusCounts['Planejado'] || 0}
              </div>
              <div className="text-slate-500 text-xs mt-1">Atividades agendadas para o período</div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
              <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Em Andamento</div>
              <div className="text-2xl font-extrabold text-blue-600">
                {planningStatusCounts['Em Progresso'] || 0}
              </div>
              <div className="text-slate-500 text-xs mt-1">Atividades em execução ativa</div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
              <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Concluídos</div>
              <div className="text-2xl font-extrabold text-teal-600">
                {planningStatusCounts['Concluído'] || 0}
              </div>
              <div className="text-slate-500 text-xs mt-1">Atividades finalizadas no período</div>
            </div>
          </>
        )}
      </div>

      {/* 4. ADVANCED SEARCH & FILTER PANEL */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
          <Search className="h-5 w-5 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800">Filtrar Atividades do Período</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Busca por Descrição ou Ticket JIRA
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
              placeholder="Digite palavra-chave..."
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Componente
            </label>
            <select
              value={filterComponent}
              onChange={(e) => setFilterComponent(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
            >
              <option value="Todos">Todos os Componentes</option>
              <option value="Back-End">Back-End</option>
              <option value="Front-End">Front-End</option>
              <option value="Mobile">Mobile</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Estado
            </label>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
            >
              <option value="Todos">Todos os Estados</option>
              {activeSubTab === 'refinement' ? (
                <>
                  <option value="Pendente">Pendente</option>
                  <option value="Impedido">Impedido</option>
                  <option value="Refinado">Refinado</option>
                  <option value="Tajer">Tajer</option>
                </>
              ) : (
                <>
                  <option value="Backlog">Backlog</option>
                  <option value="Planejado">Planejado</option>
                  <option value="Em Progresso">Em Progresso</option>
                  <option value="Concluído">Concluído</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* 5. DATA TABLE SECTION */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left font-sans text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Atividade / Tarefa</th>
                <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket JIRA</th>
                <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Prioridade</th>
                <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Componente</th>
                <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Story Point</th>
                <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {activeSubTab === 'refinement' ? (
                currentRefinementItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                      Nenhum item de refinamento encontrado para este período.
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${priorityStyles[item.priority]}`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${componentStyles[item.componente]}`}>
                          {item.componente}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${statusColors[item.estado] || 'bg-slate-300'}`}></span>
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
              ) : (
                currentPlanningItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${priorityStyles[item.priority]}`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${componentStyles[item.componente]}`}>
                          {item.componente}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${statusColors[item.estado] || 'bg-slate-300'}`}></span>
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
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
                  >
                    <option value="P0">P0 - Crítica</option>
                    <option value="P1">P1 - Alta</option>
                    <option value="P2">P2 - Média</option>
                    <option value="P3">P3 - Baixa</option>
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
                    onChange={(e) => setFormComponente(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
                  >
                    <option value="Back-End">Back-End</option>
                    <option value="Front-End">Front-End</option>
                    <option value="Mobile">Mobile</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Estado
                  </label>
                  {activeSubTab === 'refinement' ? (
                    <select
                      value={formEstado}
                      onChange={(e) => setFormEstado(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Impedido">Impedido</option>
                      <option value="Refinado">Refinado</option>
                      <option value="Tajer">Tajer</option>
                    </select>
                  ) : (
                    <select
                      value={formEstado}
                      onChange={(e) => setFormEstado(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
                    >
                      <option value="Backlog">Backlog</option>
                      <option value="Planejado">Planejado</option>
                      <option value="Em Progresso">Em Progresso</option>
                      <option value="Concluído">Concluído</option>
                    </select>
                  )}
                </div>
              </div>

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
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
                  >
                    <option value="P0">P0 - Crítica</option>
                    <option value="P1">P1 - Alta</option>
                    <option value="P2">P2 - Média</option>
                    <option value="P3">P3 - Baixa</option>
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
                    onChange={(e) => setFormComponente(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
                  >
                    <option value="Back-End">Back-End</option>
                    <option value="Front-End">Front-End</option>
                    <option value="Mobile">Mobile</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Estado
                  </label>
                  {activeSubTab === 'refinement' ? (
                    <select
                      value={formEstado}
                      onChange={(e) => setFormEstado(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Impedido">Impedido</option>
                      <option value="Refinado">Refinado</option>
                      <option value="Tajer">Tajer</option>
                    </select>
                  ) : (
                    <select
                      value={formEstado}
                      onChange={(e) => setFormEstado(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] focus:border-[#343180] bg-slate-50/50"
                    >
                      <option value="Backlog">Backlog</option>
                      <option value="Planejado">Planejado</option>
                      <option value="Em Progresso">Em Progresso</option>
                      <option value="Concluído">Concluído</option>
                    </select>
                  )}
                </div>
              </div>

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
