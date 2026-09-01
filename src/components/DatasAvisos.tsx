import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  User as UserIcon,
  AlertCircle,
  Briefcase,
  Filter,
  Info,
  CalendarDays,
  UserCheck,
  FileText,
  Lock,
  Unlock,
  CheckCircle2,
  Clock3,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw
} from 'lucide-react';
import { User, FeriasDayOffItem, AusenciaTemporariaItem, DeployItem, DatasAvisosData, Atividade, PlanningItem, RefinementItem, Period } from '../types';
import { getDatasAvisos, saveDatasAvisosAsync, getUsers, getAppParameters, getPeriods, getAtividadesForPeriod, getPlanningData, getRefinementData } from '../lib/dataStore';

interface DatasAvisosProps {
  currentUser: User;
  isEditModeActive: boolean;
  refreshTrigger?: number;
  onDataChange?: () => void;
}

// Multi-Select Dropdown Component for filtering multiple values at once
interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (newValues: string[]) => void;
  accentColor?: 'purple' | 'emerald';
}

// Antonio Batista - SEG_002 - Componente de dropdown com seleção múltipla de opções para filtragem avançada.
function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  onChange,
  accentColor = 'purple'
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchFilter.trim()) return options;
    return options.filter((opt) => opt.toLowerCase().includes(searchFilter.toLowerCase()));
  }, [options, searchFilter]);

  const toggleOption = (opt: string) => {
    if (selectedValues.includes(opt)) {
      onChange(selectedValues.filter((v) => v !== opt));
    } else {
      onChange([...selectedValues, opt]);
    }
  };

  const selectAll = () => {
    onChange([...options]);
  };

  const clearAll = () => {
    onChange([]);
  };

  const isNoneSelected = selectedValues.length === 0;

  const focusRing =
    accentColor === 'emerald'
      ? 'focus:ring-emerald-600/20 focus:border-emerald-600'
      : 'focus:ring-[#343180]/20 focus:border-[#343180]';

  const badgeBg =
    accentColor === 'emerald'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : 'bg-purple-100 text-[#343180] border-purple-200';

  return (
    <div className="relative inline-block text-left w-full sm:w-auto" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full sm:w-auto inline-flex items-center justify-between space-x-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
          !isNoneSelected
            ? 'bg-slate-50 border-slate-300 text-slate-900 font-semibold'
            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/80'
        }`}
      >
        <div className="flex items-center space-x-1.5 truncate max-w-[180px]">
          <Filter className="h-3 w-3 text-slate-400 shrink-0" />
          <span className="truncate">
            {isNoneSelected
              ? `${label}: Todos`
              : `${label}: ${selectedValues.length} sel.`}
          </span>
          {!isNoneSelected && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold border ${badgeBg}`}>
              {selectedValues.length}
            </span>
          )}
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-1.5 w-56 rounded-xl shadow-lg bg-white border border-slate-200 ring-1 ring-black/5 z-40 p-2 text-xs font-sans animate-in fade-in zoom-in-95 duration-100">
          
          {/* Header Actions */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-1">
            <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">{label}</span>
            <div className="flex items-center space-x-2 text-[10px]">
              <button
                type="button"
                onClick={selectAll}
                className="text-[#343180] hover:underline font-semibold cursor-pointer"
              >
                Todos
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                Limpar
              </button>
            </div>
          </div>

          {/* Option Search if many options */}
          {options.length > 5 && (
            <div className="my-2">
              <input
                type="text"
                placeholder="Filtrar opções..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className={`w-full px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-md focus:outline-none ${focusRing}`}
              />
            </div>
          )}

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto space-y-1 my-1 pr-0.5">
            {filteredOptions.length === 0 ? (
              <div className="p-2 text-slate-400 italic text-[11px] text-center">Nenhuma opção</div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selectedValues.includes(opt);
                return (
                  <label
                    key={opt}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleOption(opt);
                    }}
                    className="flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer text-slate-700 select-none transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      readOnly
                      className="rounded border-slate-300 text-[#343180] focus:ring-[#343180] h-3.5 w-3.5 cursor-pointer"
                    />
                    <span className={`truncate text-xs ${isChecked ? 'font-semibold text-slate-900' : 'font-normal'}`}>
                      {opt}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          {/* Footer Badge summary */}
          {!isNoneSelected && (
            <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between px-1">
              <span>{selectedValues.length} selecionado(s)</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-red-500 hover:text-red-700 font-bold cursor-pointer"
              >
                Resetar
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// Antonio Batista - SEG_002 - Componente para controle e registro de Férias, DayOffs, Ausências Temporárias e datas de Deploys do time.
export default function DatasAvisos({
  currentUser,
  isEditModeActive,
  refreshTrigger = 0,
  onDataChange
}: DatasAvisosProps) {
  // Data state
  const [data, setData] = useState<DatasAvisosData>({
    feriasDayOffs: [],
    ausenciasTemporarias: [],
    deploys: []
  });

  const [usersList, setUsersList] = useState<User[]>([]);
  const [appParams, setAppParams] = useState<any>(null);

  // Deploy states
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [editingDeployItem, setEditingDeployItem] = useState<DeployItem | null>(null);
  const [formDeployData, setFormDeployData] = useState('');
  const [formDeployVersao, setFormDeployVersao] = useState('');
  const [formDeployComponente, setFormDeployComponente] = useState('');
  const [formDeployLink, setFormDeployLink] = useState('');

  // View Deploy Tasks Modal state
  const [isViewDeployModalOpen, setIsViewDeployModalOpen] = useState(false);
  const [viewingDeployVersao, setViewingDeployVersao] = useState('');
  const [viewingDeployTasks, setViewingDeployTasks] = useState<{
    id: string;
    name: string;
    type: 'board' | 'planning' | 'refinement';
    status?: string;
    jiraOrMovidesk?: string;
    owner?: string;
    periodLabel?: string;
  }[]>([]);

  // Search & Multi-Select Filter states for Férias/DayOffs
  const [searchFerias, setSearchFerias] = useState('');
  const [selectedFeriasColaboradores, setSelectedFeriasColaboradores] = useState<string[]>([]);
  const [selectedFeriasTipos, setSelectedFeriasTipos] = useState<string[]>([]);
  const [selectedFeriasStatus, setSelectedFeriasStatus] = useState<string[]>([]);

  // Sorting state for Férias/DayOffs
  type FeriasSortKey = 'colaborador' | 'tipo' | 'dataInicio' | 'dias' | 'status';
  const [sortFeriasKey, setSortFeriasKey] = useState<FeriasSortKey>('dataInicio');
  const [sortFeriasDir, setSortFeriasDir] = useState<'asc' | 'desc'>('asc');

  // Search & Multi-Select Filter states for Ausências Temporárias
  const [searchAusencia, setSearchAusencia] = useState('');
  const [selectedAusenciaColaboradores, setSelectedAusenciaColaboradores] = useState<string[]>([]);
  const [selectedAusenciaMotivos, setSelectedAusenciaMotivos] = useState<string[]>([]);

  // Sorting state for Ausências Temporárias
  type AusenciaSortKey = 'colaborador' | 'motivo' | 'data';
  const [sortAusenciaKey, setSortAusenciaKey] = useState<AusenciaSortKey>('data');
  const [sortAusenciaDir, setSortAusenciaDir] = useState<'asc' | 'desc'>('asc');

  // Modal states
  const [isFeriasModalOpen, setIsFeriasModalOpen] = useState(false);
  const [editingFeriasItem, setEditingFeriasItem] = useState<FeriasDayOffItem | null>(null);

  const [isAusenciaModalOpen, setIsAusenciaModalOpen] = useState(false);
  const [editingAusenciaItem, setEditingAusenciaItem] = useState<AusenciaTemporariaItem | null>(null);

  // Form states for Ferias/DayOff
  const [formFeriasColaborador, setFormFeriasColaborador] = useState('');
  const [formFeriasTipo, setFormFeriasTipo] = useState<'Férias' | 'DayOff'>('Férias');
  const [formFeriasDataInicio, setFormFeriasDataInicio] = useState('');
  const [formFeriasDataFim, setFormFeriasDataFim] = useState('');
  const [formFeriasStatus, setFormFeriasStatus] = useState('Confirmado');
  const [formFeriasObservacao, setFormFeriasObservacao] = useState('');

  // Form states for Ausencia Temporaria
  const [formAusenciaColaborador, setFormAusenciaColaborador] = useState('');
  const [formAusenciaMotivo, setFormAusenciaMotivo] = useState('Consulta Médica');
  const [formAusenciaData, setFormAusenciaData] = useState('');
  const [formAusenciaHorarioInicio, setFormAusenciaHorarioInicio] = useState('');
  const [formAusenciaHorarioFim, setFormAusenciaHorarioFim] = useState('');
  const [formAusenciaObservacao, setFormAusenciaObservacao] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Antonio Batista - SEG_002 - Carrega as informações de datas, avisos, usuários e parâmetros do sistema.
  const loadData = () => {
    try {
      const loaded = getDatasAvisos();
      setData(loaded || { feriasDayOffs: [], ausenciasTemporarias: [], deploys: [] });
      setUsersList(getUsers() || []);
      setAppParams(getAppParameters());
    } catch (e) {
      console.error('Erro ao carregar datas e avisos:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  // Antonio Batista - SEG_002 - Persiste as alterações efetuadas em Férias, Ausências e Deploys no servidor.
  const persistData = async (newData: DatasAvisosData) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      setData(newData);
      const res = await saveDatasAvisosAsync(newData);
      if (!res.success) {
        setSaveError(res.error || 'Erro ao salvar alterações no servidor');
      } else if (onDataChange) {
        onDataChange();
      }
    } catch (err: any) {
      setSaveError(err.message || 'Erro inesperado ao salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  // Antonio Batista - SEG_002 - Abre o modal de cadastro ou edição de Férias e DayOffs.
  const handleOpenFeriasModal = (item?: FeriasDayOffItem) => {
    if (!isEditModeActive) {
      alert('Para cadastrar ou editar registros, ative o Modo de Edição no topo da tela.');
      return;
    }
    if (item) {
      setEditingFeriasItem(item);
      setFormFeriasColaborador(item.colaborador);
      setFormFeriasTipo(item.tipo as any || 'Férias');
      setFormFeriasDataInicio(item.dataInicio);
      setFormFeriasDataFim(item.dataFim);
      setFormFeriasStatus(item.status || 'Confirmado');
      setFormFeriasObservacao(item.observacao || '');
    } else {
      setEditingFeriasItem(null);
      setFormFeriasColaborador(usersList[0]?.name || currentUser.name);
      setFormFeriasTipo('Férias');
      const today = new Date().toISOString().split('T')[0];
      setFormFeriasDataInicio(today);
      setFormFeriasDataFim(today);
      setFormFeriasStatus('Confirmado');
      setFormFeriasObservacao('');
    }
    setIsFeriasModalOpen(true);
  };

  // Antonio Batista - SEG_002 - Salva os dados do formulário de Férias/DayOff.
  const handleSaveFeriasModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFeriasColaborador.trim() || !formFeriasDataInicio || !formFeriasDataFim) {
      alert('Por favor, preencha o colaborador e os períodos de início e fim.');
      return;
    }

    let updatedList = [...data.feriasDayOffs];
    if (editingFeriasItem) {
      updatedList = updatedList.map((item) =>
        item.id === editingFeriasItem.id
          ? {
              ...item,
              colaborador: formFeriasColaborador,
              tipo: formFeriasTipo,
              dataInicio: formFeriasDataInicio,
              dataFim: formFeriasDataFim,
              status: formFeriasStatus,
              observacao: formFeriasObservacao
            }
          : item
      );
    } else {
      const newItem: FeriasDayOffItem = {
        id: `fdo-${Date.now()}`,
        colaborador: formFeriasColaborador,
        tipo: formFeriasTipo,
        dataInicio: formFeriasDataInicio,
        dataFim: formFeriasDataFim,
        status: formFeriasStatus,
        observacao: formFeriasObservacao
      };
      updatedList.push(newItem);
    }

    const newData = { ...data, feriasDayOffs: updatedList };
    await persistData(newData);
    setIsFeriasModalOpen(false);
  };

  // Antonio Batista - SEG_002 - Exclui um registro de Férias/DayOff da lista.
  const handleDeleteFeriasItem = async (id: string) => {
    if (!isEditModeActive) {
      alert('Para excluir registros, ative o Modo de Edição no topo da tela.');
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir este registro de férias/dayOff?')) {
      const updatedList = data.feriasDayOffs.filter((item) => item.id !== id);
      const newData = { ...data, feriasDayOffs: updatedList };
      await persistData(newData);
    }
  };

  // Antonio Batista - SEG_002 - Abre o modal para inclusão ou alteração de ausência temporária.
  const handleOpenAusenciaModal = (item?: AusenciaTemporariaItem) => {
    if (!isEditModeActive) {
      alert('Para cadastrar ou editar registros, ative o Modo de Edição no topo da tela.');
      return;
    }
    if (item) {
      setEditingAusenciaItem(item);
      setFormAusenciaColaborador(item.colaborador);
      setFormAusenciaMotivo(item.motivo);
      setFormAusenciaData(item.data);
      setFormAusenciaHorarioInicio(item.horarioInicio || '');
      setFormAusenciaHorarioFim(item.horarioFim || '');
      setFormAusenciaObservacao(item.observacao || '');
    } else {
      setEditingAusenciaItem(null);
      setFormAusenciaColaborador(usersList[0]?.name || currentUser.name);
      setFormAusenciaMotivo('Consulta Médica');
      const today = new Date().toISOString().split('T')[0];
      setFormAusenciaData(today);
      setFormAusenciaHorarioInicio('09:00');
      setFormAusenciaHorarioFim('12:00');
      setFormAusenciaObservacao('');
    }
    setIsAusenciaModalOpen(true);
  };

  // Antonio Batista - SEG_002 - Salva as informações da ausência temporária no formulário.
  const handleSaveAusenciaModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAusenciaColaborador.trim() || !formAusenciaData || !formAusenciaMotivo.trim()) {
      alert('Por favor, preencha o colaborador, motivo e a data.');
      return;
    }

    let updatedList = [...data.ausenciasTemporarias];
    if (editingAusenciaItem) {
      updatedList = updatedList.map((item) =>
        item.id === editingAusenciaItem.id
          ? {
              ...item,
              colaborador: formAusenciaColaborador,
              motivo: formAusenciaMotivo,
              data: formAusenciaData,
              horarioInicio: formAusenciaHorarioInicio,
              horarioFim: formAusenciaHorarioFim,
              observacao: formAusenciaObservacao
            }
          : item
      );
    } else {
      const newItem: AusenciaTemporariaItem = {
        id: `aus-${Date.now()}`,
        colaborador: formAusenciaColaborador,
        motivo: formAusenciaMotivo,
        data: formAusenciaData,
        horarioInicio: formAusenciaHorarioInicio,
        horarioFim: formAusenciaHorarioFim,
        observacao: formAusenciaObservacao
      };
      updatedList.push(newItem);
    }

    const newData = { ...data, ausenciasTemporarias: updatedList };
    await persistData(newData);
    setIsAusenciaModalOpen(false);
  };

  // Antonio Batista - SEG_002 - Remove um registro de ausência temporária da lista.
  const handleDeleteAusenciaItem = async (id: string) => {
    if (!isEditModeActive) {
      alert('Para excluir registros, ative o Modo de Edição no topo da tela.');
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir esta ausência temporária?')) {
      const updatedList = data.ausenciasTemporarias.filter((item) => item.id !== id);
      const newData = { ...data, ausenciasTemporarias: updatedList };
      await persistData(newData);
    }
  };

  // Antonio Batista - SEG_002 - Calcula a diferença em dias entre duas datas informadas.
  const calculateDays = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return 0;
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return isNaN(diffDays) ? 0 : diffDays;
  };

  // Antonio Batista - SEG_002 - Formata a exibição de datas no padrão DD/MM/YYYY.
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  // --- Dynamic Option Lists for Multi-Select ---
  const allFeriasColaboradores = useMemo(() => {
    const set = new Set<string>();
    data.feriasDayOffs.forEach((f) => {
      if (f.colaborador) set.add(f.colaborador);
    });
    usersList.forEach((u) => {
      if (u.name) set.add(u.name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [data.feriasDayOffs, usersList]);

  const allFeriasTipos = ['Férias', 'DayOff'];

  const allFeriasStatus = useMemo(() => {
    const set = new Set<string>(['Confirmado', 'Previsto', 'Ag. Aprovação', 'Cancelado']);
    data.feriasDayOffs.forEach((f) => {
      if (f.status) set.add(f.status);
    });
    return Array.from(set);
  }, [data.feriasDayOffs]);

  const allAusenciaColaboradores = useMemo(() => {
    const set = new Set<string>();
    data.ausenciasTemporarias.forEach((a) => {
      if (a.colaborador) set.add(a.colaborador);
    });
    usersList.forEach((u) => {
      if (u.name) set.add(u.name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [data.ausenciasTemporarias, usersList]);

  const allAusenciaMotivos = useMemo(() => {
    const set = new Set<string>([
      'Consulta Médica',
      'Treinamento',
      'Atestado',
      'Compromisso Pessoal',
      'Trabalho Remoto / Externo',
      'Outro'
    ]);
    data.ausenciasTemporarias.forEach((a) => {
      if (a.motivo) set.add(a.motivo);
    });
    return Array.from(set);
  }, [data.ausenciasTemporarias]);

  // Antonio Batista - SEG_002 - Alterna a chave e o sentido de ordenação da tabela de Férias e DayOffs.
  const handleSortFerias = (key: FeriasSortKey) => {
    if (sortFeriasKey === key) {
      setSortFeriasDir(sortFeriasDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortFeriasKey(key);
      setSortFeriasDir('asc');
    }
  };

  // Antonio Batista - SEG_002 - Alterna a chave e o sentido de ordenação da tabela de Ausências Temporárias.
  const handleSortAusencia = (key: AusenciaSortKey) => {
    if (sortAusenciaKey === key) {
      setSortAusenciaDir(sortAusenciaDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortAusenciaKey(key);
      setSortAusenciaDir('asc');
    }
  };

  // --- Filter Counts for UI badges ---
  const activeFeriasFiltersCount = useMemo(() => {
    let count = 0;
    if (searchFerias.trim()) count++;
    if (selectedFeriasColaboradores.length > 0) count++;
    if (selectedFeriasTipos.length > 0) count++;
    if (selectedFeriasStatus.length > 0) count++;
    return count;
  }, [searchFerias, selectedFeriasColaboradores, selectedFeriasTipos, selectedFeriasStatus]);

  const activeAusenciaFiltersCount = useMemo(() => {
    let count = 0;
    if (searchAusencia.trim()) count++;
    if (selectedAusenciaColaboradores.length > 0) count++;
    if (selectedAusenciaMotivos.length > 0) count++;
    return count;
  }, [searchAusencia, selectedAusenciaColaboradores, selectedAusenciaMotivos]);

  // --- Filtered and Sorted Ferias / DayOffs list ---
  const filteredAndSortedFeriasList = useMemo(() => {
    // 1. Filter
    const filtered = data.feriasDayOffs.filter((item) => {
      const matchesSearch =
        item.colaborador.toLowerCase().includes(searchFerias.toLowerCase()) ||
        (item.observacao || '').toLowerCase().includes(searchFerias.toLowerCase());

      const matchesColaborador =
        selectedFeriasColaboradores.length === 0 || selectedFeriasColaboradores.includes(item.colaborador);

      const matchesTipo =
        selectedFeriasTipos.length === 0 || selectedFeriasTipos.includes(item.tipo);

      const matchesStatus =
        selectedFeriasStatus.length === 0 || selectedFeriasStatus.includes(item.status || 'Confirmado');

      return matchesSearch && matchesColaborador && matchesTipo && matchesStatus;
    });

    // 2. Sort
    filtered.sort((a, b) => {
      let comp = 0;
      if (sortFeriasKey === 'colaborador') {
        comp = a.colaborador.localeCompare(b.colaborador, 'pt-BR');
      } else if (sortFeriasKey === 'tipo') {
        comp = a.tipo.localeCompare(b.tipo, 'pt-BR');
      } else if (sortFeriasKey === 'dataInicio') {
        comp = (a.dataInicio || '').localeCompare(b.dataInicio || '');
      } else if (sortFeriasKey === 'dias') {
        const daysA = calculateDays(a.dataInicio, a.dataFim);
        const daysB = calculateDays(b.dataInicio, b.dataFim);
        comp = daysA - daysB;
      } else if (sortFeriasKey === 'status') {
        comp = (a.status || 'Confirmado').localeCompare(b.status || 'Confirmado', 'pt-BR');
      }
      return sortFeriasDir === 'asc' ? comp : -comp;
    });

    return filtered;
  }, [
    data.feriasDayOffs,
    searchFerias,
    selectedFeriasColaboradores,
    selectedFeriasTipos,
    selectedFeriasStatus,
    sortFeriasKey,
    sortFeriasDir
  ]);

  // --- Filtered and Sorted Ausencias list ---
  const filteredAndSortedAusenciasList = useMemo(() => {
    // 1. Filter
    const filtered = data.ausenciasTemporarias.filter((item) => {
      const matchesSearch =
        item.colaborador.toLowerCase().includes(searchAusencia.toLowerCase()) ||
        item.motivo.toLowerCase().includes(searchAusencia.toLowerCase()) ||
        (item.observacao || '').toLowerCase().includes(searchAusencia.toLowerCase());

      const matchesColaborador =
        selectedAusenciaColaboradores.length === 0 || selectedAusenciaColaboradores.includes(item.colaborador);

      const matchesMotivo =
        selectedAusenciaMotivos.length === 0 || selectedAusenciaMotivos.includes(item.motivo);

      return matchesSearch && matchesColaborador && matchesMotivo;
    });

    // 2. Sort
    filtered.sort((a, b) => {
      let comp = 0;
      if (sortAusenciaKey === 'colaborador') {
        comp = a.colaborador.localeCompare(b.colaborador, 'pt-BR');
      } else if (sortAusenciaKey === 'motivo') {
        comp = a.motivo.localeCompare(b.motivo, 'pt-BR');
      } else if (sortAusenciaKey === 'data') {
        const dateStrA = `${a.data || ''}T${a.horarioInicio || '00:00'}`;
        const dateStrB = `${b.data || ''}T${b.horarioInicio || '00:00'}`;
        comp = dateStrA.localeCompare(dateStrB);
      }
      return sortAusenciaDir === 'asc' ? comp : -comp;
    });

    return filtered;
  }, [
    data.ausenciasTemporarias,
    searchAusencia,
    selectedAusenciaColaboradores,
    selectedAusenciaMotivos,
    sortAusenciaKey,
    sortAusenciaDir
  ]);

  // Antonio Batista - SEG_002 - Abre o modal para cadastro ou edição de registros de Deploy da aplicação.
  const handleOpenDeployModal = (item?: DeployItem) => {
    if (!isEditModeActive) {
      alert('Para cadastrar ou editar registros, ative o Modo de Edição no topo da tela.');
      return;
    }
    if (item) {
      setEditingDeployItem(item);
      setFormDeployData(item.data);
      setFormDeployVersao(item.versao);
      setFormDeployComponente(item.componente);
      setFormDeployLink(item.link || '');
    } else {
      setEditingDeployItem(null);
      const today = new Date().toISOString().split('T')[0];
      setFormDeployData(today);
      setFormDeployVersao('');
      setFormDeployComponente(appParams?.components?.[0]?.label || 'Back-End');
      setFormDeployLink('');
    }
    setIsDeployModalOpen(true);
  };

  // Antonio Batista - SEG_002 - Salva os dados do formulário de Deploy no banco e atualiza a interface.
  const handleSaveDeployModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDeployData || !formDeployVersao || !formDeployComponente) {
      alert('Por favor, preencha a data, versão e componente.');
      return;
    }

    let updatedList = [...(data.deploys || [])];
    if (editingDeployItem) {
      updatedList = updatedList.map((item) =>
        item.id === editingDeployItem.id
          ? {
              ...item,
              data: formDeployData,
              versao: formDeployVersao,
              componente: formDeployComponente,
              link: formDeployLink
            }
          : item
      );
    } else {
      const newItem: DeployItem = {
        id: `dep-${Date.now()}`,
        data: formDeployData,
        versao: formDeployVersao,
        componente: formDeployComponente,
        link: formDeployLink
      };
      updatedList.push(newItem);
    }

    const newData = { ...data, deploys: updatedList };
    await persistData(newData);
    setIsDeployModalOpen(false);
  };

  // Antonio Batista - SEG_002 - Abre o modal listando tasks do board, planning e refinement pertencentes a um deploy.
  const handleOpenViewDeployModal = (versao: string, deployItems: DeployItem[]) => {
    setViewingDeployVersao(versao);
    const collectedTasks: {
      id: string;
      name: string;
      type: 'board' | 'planning' | 'refinement';
      status?: string;
      jiraOrMovidesk?: string;
      owner?: string;
      periodLabel?: string;
    }[] = [];

    // Check if any items have explicitly stored related tasks
    let hasExplicitRelated = false;
    deployItems.forEach(item => {
      if (item.relatedTasks && item.relatedTasks.length > 0) {
        hasExplicitRelated = true;
        item.relatedTasks.forEach(rt => {
          collectedTasks.push({
            id: rt.id,
            name: rt.name,
            type: rt.type,
            jiraOrMovidesk: rt.jiraOrMovidesk
          });
        });
      }
    });

    if (!hasExplicitRelated) {
      // Fallback: Scan all periods, planning, and refinement for tasks matching status 'Ag. Deploy', 'Concluído', or matching version/text
      const periods = getPeriods();
      periods.forEach(p => {
        const atividades = getAtividadesForPeriod(p.id);
        atividades.forEach(t => {
          if (t.status === 'Ag. Deploy' || (t.notes && t.notes.toLowerCase().includes(versao.toLowerCase()))) {
            collectedTasks.push({
              id: t.id,
              name: t.name,
              type: 'board',
              status: t.status,
              jiraOrMovidesk: t.jiraOrMovidesk,
              owner: t.owner,
              periodLabel: p.label
            });
          }
        });
      });

      const planning = getPlanningData();
      planning.forEach(pl => {
        if (pl.estado === 'Aprovado' || pl.estado === 'Em Andamento' || pl.descricao?.toLowerCase().includes(versao.toLowerCase())) {
          collectedTasks.push({
            id: pl.id,
            name: pl.atividade,
            type: 'planning',
            status: pl.estado,
            jiraOrMovidesk: pl.jiraTicket
          });
        }
      });

      const refinement = getRefinementData();
      refinement.forEach(ref => {
        if (ref.estado === 'Aprovado' || ref.estado === 'Concluído' || ref.atividade.toLowerCase().includes(versao.toLowerCase())) {
          collectedTasks.push({
            id: ref.id,
            name: ref.atividade,
            type: 'refinement',
            status: ref.estado,
            jiraOrMovidesk: ref.jiraTicket
          });
        }
      });

      // If still empty, grab all 'Ag. Deploy' tasks from current periods as a helpful default
      if (collectedTasks.length === 0) {
        periods.forEach(p => {
          const atividades = getAtividadesForPeriod(p.id);
          atividades.forEach(t => {
            collectedTasks.push({
              id: t.id,
              name: t.name,
              type: 'board',
              status: t.status,
              jiraOrMovidesk: t.jiraOrMovidesk,
              owner: t.owner,
              periodLabel: p.label
            });
          });
        });
      }
    }

    setViewingDeployTasks(collectedTasks);
    setIsViewDeployModalOpen(true);
  };

  // Absence Info logic
  const todayStr = new Date().toISOString().split('T')[0];
  
  const ausenciasHoje = useMemo(() => {
    const list: string[] = [];
    data.feriasDayOffs.forEach(f => {
      if (todayStr >= f.dataInicio && todayStr <= f.dataFim && (f.status === 'Confirmado' || f.status === 'Previsto')) {
        list.push(`${f.colaborador} (${f.tipo})`);
      }
    });
    data.ausenciasTemporarias.forEach(a => {
      if (a.data === todayStr) {
        list.push(`${a.colaborador} (${a.motivo}${a.horarioInicio ? ` ${a.horarioInicio}` : ''})`);
      }
    });
    return list;
  }, [data, todayStr]);

  const proximaAusencia = useMemo(() => {
    const allFuture: { date: string, desc: string }[] = [];
    
    data.feriasDayOffs.forEach(f => {
      if (f.dataInicio > todayStr && (f.status === 'Confirmado' || f.status === 'Previsto')) {
        allFuture.push({ date: f.dataInicio, desc: `${f.colaborador} (${f.tipo})` });
      }
    });
    
    data.ausenciasTemporarias.forEach(a => {
      if (a.data > todayStr) {
        allFuture.push({ date: a.data, desc: `${a.colaborador} (${a.motivo})` });
      }
    });
    
    if (allFuture.length === 0) return null;
    
    return allFuture.sort((a, b) => a.date.localeCompare(b.date))[0];
  }, [data, todayStr]);

  // Group deploys by version
  const deploysAgrupados = useMemo(() => {
    const groups: Record<string, DeployItem[]> = {};
    (data.deploys || []).forEach(d => {
      if (!groups[d.versao]) groups[d.versao] = [];
      groups[d.versao].push(d);
    });
    // Sort versions by date of first deploy in group (descending)
    return Object.entries(groups).sort((a, b) => {
      const dateA = a[1][0].data;
      const dateB = b[1][0].data;
      return dateB.localeCompare(dateA);
    });
  }, [data.deploys]);

  const clearFeriasFilters = () => {
    setSearchFerias('');
    setSelectedFeriasColaboradores([]);
    setSelectedFeriasTipos([]);
    setSelectedFeriasStatus([]);
  };

  const clearAusenciaFilters = () => {
    setSearchAusencia('');
    setSelectedAusenciaColaboradores([]);
    setSelectedAusenciaMotivos([]);
  };

  // Sort indicator icon helper
  const renderSortIcon = (currentKey: string, targetKey: string, dir: 'asc' | 'desc') => {
    if (currentKey !== targetKey) {
      return <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />;
    }
    return dir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-[#343180] shrink-0" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[#343180] shrink-0" />
    );
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. Header with Title & Action Buttons */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <CalendarDays className="h-6 w-6 text-[#343180]" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight font-display">
              Datas e Avisos
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Mapeamento de períodos de férias, dayOffs e ausências temporárias para planejamento da equipe
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Action Button: Add Entry */}
          <button
            onClick={() => handleOpenFeriasModal()}
            className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
              isEditModeActive
                ? 'bg-[#343180] hover:bg-[#282665] text-white'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed opacity-70'
            }`}
            title={isEditModeActive ? 'Cadastrar Férias / DayOff' : 'Ative o Modo de Edição para cadastrar'}
          >
            <Plus className="h-4 w-4" />
            <span>Nova Férias / DayOff</span>
          </button>

          <button
            onClick={() => handleOpenAusenciaModal()}
            className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
              isEditModeActive
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed opacity-70'
            }`}
            title={isEditModeActive ? 'Cadastrar Ausência Temporária' : 'Ative o Modo de Edição para cadastrar'}
          >
            <Plus className="h-4 w-4" />
            <span>Nova Ausência</span>
          </button>
        </div>
      </div>

      {/* Save Error Alert */}
      {saveError && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{saveError}</span>
          </div>
          <button onClick={() => setSaveError(null)} className="text-red-500 hover:text-red-700 font-bold">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Read-Only Mode Banner if edit mode is off */}
      {!isEditModeActive && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center space-x-2">
            <Lock className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Modo de Leitura:</strong> As alterações e cadastros estão desabilitados. Ative o{' '}
              <strong>Modo de Edição</strong> no menu superior para realizar alterações.
            </span>
          </div>
        </div>
      )}

      {/* 2. Absence Info & Next Absence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Ausências Hoje */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex items-start space-x-4">
          <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 shrink-0">
            <UserIcon className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Ausência(s) de Hoje
            </span>
            <div className="mt-1">
              {ausenciasHoje.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {ausenciasHoje.map((a, i) => (
                    <span key={i} className="text-sm font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                      {a}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm font-medium text-slate-400 italic">Nenhuma ausência registrada para hoje.</span>
              )}
            </div>
          </div>
        </div>

        {/* Próxima Ausência */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex items-start space-x-4">
          <div className="p-3 bg-sky-50 text-sky-700 rounded-xl border border-sky-100 shrink-0">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Próxima Ausência Prevista
            </span>
            <div className="mt-1">
              {proximaAusencia ? (
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900">{proximaAusencia.desc}</span>
                  <span className="text-xs text-[#343180] font-bold mt-0.5">{formatDateDisplay(proximaAusencia.date)}</span>
                </div>
              ) : (
                <span className="text-sm font-medium text-slate-400 italic">Não há ausências futuras registradas.</span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 3. DUAL QUADROS / PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ======================================================== */}
        {/* QUADRO 1: PERÍODOS DE FÉRIAS E DAYOFFS                  */}
        {/* ======================================================== */}
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs flex flex-col">
          
          {/* Quadro Header */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-[#343180]" />
                <h2 className="text-base font-bold text-slate-900 font-display">
                  Períodos de Férias e DayOffs
                </h2>
                <span className="text-[10px] font-bold bg-purple-100 text-[#343180] px-2 py-0.5 rounded-full border border-purple-200">
                  {filteredAndSortedFeriasList.length} / {data.feriasDayOffs.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Acompanhamento das folgas estendidas e férias da equipe
              </p>
            </div>

            {isEditModeActive && (
              <button
                onClick={() => handleOpenFeriasModal()}
                className="inline-flex items-center space-x-1 text-xs font-bold text-[#343180] hover:text-[#25235c] bg-white border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Adicionar</span>
              </button>
            )}
          </div>

          {/* Quadro Controls & Multi-Select Filters */}
          <div className="p-4 border-b border-slate-100 bg-white space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-2 flex-wrap">
              
              {/* Search input */}
              <div className="relative flex-1 min-w-[180px] w-full">
                <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar colaborador ou obs..."
                  value={searchFerias}
                  onChange={(e) => setSearchFerias(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#343180]/20 focus:border-[#343180] transition-all"
                />
              </div>

              {/* Multi-Select: Colaborador */}
              <MultiSelectDropdown
                label="Colaborador"
                options={allFeriasColaboradores}
                selectedValues={selectedFeriasColaboradores}
                onChange={setSelectedFeriasColaboradores}
                accentColor="purple"
              />

              {/* Multi-Select: Tipo */}
              <MultiSelectDropdown
                label="Tipo"
                options={allFeriasTipos}
                selectedValues={selectedFeriasTipos}
                onChange={setSelectedFeriasTipos}
                accentColor="purple"
              />

              {/* Multi-Select: Status */}
              <MultiSelectDropdown
                label="Status"
                options={allFeriasStatus}
                selectedValues={selectedFeriasStatus}
                onChange={setSelectedFeriasStatus}
                accentColor="purple"
              />

              {/* Clear filters if active */}
              {activeFeriasFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={clearFeriasFilters}
                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                  title="Limpar todos os filtros deste quadro"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Limpar ({activeFeriasFiltersCount})</span>
                </button>
              )}

            </div>
          </div>

          {/* Table / List */}
          <div className="flex-1 overflow-x-auto">
            {filteredAndSortedFeriasList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                Nenhum registro de férias ou DayOff encontrado para os filtros selecionados.
              </div>
            ) : (
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold uppercase tracking-wider text-[10px] select-none">
                  <tr>
                    {/* Colaborador Sort Column */}
                    <th
                      onClick={() => handleSortFerias('colaborador')}
                      className="px-4 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors group"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Colaborador</span>
                        {renderSortIcon(sortFeriasKey, 'colaborador', sortFeriasDir)}
                      </div>
                    </th>

                    {/* Tipo Sort Column */}
                    <th
                      onClick={() => handleSortFerias('tipo')}
                      className="px-3 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors group"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Tipo</span>
                        {renderSortIcon(sortFeriasKey, 'tipo', sortFeriasDir)}
                      </div>
                    </th>

                    {/* Período / Data Início Sort Column */}
                    <th
                      onClick={() => handleSortFerias('dataInicio')}
                      className="px-3 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors group"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Período</span>
                        {renderSortIcon(sortFeriasKey, 'dataInicio', sortFeriasDir)}
                      </div>
                    </th>

                    {/* Dias Sort Column */}
                    <th
                      onClick={() => handleSortFerias('dias')}
                      className="px-3 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors group"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Duração</span>
                        {renderSortIcon(sortFeriasKey, 'dias', sortFeriasDir)}
                      </div>
                    </th>

                    {/* Status Sort Column */}
                    <th
                      onClick={() => handleSortFerias('status')}
                      className="px-3 py-3 text-center cursor-pointer hover:bg-slate-100/80 transition-colors group"
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Status</span>
                        {renderSortIcon(sortFeriasKey, 'status', sortFeriasDir)}
                      </div>
                    </th>

                    {isEditModeActive && <th className="px-3 py-3 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredAndSortedFeriasList.map((item) => {
                    const days = calculateDays(item.dataInicio, item.dataFim);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Colaborador */}
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 text-[#343180] flex items-center justify-center font-bold text-[10px] shrink-0 border border-slate-200">
                              {item.colaborador.charAt(0)}
                            </div>
                            <div>
                              <span className="block truncate max-w-[130px]" title={item.colaborador}>
                                {item.colaborador}
                              </span>
                              {item.observacao && (
                                <span className="text-[10px] font-normal text-slate-500 block truncate max-w-[150px]" title={item.observacao}>
                                  {item.observacao}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Tipo */}
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                              item.tipo === 'Férias'
                                ? 'bg-purple-50 text-[#343180] border-purple-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {item.tipo}
                          </span>
                        </td>

                        {/* Período */}
                        <td className="px-3 py-3 text-slate-600">
                          <div className="font-medium text-slate-800">
                            {formatDateDisplay(item.dataInicio)} - {formatDateDisplay(item.dataFim)}
                          </div>
                        </td>

                        {/* Duração em Dias */}
                        <td className="px-3 py-3 font-semibold text-slate-700">
                          <span className="inline-flex items-center bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px]">
                            {days} {days === 1 ? 'dia' : 'dias'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === 'Confirmado'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : item.status === 'Previsto'
                                ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                : item.status === 'Ag. Aprovação'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}
                          >
                            {item.status || 'Confirmado'}
                          </span>
                        </td>

                        {/* Actions */}
                        {isEditModeActive && (
                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => handleOpenFeriasModal(item)}
                                className="p-1 text-slate-500 hover:text-[#343180] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                title="Editar"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteFeriasItem(item.id)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                title="Excluir"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

        </div>

        {/* ======================================================== */}
        {/* QUADRO 2: AUSÊNCIAS TEMPORÁRIAS                         */}
        {/* ======================================================== */}
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs flex flex-col">
          
          {/* Quadro Header */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <Clock3 className="h-5 w-5 text-emerald-700" />
                <h2 className="text-base font-bold text-slate-900 font-display">
                  Ausências Temporárias
                </h2>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  {filteredAndSortedAusenciasList.length} / {data.ausenciasTemporarias.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Consultas médicas, treinamentos, saídas pontuais e compromissos
              </p>
            </div>

            {isEditModeActive && (
              <button
                onClick={() => handleOpenAusenciaModal()}
                className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Adicionar</span>
              </button>
            )}
          </div>

          {/* Quadro Controls & Multi-Select Filters */}
          <div className="p-4 border-b border-slate-100 bg-white space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-2 flex-wrap">
              
              {/* Search input */}
              <div className="relative flex-1 min-w-[180px] w-full">
                <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar colaborador ou motivo..."
                  value={searchAusencia}
                  onChange={(e) => setSearchAusencia(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all"
                />
              </div>

              {/* Multi-Select: Colaborador */}
              <MultiSelectDropdown
                label="Colaborador"
                options={allAusenciaColaboradores}
                selectedValues={selectedAusenciaColaboradores}
                onChange={setSelectedAusenciaColaboradores}
                accentColor="emerald"
              />

              {/* Multi-Select: Motivo */}
              <MultiSelectDropdown
                label="Motivo"
                options={allAusenciaMotivos}
                selectedValues={selectedAusenciaMotivos}
                onChange={setSelectedAusenciaMotivos}
                accentColor="emerald"
              />

              {/* Clear filters if active */}
              {activeAusenciaFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={clearAusenciaFilters}
                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                  title="Limpar todos os filtros deste quadro"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Limpar ({activeAusenciaFiltersCount})</span>
                </button>
              )}

            </div>
          </div>

          {/* Table / List */}
          <div className="flex-1 overflow-x-auto">
            {filteredAndSortedAusenciasList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                Nenhuma ausência temporária encontrada para os filtros selecionados.
              </div>
            ) : (
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold uppercase tracking-wider text-[10px] select-none">
                  <tr>
                    {/* Colaborador Sort Column */}
                    <th
                      onClick={() => handleSortAusencia('colaborador')}
                      className="px-4 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors group"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Colaborador</span>
                        {renderSortIcon(sortAusenciaKey, 'colaborador', sortAusenciaDir)}
                      </div>
                    </th>

                    {/* Motivo Sort Column */}
                    <th
                      onClick={() => handleSortAusencia('motivo')}
                      className="px-3 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors group"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Motivo</span>
                        {renderSortIcon(sortAusenciaKey, 'motivo', sortAusenciaDir)}
                      </div>
                    </th>

                    {/* Data / Horário Sort Column */}
                    <th
                      onClick={() => handleSortAusencia('data')}
                      className="px-3 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors group"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Data e Horário</span>
                        {renderSortIcon(sortAusenciaKey, 'data', sortAusenciaDir)}
                      </div>
                    </th>

                    {isEditModeActive && <th className="px-3 py-3 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredAndSortedAusenciasList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Colaborador */}
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 border border-emerald-200">
                            {item.colaborador.charAt(0)}
                          </div>
                          <div>
                            <span className="block truncate max-w-[130px]" title={item.colaborador}>
                              {item.colaborador}
                            </span>
                            {item.observacao && (
                              <span className="text-[10px] font-normal text-slate-500 block truncate max-w-[150px]" title={item.observacao}>
                                {item.observacao}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Motivo */}
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {item.motivo}
                        </span>
                      </td>

                      {/* Data e Horario */}
                      <td className="px-3 py-3 text-slate-600">
                        <div className="font-medium text-slate-800">
                          {formatDateDisplay(item.data)}
                        </div>
                        {(item.horarioInicio || item.horarioFim) && (
                          <span className="text-[10px] text-slate-500 block mt-0.5 font-semibold">
                            {item.horarioInicio || '00:00'} - {item.horarioFim || '23:59'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      {isEditModeActive && (
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => handleOpenAusenciaModal(item)}
                              className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAusenciaItem(item.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>

        {/* ======================================================== */}
        {/* QUADRO 3: DATAS DE DEPLOY                               */}
        {/* ======================================================== */}
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs flex flex-col lg:col-span-2">
          
          {/* Quadro Header */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-indigo-700" />
                <h2 className="text-base font-bold text-slate-900 font-display">
                  Datas de Deploy
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Registro de deploys realizados agrupados por versão corretora
              </p>
            </div>

            {isEditModeActive && (
              <button
                onClick={() => handleOpenDeployModal()}
                className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Novo Deploy</span>
              </button>
            )}
          </div>

          <div className="p-5">
            {deploysAgrupados.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                Nenhum deploy registrado.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {deploysAgrupados.map(([versao, items]) => (
                  <div key={versao} className="border border-slate-100 rounded-xl overflow-hidden shadow-2xs bg-white">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-xs font-extrabold text-slate-900 truncate" title={versao}>{versao}</span>
                        <button
                          onClick={() => handleOpenViewDeployModal(versao, items)}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer transition-colors shrink-0"
                          title="Visualizar tasks do Board, Planning e Refinamento deste deploy"
                        >
                          Visualizar
                        </button>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight shrink-0 ml-2">
                        {items.length} {items.length === 1 ? 'Deploy' : 'Deploys'}
                      </span>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {items.map(item => (
                        <div key={item.id} className="p-3 flex items-center justify-between hover:bg-slate-50/30 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-slate-800">{formatDateDisplay(item.data)}</span>
                              <span className="text-[10px] text-slate-500 font-medium">{item.componente}</span>
                            </div>
                            {item.link && (
                              <a 
                                href={item.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                title="Ver link externo"
                              >
                                <Briefcase className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                          {isEditModeActive && (
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleOpenDeployModal(item)}
                                className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                                title="Editar"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteDeployItem(item.id)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                                title="Excluir"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* MODAL: CADASTRO/EDIÇÃO DE FÉRIAS E DAYOFF               */}
      {/* ======================================================== */}
      {isFeriasModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-[#343180]" />
                <h3 className="text-base font-bold text-slate-900 font-display">
                  {editingFeriasItem ? 'Editar Férias / DayOff' : 'Nova Férias / DayOff'}
                </h3>
              </div>
              <button
                onClick={() => setIsFeriasModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFeriasModal} className="p-5 space-y-4 text-xs">
              
              {/* Colaborador */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Colaborador *
                </label>
                <select
                  value={formFeriasColaborador}
                  onChange={(e) => setFormFeriasColaborador(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#343180]/20"
                  required
                >
                  {usersList.map((u) => (
                    <option key={u.username} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                  {!usersList.some((u) => u.name === formFeriasColaborador) && formFeriasColaborador && (
                    <option value={formFeriasColaborador}>{formFeriasColaborador}</option>
                  )}
                </select>
              </div>

              {/* Tipo and Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={formFeriasTipo}
                    onChange={(e) => setFormFeriasTipo(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#343180]/20"
                  >
                    <option value="Férias">Férias</option>
                    <option value="DayOff">DayOff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Status
                  </label>
                  <select
                    value={formFeriasStatus}
                    onChange={(e) => setFormFeriasStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#343180]/20"
                  >
                    <option value="Confirmado">Confirmado</option>
                    <option value="Previsto">Previsto</option>
                    <option value="Ag. Aprovação">Ag. Aprovação</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Data Início *
                  </label>
                  <input
                    type="date"
                    value={formFeriasDataInicio}
                    onChange={(e) => setFormFeriasDataInicio(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#343180]/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Data Fim *
                  </label>
                  <input
                    type="date"
                    value={formFeriasDataFim}
                    onChange={(e) => setFormFeriasDataFim(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#343180]/20"
                    required
                  />
                </div>
              </div>

              {/* Observação */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Observação
                </label>
                <textarea
                  rows={3}
                  value={formFeriasObservacao}
                  onChange={(e) => setFormFeriasObservacao(e.target.value)}
                  placeholder="Motivo ou observação sobre o período..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#343180]/20 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFeriasModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#343180] hover:bg-[#282665] text-white font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Registro'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CADASTRO/EDIÇÃO DE AUSÊNCIA TEMPORÁRIA           */}
      {/* ======================================================== */}
      {isAusenciaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock3 className="h-5 w-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900 font-display">
                  {editingAusenciaItem ? 'Editar Ausência Temporária' : 'Nova Ausência Temporária'}
                </h3>
              </div>
              <button
                onClick={() => setIsAusenciaModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAusenciaModal} className="p-5 space-y-4 text-xs">
              
              {/* Colaborador */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Colaborador *
                </label>
                <select
                  value={formAusenciaColaborador}
                  onChange={(e) => setFormAusenciaColaborador(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  required
                >
                  {usersList.map((u) => (
                    <option key={u.username} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                  {!usersList.some((u) => u.name === formAusenciaColaborador) && formAusenciaColaborador && (
                    <option value={formAusenciaColaborador}>{formAusenciaColaborador}</option>
                  )}
                </select>
              </div>

              {/* Motivo and Data */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Motivo *
                  </label>
                  <select
                    value={formAusenciaMotivo}
                    onChange={(e) => setFormAusenciaMotivo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                    required
                  >
                    <option value="Consulta Médica">Consulta Médica</option>
                    <option value="Treinamento">Treinamento</option>
                    <option value="Atestado">Atestado</option>
                    <option value="Compromisso Pessoal">Compromisso Pessoal</option>
                    <option value="Trabalho Remoto / Externo">Trabalho Remoto / Externo</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={formAusenciaData}
                    onChange={(e) => setFormAusenciaData(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                    required
                  />
                </div>
              </div>

              {/* Horarios */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Horário Início
                  </label>
                  <input
                    type="time"
                    value={formAusenciaHorarioInicio}
                    onChange={(e) => setFormAusenciaHorarioInicio(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Horário Fim
                  </label>
                  <input
                    type="time"
                    value={formAusenciaHorarioFim}
                    onChange={(e) => setFormAusenciaHorarioFim(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  />
                </div>
              </div>

              {/* Observação */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Observação
                </label>
                <textarea
                  rows={3}
                  value={formAusenciaObservacao}
                  onChange={(e) => setFormAusenciaObservacao(e.target.value)}
                  placeholder="Detalhes ou observações do compromisso..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/20 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAusenciaModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Ausência'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CADASTRO/EDIÇÃO DE DEPLOY                         */}
      {/* ======================================================== */}
      {isDeployModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-indigo-700" />
                <h3 className="text-base font-bold text-slate-900 font-display">
                  {editingDeployItem ? 'Editar Deploy' : 'Novo Deploy'}
                </h3>
              </div>
              <button
                onClick={() => setIsDeployModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDeployModal} className="p-5 space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                {/* Data */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={formDeployData}
                    onChange={(e) => setFormDeployData(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                    required
                  />
                </div>

                {/* Componente */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Componente *
                  </label>
                  <select
                    value={formDeployComponente}
                    onChange={(e) => setFormDeployComponente(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                    required
                  >
                    {appParams?.components?.map((c: any) => (
                      <option key={c.id} value={c.label}>{c.label}</option>
                    ))}
                    {!appParams?.components && (
                      <>
                        <option value="Back-End">Back-End</option>
                        <option value="Front-End">Front-End</option>
                        <option value="Mobile">Mobile</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Versão Corretora */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Versão Corretora *
                </label>
                <input
                  type="text"
                  value={formDeployVersao}
                  onChange={(e) => setFormDeployVersao(e.target.value)}
                  placeholder="Ex: V1.2.3 ou Refinamento 24/07"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                  required
                />
              </div>

              {/* Link Externo */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Link Externo (Opcional)
                </label>
                <input
                  type="url"
                  value={formDeployLink}
                  onChange={(e) => setFormDeployLink(e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeployModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Deploy'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: VISUALIZAR TASKS DO DEPLOY                        */}
      {/* ======================================================== */}
      {isViewDeployModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-indigo-700" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    Tasks do Deploy: <span className="text-indigo-700">{viewingDeployVersao}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Itens do Board, Planning e Refinamento vinculados ou pendentes nesta versão
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsViewDeployModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {viewingDeployTasks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs italic">
                  Nenhuma task ou item encontrado para esta versão de deploy.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {viewingDeployTasks.map((t, idx) => (
                    <div key={idx} className="p-3.5 bg-white hover:bg-slate-50/50 flex items-center justify-between transition-colors">
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                          t.type === 'board' ? 'bg-purple-100 text-purple-800' :
                          t.type === 'planning' ? 'bg-blue-100 text-blue-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {t.type}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800">{t.name}</span>
                          <div className="flex items-center space-x-2 mt-0.5 text-[10px] text-slate-500 font-medium">
                            {t.jiraOrMovidesk && <span className="text-indigo-600 font-semibold">{t.jiraOrMovidesk}</span>}
                            {t.owner && <span>• Resp: {t.owner}</span>}
                            {t.periodLabel && <span>• Sprint: {t.periodLabel}</span>}
                          </div>
                        </div>
                      </div>
                      {t.status && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
                          {t.status}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsViewDeployModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer text-xs"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
