import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  Award,
  AlertOctagon,
  CalendarDays,
  FolderDot,
  Clock,
  Globe,
  X,
  Layers,
  CheckCircle2,
  RotateCcw,
  BarChart3,
  User as UserIcon,
  Check,
  FileText
} from 'lucide-react';
import { Atividade, Period, AppParameters, Goal, User } from '../types';
import { getPeriods, getAtividadesForPeriod, getAppParameters } from '../lib/dataStore';

interface MetricsProps {
  refreshTrigger?: number;
  currentUser?: User | null;
}

// Antonio Batista - SEG_002 - Função utilitária para conversão de strings de data em objetos Date válidos.
function parseTaskDate(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  const str = dateStr.trim();
  
  // Try DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }
  
  // Try YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// Antonio Batista - SEG_002 - Calcula a quantidade de dias úteis entre duas datas ignorando sábados e domingos.
function getBusinessDays(startDate: Date, endDate: Date): number {
  let start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  let end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  if (start > end) {
    const temp = start;
    start = end;
    end = temp;
  }

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dayOfWeek = cur.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// Antonio Batista - SEG_002 - Componente de visualização de métricas do sistema (quadro de indicadores, gráficos de progresso e estatísticas de sprint/período).
export default function Metrics({ refreshTrigger, currentUser }: MetricsProps) {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [parameters, setParameters] = useState<AppParameters | null>(null);
  const [isGlobalModalOpen, setIsGlobalModalOpen] = useState<boolean>(false);

  // Load periods and default activities
  useEffect(() => {
    const loadedPeriods = getPeriods();
    setPeriods(loadedPeriods);
    if (loadedPeriods.length > 0 && !selectedPeriodId) {
      setSelectedPeriodId(loadedPeriods[0].id);
    }
    const params = getAppParameters();
    setParameters(params);
  }, [refreshTrigger]);

  // Antonio Batista - SEG_002 - Consolidação de métricas globais considerando todos os arquivos de períodos cadastrados.
  const globalMetrics = useMemo(() => {
    if (!isGlobalModalOpen) return null;

    const periodTasksList: { period: Period; tasks: Atividade[] }[] = periods.map(p => ({
      period: p,
      tasks: getAtividadesForPeriod(p.id)
    }));

    const allGlobalTasks: Atividade[] = periodTasksList.flatMap(pt => pt.tasks);
    const totalGlobalTasks = allGlobalTasks.length;

    const completedGlobalTasks = allGlobalTasks.filter(t => 
      t.status.toLowerCase().includes('finaliz') || t.status.toLowerCase().includes('concl')
    ).length;

    const completionRateGlobal = totalGlobalTasks > 0 ? Math.round((completedGlobalTasks / totalGlobalTasks) * 100) : 0;
    const criticalGlobalTasks = allGlobalTasks.filter(t => t.priority === 'P0').length;

    // Transbordo / Não finalizadas
    const transbordadasCount = totalGlobalTasks - completedGlobalTasks;
    const taxaTransbordo = totalGlobalTasks > 0 ? Math.round((transbordadasCount / totalGlobalTasks) * 100) : 0;

    // Lead Time Global em dias úteis
    let totalBusinessDays = 0;
    let validLeadTimeCount = 0;
    allGlobalTasks.forEach(t => {
      if (t.startDate && t.startDate.trim() !== '' && t.endDate && t.endDate.trim() !== '') {
        const d1 = parseTaskDate(t.startDate);
        const d2 = parseTaskDate(t.endDate);
        if (d1 && d2) {
          totalBusinessDays += getBusinessDays(d1, d2);
          validLeadTimeCount++;
        }
      }
    });
    const avgLeadTimeGlobal = validLeadTimeCount > 0 ? totalBusinessDays / validLeadTimeCount : 0;

    // Carga por Proprietário Global
    const ownerCounts: Record<string, { total: number; finished: number; pending: number }> = {};
    allGlobalTasks.forEach(t => {
      const owner = t.owner || 'Não atribuído';
      if (!ownerCounts[owner]) {
        ownerCounts[owner] = { total: 0, finished: 0, pending: 0 };
      }
      ownerCounts[owner].total += 1;
      if (t.status.toLowerCase().includes('finaliz') || t.status.toLowerCase().includes('concl')) {
        ownerCounts[owner].finished += 1;
      } else {
        ownerCounts[owner].pending += 1;
      }
    });

    const ownerGlobalData = Object.entries(ownerCounts).map(([name, data]) => ({
      fullOwnerName: name,
      shortName: name.split(' ')[0] + ' ' + (name.split(' ')[1] ? name.split(' ')[1][0] + '.' : ''),
      total: data.total,
      finished: data.finished,
      pending: data.pending,
      percentageOfGlobal: totalGlobalTasks > 0 ? Math.round((data.total / totalGlobalTasks) * 100) : 0
    })).sort((a, b) => b.total - a.total);

    // Distribuição por Categoria Global
    const categoryCounts: Record<string, number> = {};
    allGlobalTasks.forEach(t => {
      const cat = t.category || 'Sem Categoria';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const categoryGlobalData = Object.entries(categoryCounts).map(([name, val]) => ({
      name,
      count: val,
      percentage: totalGlobalTasks > 0 ? Math.round((val / totalGlobalTasks) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    // Tabela discriminada por Período
    const periodsBreakdown = periodTasksList.map(({ period, tasks }) => {
      const pTotal = tasks.length;
      const pCompleted = tasks.filter(t => t.status.toLowerCase().includes('finaliz') || t.status.toLowerCase().includes('concl')).length;
      const pRate = pTotal > 0 ? Math.round((pCompleted / pTotal) * 100) : 0;
      const pCritical = tasks.filter(t => t.priority === 'P0').length;
      const pTransbordadas = pTotal - pCompleted;

      let pBusinessDays = 0;
      let pValidLead = 0;
      tasks.forEach(t => {
        if (t.startDate && t.startDate.trim() !== '' && t.endDate && t.endDate.trim() !== '') {
          const d1 = parseTaskDate(t.startDate);
          const d2 = parseTaskDate(t.endDate);
          if (d1 && d2) {
            pBusinessDays += getBusinessDays(d1, d2);
            pValidLead++;
          }
        }
      });
      const pAvgLead = pValidLead > 0 ? (pBusinessDays / pValidLead).toFixed(1) : 'N/A';

      return {
        period,
        total: pTotal,
        completed: pCompleted,
        completionRate: pRate,
        criticalP0: pCritical,
        transbordadas: pTransbordadas,
        avgLeadTime: pAvgLead
      };
    });

    return {
      totalGlobalTasks,
      completedGlobalTasks,
      completionRateGlobal,
      criticalGlobalTasks,
      transbordadasCount,
      taxaTransbordo,
      avgLeadTimeGlobal,
      validLeadTimeCount,
      ownerGlobalData,
      categoryGlobalData,
      periodsBreakdown
    };
  }, [isGlobalModalOpen, periods, refreshTrigger]);

  // Update activities when period changes or refreshTrigger changes
  useEffect(() => {
    if (selectedPeriodId) {
      const tasks = getAtividadesForPeriod(selectedPeriodId);
      setAtividades(tasks);
    }
  }, [selectedPeriodId, refreshTrigger]);

  // 1. KPI calculations
  const { totalTasks, completedTasks, completionRate, criticalTasksCount, averageLeadTime, validLeadTimeCount } = useMemo(() => {
    const total = atividades.length;
    const completed = atividades.filter(t => t.status.toLowerCase().includes('finaliz') || t.status.toLowerCase().includes('concl')).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const critical = atividades.filter(t => t.priority === 'P0').length;
    
    // Calculate lead time in business days for tasks where both startDate and endDate are filled
    let totalBusinessDays = 0;
    let validCount = 0;

    atividades.forEach(t => {
      if (t.startDate && t.startDate.trim() !== '' && t.endDate && t.endDate.trim() !== '') {
        const d1 = parseTaskDate(t.startDate);
        const d2 = parseTaskDate(t.endDate);
        if (d1 && d2) {
          const bDays = getBusinessDays(d1, d2);
          totalBusinessDays += bDays;
          validCount++;
        }
      }
    });

    const avgLeadTime = validCount > 0 ? totalBusinessDays / validCount : 0;

    return {
      totalTasks: total,
      completedTasks: completed,
      completionRate: rate,
      criticalTasksCount: critical,
      averageLeadTime: avgLeadTime,
      validLeadTimeCount: validCount
    };
  }, [atividades]);

  // 1.1 Goal calculations
  const processedGoals = useMemo(() => {
    const goals = parameters?.goals || [];
    return goals.map(goal => {
      const refs = goal.referencia.split(',').map(r => r.trim().toLowerCase());
      const matchedTasks = atividades.filter(t => refs.includes(t.status.toLowerCase())).length;
      const currentPercentage = totalTasks > 0 ? Math.round((matchedTasks / totalTasks) * 100) : 0;
      const targetPercentage = parseInt(goal.alvo.replace('%', '')) || 0;
      const goalType = (goal.type || 'A').toUpperCase();
      const isMet = goalType === 'L' ? currentPercentage <= targetPercentage : currentPercentage >= targetPercentage;
      
      return {
        ...goal,
        type: goalType,
        current: currentPercentage,
        target: targetPercentage,
        isMet
      };
    });
  }, [parameters?.goals, atividades, totalTasks]);

  // 2. Data Preparation for Chart 1: Distribuição de status (Gráfico de rosca)
  const statusChartData = useMemo(() => {
    const statusCounts = atividades.reduce((acc, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([name, val]) => ({
      name,
      value: val as number
    }));
  }, [atividades]);

  // Status Colors (Matching Tailwind classes used in Board)
  const STATUS_COLORS = {
    'Finalizada': '#10b981', // emerald
    'Ag. Deploy': '#6366f1', // indigo
    'Em Desenvolvimento': '#0ea5e9', // sky
    'Ag. Desenvolvimento': '#f59e0b', // amber
    'Pendente': '#ef4444', // red
    'Em Teste': '#ec4899' // pink
  };

  const getStatusColor = (status: string, index: number) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || `hsl(${(index * 60) % 360}, 65%, 55%)`;
  };

  // 3. Data Preparation for Chart 2: Carga de trabalho (Quantidade de tarefas por proprietário em barras horizontais)
  const ownerChartData = useMemo(() => {
    const ownerCounts = atividades.reduce((acc, curr) => {
      acc[curr.owner] = (acc[curr.owner] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(ownerCounts).map(([name, val]) => {
      const total = val as number;
      // Also split by state for more granularity
      const finished = atividades.filter(t => t.owner === name && (t.status.toLowerCase().includes('finaliz') || t.status.toLowerCase().includes('concl'))).length;
      const pending = total - finished;
      return {
        name: name.split(' ')[0] + ' ' + (name.split(' ')[1] ? name.split(' ')[1][0] + '.' : ''), // Short name for clean axis rendering
        fullOwnerName: name,
        'Concluídas': finished,
        'Pendentes/Andamento': pending,
        'Total': total
      };
    }).sort((a, b) => (b.Total as number) - (a.Total as number)); // Highest workload first
  }, [atividades]);

  // 4. Data Preparation for Chart 3: Matriz de criticidade (Quantidade de tarefas por prioridade P0, P1, P2, P3)
  const priorityChartData = useMemo(() => {
    const priorityOrder = ['P0', 'P1', 'P2', 'P3'];
    const priorityLabels = {
      P0: 'P0 (Crítico)',
      P1: 'P1 (Alto)',
      P2: 'P2 (Médio)',
      P3: 'P3 (Baixo)'
    };
    const priorityCounts = atividades.reduce((acc, curr) => {
      acc[curr.priority] = (acc[curr.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return priorityOrder.map(priority => ({
      name: priority,
      label: priorityLabels[priority as keyof typeof priorityLabels],
      'Quantidade': priorityCounts[priority] || 0
    }));
  }, [atividades]);

  const PRIORITY_COLORS = {
    P0: '#ef4444', // Red
    P1: '#f97316', // Orange
    P2: '#eab308', // Yellow/Amber
    P3: '#3b82f6'  // Blue
  };

  // 5. Data Preparation for Chart 4: Distribuição por categoria (Funcional vs. Suporte Integração)
  const categoryChartData = useMemo(() => {
    const categoryCounts = atividades.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryCounts).map(([name, val]) => ({
      name,
      value: val as number
    }));
  }, [atividades]);

  const CATEGORY_COLORS: Record<string, string> = {
    'Funcional': '#475569', // Slate
    'Suporte Integração': '#06b6d4', // Cyan/Sky
    'Infraestrutura': '#8b5cf6',
    'Melhoria': '#10b981',
    'Bug': '#ef4444'
  };

  const getCategoryColor = (categoryName: string, index: number) => {
    if (CATEGORY_COLORS[categoryName]) return CATEGORY_COLORS[categoryName];
    const fallbackColors = ['#343180', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#64748b'];
    return fallbackColors[index % fallbackColors.length];
  };

  // 6. Data Preparation for Chart 5: Distribuição de categorias por proprietário (%)
  const ownerCategoryChartData = useMemo(() => {
    const ownerMap: Record<string, Record<string, number>> = {};
    const ownerTotals: Record<string, number> = {};
    const allCategoriesSet = new Set<string>();

    atividades.forEach(task => {
      const owner = task.owner || 'Não atribuído';
      const category = task.category || 'Sem Categoria';
      allCategoriesSet.add(category);

      if (!ownerMap[owner]) {
        ownerMap[owner] = {};
        ownerTotals[owner] = 0;
      }
      ownerMap[owner][category] = (ownerMap[owner][category] || 0) + 1;
      ownerTotals[owner] += 1;
    });

    const categoriesList = Array.from(allCategoriesSet);

    const chartData = Object.entries(ownerMap).map(([owner, catCounts]) => {
      const total = ownerTotals[owner];
      const shortName = owner.split(' ')[0] + ' ' + (owner.split(' ')[1] ? owner.split(' ')[1][0] + '.' : '');
      
      const item: Record<string, any> = {
        name: shortName,
        fullOwnerName: owner,
        totalTasks: total,
      };

      categoriesList.forEach(cat => {
        const count = catCounts[cat] || 0;
        const percentage = total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0;
        item[cat] = percentage;
        item[`${cat}_count`] = count;
      });

      return item;
    }).sort((a, b) => (b.totalTasks as number) - (a.totalTasks as number));

    return {
      data: chartData,
      categories: categoriesList
    };
  }, [atividades]);

  return (
    <div className="space-y-6" id="metrics-component-root">
      {/* Header filter row */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 font-display flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-[#343180]" />
            <span>Métricas e Analytics de Atividades</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Indicadores chave de produtividade, gargalos e distribuição de demandas</p>
        </div>

        <div className="flex items-center space-x-3">
          {currentUser?.role === 'Admin' && (
            <button
              onClick={() => setIsGlobalModalOpen(true)}
              className="px-3.5 py-1.5 bg-[#343180] hover:bg-[#2c2a6d] text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
              id="btn-global-metrics"
              title="Visualizar métricas consolidadas de todos os períodos (Exclusivo Admin)"
            >
              <Globe className="h-4 w-4 text-emerald-400 animate-pulse" />
              <span>Métricas globais</span>
            </button>
          )}

          <div className="flex items-center space-x-2 border-l border-slate-200 pl-3">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Período Selecionado:</label>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] bg-white cursor-pointer"
            >
              {periods.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* KPI 1: Total Tasks */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-slate-100 rounded-xl text-[#343180]">
            <FolderDot className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total de Atividades</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{totalTasks}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Cadastradas no período</span>
          </div>
        </div>

        {/* KPI 2: Completion Rate */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <Award className="h-6 w-6" />
          </div>
          <div className="w-full">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Taxa de Entrega</span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-bold text-slate-900">{completionRate}%</span>
              <span className="text-xs font-semibold text-slate-500">({completedTasks}/{totalTasks})</span>
            </div>
            {/* Simple progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
              <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }}></div>
            </div>
          </div>
        </div>

        {/* KPI 3: Critical Tasks */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-red-50 rounded-xl text-red-600">
            <AlertOctagon className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Atividades P0 (Críticas)</span>
            <span className="text-2xl font-bold text-red-600 mt-1 block">{criticalTasksCount}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Exigem priorização urgente</span>
          </div>
        </div>

        {/* KPI 4: Leadtime Médio */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Leadtime Médio</span>
            <span className="text-2xl font-bold text-indigo-600 mt-1 block">
              {validLeadTimeCount > 0 
                ? `${averageLeadTime.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} dias`
                : 'N/A'
              }
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              {validLeadTimeCount > 0 
                ? `Média em dias úteis (${validLeadTimeCount} tarefas)`
                : 'Aguardando tarefas com início/fim'
              }
            </span>
          </div>
        </div>
      </div>

      {/* Metas Section */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800 font-display flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-[#343180]" />
            <span>Metas do Time</span>
          </h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Performance no Período</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {processedGoals.length === 0 ? (
            <div className="col-span-full py-6 text-center text-slate-400 italic text-sm">
              Nenhuma meta parametrizada. Configure as metas nas configurações administrativas.
            </div>
          ) : (
            processedGoals.map((goal, idx) => (
              <div key={idx} className="border border-slate-100 rounded-xl p-4 bg-slate-50/30">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-600 truncate mr-2" title={goal.meta}>{goal.meta}</span>
                  <div className="flex items-center space-x-1 shrink-0">
                    <span 
                      className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200"
                      title={goal.type === 'L' ? 'Meta Limite (Atingida se ≤ alvo)' : 'Meta Acima (Atingida se ≥ alvo)'}
                    >
                      {goal.type === 'L' ? 'Limite (≤)' : 'Acima (≥)'}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                      goal.isMet ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {goal.isMet ? 'Cumprida' : 'Em Aberto'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-baseline justify-between mb-1">
                  <div className="flex items-baseline space-x-1">
                    <span className={`text-xl font-black ${goal.isMet ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {goal.current}%
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">/ {goal.alvo}</span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${
                      goal.isMet ? 'bg-emerald-500' : 'bg-[#343180]'
                    }`}
                    style={{ width: `${Math.min(goal.current, 100)}%` }}
                  ></div>
                </div>
                
                <p className="text-[10px] text-slate-400 mt-2 italic truncate" title={goal.referencia}>
                  Ref: {goal.referencia}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Chart 1: Distribuição de status (Gráfico de rosca) */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col h-[380px]">
          <h3 className="text-sm font-bold text-slate-800 mb-4 font-display">Distribuição de Status (Acompanhamento)</h3>
          {statusChartData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 italic text-sm">Sem dados de status neste período</div>
          ) : (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 items-center">
              <div className="md:col-span-3 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getStatusColor(entry.name, index)} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`${value} Atividade(s)`, 'Quantidade']}
                      contentStyle={{ fontFamily: 'Inter', fontSize: '12px', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Status Custom Legend */}
              <div className="md:col-span-2 space-y-2 max-h-[220px] overflow-y-auto pr-2">
                {statusChartData.map((entry, index) => {
                  const percentage = Math.round((entry.value / totalTasks) * 100);
                  return (
                    <div key={entry.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getStatusColor(entry.name, index) }}></span>
                        <span className="text-slate-600 truncate font-medium">{entry.name}</span>
                      </div>
                      <span className="text-slate-800 font-bold pl-2">{entry.value} ({percentage}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Chart 2: Carga de Trabalho por Proprietário (Barras horizontais) */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col h-[380px]">
          <h3 className="text-sm font-bold text-slate-800 mb-4 font-display">Carga de Trabalho por Proprietário (Barras)</h3>
          {ownerChartData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 italic text-sm">Sem dados de proprietários neste período</div>
          ) : (
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ownerChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={80} />
                  <Tooltip
                    formatter={(value: any, name: any) => [value, name]}
                    labelFormatter={(label, items) => items[0]?.payload?.fullOwnerName || label}
                    contentStyle={{ fontFamily: 'Inter', fontSize: '12px', borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter' }} />
                  <Bar dataKey="Concluídas" stackId="a" fill="#10b981" barSize={16} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Pendentes/Andamento" stackId="a" fill="#3b82f6" barSize={16} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 3: Matriz de criticidade (Quantidade de tarefas por prioridade P0, P1, P2, P3) */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col h-[380px]">
          <h3 className="text-sm font-bold text-slate-800 mb-4 font-display">Matriz de Criticidade (Distribuição por Prioridade)</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={priorityChartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <Tooltip
                  formatter={(value: any) => [`${value} Atividade(s)`, 'Quantidade']}
                  labelFormatter={(label) => `Prioridade ${label}`}
                  contentStyle={{ fontFamily: 'Inter', fontSize: '12px', borderRadius: '8px' }}
                />
                <Bar dataKey="Quantidade" barSize={35} radius={[4, 4, 0, 0]}>
                  {priorityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name as keyof typeof PRIORITY_COLORS] || '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Distribuição por categoria (Funcional vs. Suporte Integração) */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col h-[380px]">
          <h3 className="text-sm font-bold text-slate-800 mb-4 font-display">Distribuição por Categoria (Tipo de Demanda)</h3>
          {categoryChartData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 italic text-sm">Sem dados de categorias neste período</div>
          ) : (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 items-center">
              <div className="md:col-span-3 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={0} // Full pie for category
                      outerRadius={85}
                      labelLine={false}
                      dataKey="value"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS] || '#64748b'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [`${value} Atividade(s)`, 'Quantidade']}
                      contentStyle={{ fontFamily: 'Inter', fontSize: '12px', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Custom Legend */}
              <div className="md:col-span-2 space-y-3 pr-2">
                {categoryChartData.map((entry, index) => {
                  const percentage = Math.round((entry.value / totalTasks) * 100);
                  return (
                    <div key={entry.name} className="flex flex-col space-y-1">
                      <div className="flex items-center space-x-1.5 text-xs">
                        <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS] || '#64748b' }}></span>
                        <span className="text-slate-600 font-semibold">{entry.name}</span>
                      </div>
                      <span className="text-slate-800 text-sm font-bold pl-4">
                        {entry.value} Atividades ({percentage}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Chart 5: Distribuição de Categorias por Proprietário (%) */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-display">
              Distribuição de Categorias por Proprietário (%)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Porcentagem relativa do tipo de demanda atuada por cada responsável
            </p>
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            Proporção de Atuação (%)
          </span>
        </div>

        {ownerCategoryChartData.data.length === 0 ? (
          <div className="py-12 flex items-center justify-center text-slate-400 italic text-sm">
            Sem dados de proprietários e categorias neste período
          </div>
        ) : (
          <div className="space-y-6">
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ownerCategoryChartData.data}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
                  <XAxis type="number" domain={[0, 100]} unit="%" stroke="#94a3b8" fontSize={11} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={100} />
                  <Tooltip
                    formatter={(value: any, name: any, props: any) => {
                      const rawCount = props?.payload?.[`${name}_count`] || 0;
                      return [`${value}% (${rawCount} atividade${rawCount === 1 ? '' : 's'})`, name];
                    }}
                    labelFormatter={(label, items) => items[0]?.payload?.fullOwnerName || label}
                    contentStyle={{ fontFamily: 'Inter', fontSize: '12px', borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter' }} />
                  {ownerCategoryChartData.categories.map((category, idx) => (
                    <Bar
                      key={category}
                      dataKey={category}
                      name={category}
                      stackId="a"
                      fill={getCategoryColor(category, idx)}
                      barSize={18}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Table Breakdown */}
            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600">
                  <tr>
                    <th className="px-4 py-2.5 font-bold uppercase tracking-wider">Proprietário</th>
                    <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-center">Total Atividades</th>
                    {ownerCategoryChartData.categories.map((cat, idx) => (
                      <th key={cat} className="px-4 py-2.5 font-bold uppercase tracking-wider text-center">
                        <span className="inline-flex items-center space-x-1.5">
                          <span className="w-2.5 h-2.5 rounded-xs inline-block shrink-0" style={{ backgroundColor: getCategoryColor(cat, idx) }}></span>
                          <span>{cat} (%)</span>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {ownerCategoryChartData.data.map((row) => (
                    <tr key={row.fullOwnerName} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{row.fullOwnerName}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-slate-800">{row.totalTasks}</td>
                      {ownerCategoryChartData.categories.map((cat) => {
                        const pct = row[cat] || 0;
                        const count = row[`${cat}_count`] || 0;
                        return (
                          <td key={cat} className="px-4 py-2.5 text-center">
                            {count > 0 ? (
                              <span className="inline-flex items-center space-x-1 bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-800">
                                <strong className="text-slate-900">{pct}%</strong>
                                <span className="text-[10px] text-slate-500">({count})</span>
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Antonio Batista - SEG_002 - Modal de Métricas Globais (Consolidado de todos os períodos) - Exclusivo Admin */}
      {isGlobalModalOpen && globalMetrics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto" id="modal-global-metrics-overlay">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in" id="modal-global-metrics-container">
            {/* Modal Header */}
            <div className="bg-[#343180] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/10 rounded-xl border border-white/20 text-indigo-100">
                  <Globe className="h-6 w-6 text-emerald-300 animate-spin-slow" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold font-display text-white">Métricas Globais da Aplicação</h3>
                    <span className="text-[10px] uppercase tracking-widest bg-emerald-400/20 text-emerald-300 font-extrabold px-2 py-0.5 rounded border border-emerald-400/30">
                      Consolidado Geral (Admin)
                    </span>
                  </div>
                  <p className="text-xs text-indigo-100/90 mt-0.5">
                    Análise acumulada considerando todos os {periods.length} arquivos de períodos e {globalMetrics.totalGlobalTasks} atividades cadastradas.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsGlobalModalOpen(false)}
                className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                title="Fechar modal de métricas globais"
                id="btn-close-global-modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">

              {/* 6 Key Global KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Global KPI 1: Taxa de Entrega (%) */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Taxa de Entrega Global</span>
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <Award className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-extrabold text-slate-900">{globalMetrics.completionRateGlobal}%</span>
                      <span className="text-xs font-bold text-slate-500">({globalMetrics.completedGlobalTasks} de {globalMetrics.totalGlobalTasks})</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                      <div className="bg-emerald-500 h-2 rounded-full transition-all duration-700" style={{ width: `${globalMetrics.completionRateGlobal}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Global KPI 2: Total de Atividades */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total de Atividades</span>
                    <div className="p-2 bg-slate-100 text-[#343180] rounded-lg">
                      <FolderDot className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-extrabold text-slate-900">{globalMetrics.totalGlobalTasks}</span>
                    <span className="text-xs text-slate-400 block mt-0.5">Acumulado em {periods.length} períodos</span>
                  </div>
                </div>

                {/* Global KPI 3: Atividades Críticas (P0) */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Atividades Críticas (P0)</span>
                    <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                      <AlertOctagon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-extrabold text-red-600">{globalMetrics.criticalGlobalTasks}</span>
                    <span className="text-xs text-slate-400 block mt-0.5">Demanda de prioridade P0</span>
                  </div>
                </div>

                {/* Global KPI 4: Lead Time Médio */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Leadtime Médio Global</span>
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <Clock className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-extrabold text-indigo-600">
                      {globalMetrics.validLeadTimeCount > 0 
                        ? `${globalMetrics.avgLeadTimeGlobal.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} dias`
                        : 'N/A'
                      }
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5">Média em dias úteis ({globalMetrics.validLeadTimeCount} tarefas)</span>
                  </div>
                </div>

                {/* Global KPI 5: Taxa de Transbordo */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Taxa de Transbordo</span>
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                      <RotateCcw className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-extrabold text-amber-600">{globalMetrics.taxaTransbordo}%</span>
                      <span className="text-xs font-bold text-slate-500">({globalMetrics.transbordadasCount} não finalizadas)</span>
                    </div>
                    <span className="text-xs text-slate-400 block mt-0.5">Atividades pendentes/transbordadas</span>
                  </div>
                </div>

                {/* Global KPI 6: Tickets Finalizados */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tickets Finalizados</span>
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-extrabold text-emerald-600">{globalMetrics.completedGlobalTasks}</span>
                    <span className="text-xs text-slate-400 block mt-0.5">Chamados e demandas concluídas</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Carga por Proprietário (Global) & Distribuição por Categoria (Global) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Carga por Proprietário (Global) */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-sm font-bold text-slate-800 font-display flex items-center space-x-2">
                      <UserIcon className="h-4 w-4 text-[#343180]" />
                      <span>Carga por Proprietário (Visão Global)</span>
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atividades por Membro</span>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {globalMetrics.ownerGlobalData.map((owner) => (
                      <div key={owner.fullOwnerName} className="p-3 border border-slate-100 rounded-lg bg-slate-50/50 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">{owner.fullOwnerName}</span>
                          <span className="font-semibold text-slate-600">
                            <strong className="text-[#343180] text-sm">{owner.total}</strong> ativ. ({owner.percentageOfGlobal}% do total)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                          <div 
                            className="bg-emerald-500 h-2" 
                            style={{ width: `${owner.total > 0 ? (owner.finished / owner.total) * 100 : 0}%` }}
                            title={`Concluídas: ${owner.finished}`}
                          ></div>
                          <div 
                            className="bg-amber-400 h-2" 
                            style={{ width: `${owner.total > 0 ? (owner.pending / owner.total) * 100 : 0}%` }}
                            title={`Pendentes/Transbordadas: ${owner.pending}`}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="text-emerald-700 font-medium">Concluídas: {owner.finished}</span>
                          <span className="text-amber-700 font-medium">Pendentes/Transbordadas: {owner.pending}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Distribuição por Categoria (Global) */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-sm font-bold text-slate-800 font-display flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4 text-[#343180]" />
                      <span>Distribuição por Categoria (Visão Global)</span>
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo de Demanda</span>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {globalMetrics.categoryGlobalData.map((cat, idx) => {
                      const color = getCategoryColor(cat.name, idx);
                      return (
                        <div key={cat.name} className="p-3 border border-slate-100 rounded-lg bg-slate-50/50 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2">
                              <span className="w-3 h-3 rounded-xs shrink-0" style={{ backgroundColor: color }}></span>
                              <span className="font-bold text-slate-800">{cat.name}</span>
                            </div>
                            <span className="font-bold text-slate-900">
                              {cat.count} atividades ({cat.percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-2 rounded-full transition-all duration-500" 
                              style={{ width: `${cat.percentage}%`, backgroundColor: color }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 3: Tabela Discriminada e Consolidada por Período */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-800 font-display flex items-center space-x-2">
                    <Layers className="h-4 w-4 text-[#343180]" />
                    <span>Detalhamento Consolidado por Período</span>
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Comparativo de Períodos</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600">
                      <tr>
                        <th className="px-4 py-2.5 font-bold uppercase tracking-wider">Período</th>
                        <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-center">Total Atividades</th>
                        <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-center">Concluídas</th>
                        <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-center">Taxa de Entrega (%)</th>
                        <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-center">Críticas (P0)</th>
                        <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-center">Transbordo</th>
                        <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-center">Lead Time Médio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {globalMetrics.periodsBreakdown.map((row) => (
                        <tr key={row.period.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5 font-bold text-[#343180]">{row.period.label}</td>
                          <td className="px-4 py-2.5 text-center font-bold text-slate-800">{row.total}</td>
                          <td className="px-4 py-2.5 text-center font-bold text-emerald-600">{row.completed}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="inline-block px-2 py-0.5 rounded font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {row.completionRate}%
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold text-red-600">{row.criticalP0}</td>
                          <td className="px-4 py-2.5 text-center font-bold text-amber-600">{row.transbordadas}</td>
                          <td className="px-4 py-2.5 text-center font-semibold text-indigo-600">
                            {row.avgLeadTime !== 'N/A' ? `${row.avgLeadTime} dias` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-900 text-white font-bold border-t border-slate-800">
                      <tr>
                        <td className="px-4 py-3">GLOBAL CONSOLIDADO</td>
                        <td className="px-4 py-3 text-center text-slate-200">{globalMetrics.totalGlobalTasks}</td>
                        <td className="px-4 py-3 text-center text-emerald-400">{globalMetrics.completedGlobalTasks}</td>
                        <td className="px-4 py-3 text-center text-emerald-400">{globalMetrics.completionRateGlobal}%</td>
                        <td className="px-4 py-3 text-center text-red-400">{globalMetrics.criticalGlobalTasks}</td>
                        <td className="px-4 py-3 text-center text-amber-400">{globalMetrics.transbordadasCount}</td>
                        <td className="px-4 py-3 text-center text-indigo-300">
                          {globalMetrics.validLeadTimeCount > 0 
                            ? `${globalMetrics.avgLeadTimeGlobal.toFixed(1)} dias` 
                            : 'N/A'
                          }
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                Relatório consolidado de todas as safras/sprints do sistema.
              </span>
              <button
                type="button"
                onClick={() => setIsGlobalModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
                id="btn-close-global-metrics-footer"
              >
                Fechar Métricas Globais
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
