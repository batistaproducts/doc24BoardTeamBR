import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Calendar,
  Save,
  CheckCircle,
  AlertCircle,
  FileCode,
  ArrowRight,
  Info,
  Upload,
  Download,
  FileSpreadsheet,
  Check,
  Eye,
  RefreshCw
} from 'lucide-react';
import { Period, User, Atividade } from '../types';
import {
  getPeriods,
  getRawFile,
  saveRawFile,
  duplicatePeriod,
  importPeriod,
  resetAllToInitial,
  resetFileToInitial
} from '../lib/dataStore';

// CSV line parser that respects double quoted elements containing delimiters
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

// Parses full CSV text into Atividade objects
function parseCSVContent(content: string, periodId: string): { tasks: Atividade[]; error: string | null } {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) {
    return { tasks: [], error: "O arquivo CSV deve conter pelo menos uma linha de cabeçalho e uma de dados." };
  }

  // Detect delimiter based on frequency in header line
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semicolonCount >= commaCount ? ';' : ',';

  const headers = parseCSVLine(firstLine, delimiter).map(h => h.toLowerCase());

  const findHeaderIndex = (patterns: string[], defaultIdx: number): number => {
    for (const p of patterns) {
      const idx = headers.findIndex(h => h.includes(p));
      if (idx !== -1) return idx;
    }
    return defaultIdx < headers.length ? defaultIdx : -1;
  };

  const nameIdx = findHeaderIndex(['atividade', 'nome', 'name', 'task', 'título', 'titulo', 'title'], 0);
  const jiraIdx = findHeaderIndex(['jira', 'ticket', 'movidesk', 'chamado', 'id', 'ticket_id', 'jira/ticket', 'codigo', 'código'], 1);
  const priorityIdx = findHeaderIndex(['prioridade', 'priority', 'criticidade'], 2);
  const ownerIdx = findHeaderIndex(['proprietário', 'proprietario', 'owner', 'responsável', 'responsavel', 'membro'], 3);
  const statusIdx = findHeaderIndex(['estado', 'status', 'situação', 'situacao', 'etapa', 'fase'], 4);
  const categoryIdx = findHeaderIndex(['categoria', 'category'], 5);
  const startDateIdx = findHeaderIndex(['data de início', 'data de inicio', 'inicio', 'startdate', 'start', 'data_inicio'], 6);
  const endDateIdx = findHeaderIndex(['data de fim', 'data de conclusão', 'data de conclusao', 'fim', 'enddate', 'end', 'data_fim'], 7);
  const descriptionIdx = findHeaderIndex(['descrição', 'descricao', 'description', 'detalhes'], 8);
  const notesIdx = findHeaderIndex(['anotações', 'anotacoes', 'notes', 'comentários', 'comentarios', 'obs', 'observações', 'observacoes'], 9);

  const tasks: Atividade[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i], delimiter);
    if (cols.length === 0 || (cols.length === 1 && cols[0] === '')) continue;

    const getValue = (idx: number, fallback: string = ''): string => {
      if (idx === -1 || idx >= cols.length) return fallback;
      return cols[idx] || fallback;
    };

    const name = getValue(nameIdx, 'Atividade sem nome');
    const jiraOrMovidesk = getValue(jiraIdx, '-');
    const rawPriority = getValue(priorityIdx, 'P2').toUpperCase();
    const owner = getValue(ownerIdx, 'Sem proprietário');
    const status = getValue(statusIdx, 'Pendente');
    const rawCategory = getValue(categoryIdx, 'Funcional');
    const startDate = getValue(startDateIdx, '');
    const endDate = getValue(endDateIdx, '');
    const description = getValue(descriptionIdx, '');
    const notes = getValue(notesIdx, '');

    // Map Priority to P0 | P1 | P2 | P3
    let priority: 'P0' | 'P1' | 'P2' | 'P3' = 'P2';
    if (rawPriority.startsWith('P0')) priority = 'P0';
    else if (rawPriority.startsWith('P1')) priority = 'P1';
    else if (rawPriority.startsWith('P2')) priority = 'P2';
    else if (rawPriority.startsWith('P3')) priority = 'P3';
    else if (rawPriority.includes('CRIT') || rawPriority.includes('URG')) priority = 'P0';
    else if (rawPriority.includes('ALT')) priority = 'P1';
    else if (rawPriority.includes('MED')) priority = 'P2';
    else if (rawPriority.includes('BAI')) priority = 'P3';

    // Map Category to 'Funcional' | 'Suporte Integração'
    let category: 'Funcional' | 'Suporte Integração' = 'Funcional';
    const normCategory = rawCategory.toLowerCase();
    if (normCategory.includes('suporte') || normCategory.includes('integ')) {
      category = 'Suporte Integração';
    }

    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const id = `task-${periodId}-${randomSuffix}`;

    tasks.push({
      id,
      name,
      jiraOrMovidesk,
      priority,
      owner,
      status,
      category,
      startDate,
      endDate,
      description,
      notes
    });
  }

  return { tasks, error: null };
}

interface AdminConfigProps {
  currentUser: User;
  onConfigChange: () => void;
}

export default function AdminConfig({ currentUser, onConfigChange }: AdminConfigProps) {
  // Check authorization
  if (currentUser.role !== 'Admin') {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg text-sm text-red-700 font-sans" id="admin-forbidden-view">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-base text-red-900">Acesso Restrito ao Administrador</h3>
            <p className="mt-1 leading-relaxed">
              Desculpe, seu perfil atual (<strong>{currentUser.role}</strong>) não tem permissão para acessar esta área.
              Se você precisa fazer alterações, entre em contato com o gestor do "Board de TI - Team Brasil" ou faça login como <strong>Admin</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'periods' | 'import' | 'json'>('periods');

  // JSON Editing State
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [rawJsonContent, setRawJsonContent] = useState<string>('');
  const [jsonSaveStatus, setJsonSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Period Duplication State
  const [periods, setPeriods] = useState<Period[]>([]);
  const [sourcePeriodId, setSourcePeriodId] = useState<string>('');
  const [newPeriodId, setNewPeriodId] = useState<string>(''); // e.g. "082026"
  const [newPeriodLabel, setNewPeriodLabel] = useState<string>(''); // e.g. "08/2026"
  const [inheritUnfinished, setInheritUnfinished] = useState<boolean>(true);
  const [periodStatus, setPeriodStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // CSV Import States
  const [importPeriodId, setImportPeriodId] = useState<string>('');
  const [importPeriodLabel, setImportPeriodLabel] = useState<string>('');
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [rawCsvText, setRawCsvText] = useState<string>('');
  const [parsedTasks, setParsedTasks] = useState<Atividade[]>([]);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [csvDragOver, setCsvDragOver] = useState<boolean>(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState<boolean>(false);
  const [showResetFileConfirm, setShowResetFileConfirm] = useState<boolean>(false);
  const [showResetAllConfirm, setShowResetAllConfirm] = useState<boolean>(false);

  // Load available periods and files
  const loadPeriodsAndFiles = () => {
    const loadedPeriods = getPeriods();
    setPeriods(loadedPeriods);
    if (loadedPeriods.length > 0) {
      setSourcePeriodId(loadedPeriods[0].id);
    }

    const files = [
      'usuarios.json',
      'roles_permissions.json',
      'lock_status.json',
      'periods.json',
      ...loadedPeriods.map(p => `atividades_${p.id}.json`)
    ];
    setAvailableFiles(files);
    if (files.length > 0 && !selectedFile) {
      setSelectedFile(files[0]);
    }
  };

  useEffect(() => {
    loadPeriodsAndFiles();
  }, []);

  // Load selected JSON file content
  useEffect(() => {
    if (selectedFile) {
      const content = getRawFile(selectedFile);
      setRawJsonContent(content);
      setJsonSaveStatus({ type: null, message: '' });
    }
  }, [selectedFile]);

  // Handle JSON Saving
  const handleSaveJson = () => {
    setJsonSaveStatus({ type: null, message: '' });
    
    // Attempt parse to validate
    try {
      JSON.parse(rawJsonContent);
    } catch (e: any) {
      setJsonSaveStatus({
        type: 'error',
        message: `Formato JSON inválido! Detalhes: ${e.message}`
      });
      return;
    }

    const success = saveRawFile(selectedFile, rawJsonContent);
    if (success) {
      setJsonSaveStatus({
        type: 'success',
        message: `Arquivo ${selectedFile} salvo com sucesso no banco simulado!`
      });
      onConfigChange(); // Notify parent of changes
      loadPeriodsAndFiles(); // Reload if periods file was updated
    } else {
      setJsonSaveStatus({
        type: 'error',
        message: `Falha ao salvar o arquivo ${selectedFile}.`
      });
    }
  };

  const executeResetFile = () => {
    setShowResetFileConfirm(false);
    const result = resetFileToInitial(selectedFile);
    if (result.success) {
      setJsonSaveStatus({
        type: 'success',
        message: `Arquivo ${selectedFile} restaurado para os padrões do código (initialData.ts) com sucesso!`
      });
      const content = getRawFile(selectedFile);
      setRawJsonContent(content);
      onConfigChange();
    } else {
      setJsonSaveStatus({
        type: 'error',
        message: result.error || 'Erro ao restaurar arquivo.'
      });
    }
  };

  const executeResetAll = () => {
    setShowResetAllConfirm(false);
    const result = resetAllToInitial();
    if (result.success) {
      setJsonSaveStatus({
        type: 'success',
        message: 'Banco de dados simulado sincronizado integralmente com o código original (GitHub / initialData.ts)!'
      });
      onConfigChange();
      loadPeriodsAndFiles();
      // Reload selected file
      const content = getRawFile(selectedFile);
      setRawJsonContent(content);
    }
  };

  // Handle Period Duplication
  const handleCreatePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    setPeriodStatus({ type: null, message: '' });

    // Validations
    if (!newPeriodId.trim() || !newPeriodLabel.trim()) {
      setPeriodStatus({ type: 'error', message: 'Preencha todos os campos do novo período.' });
      return;
    }

    if (!/^\d{6}$/.test(newPeriodId)) {
      setPeriodStatus({ type: 'error', message: 'O ID do período deve ser exatamente 6 dígitos no padrão MMYYYY (ex: 082026).' });
      return;
    }

    if (!/^\d{2}\/\d{4}$/.test(newPeriodLabel)) {
      setPeriodStatus({ type: 'error', message: 'O rótulo do período deve estar no formato MM/YYYY (ex: 08/2026).' });
      return;
    }

    const result = duplicatePeriod(sourcePeriodId, newPeriodId, newPeriodLabel, inheritUnfinished);

    if (result.success) {
      setPeriodStatus({
        type: 'success',
        message: `Período ${newPeriodLabel} criado com sucesso a partir de ${sourcePeriodId}! ${inheritUnfinished ? 'Tarefas não concluídas foram migradas.' : ''}`
      });
      onConfigChange(); // Notify parent
      loadPeriodsAndFiles(); // Reload
      // Reset inputs
      setNewPeriodId('');
      setNewPeriodLabel('');
    } else {
      setPeriodStatus({
        type: 'error',
        message: result.error || 'Erro ao duplicar o período.'
      });
    }
  };

  // Helper to auto-complete the label when user types ID
  const handlePeriodIdChange = (idVal: string) => {
    const cleaned = idVal.replace(/\D/g, '').substring(0, 6);
    setNewPeriodId(cleaned);
    
    if (cleaned.length === 6) {
      const month = cleaned.substring(0, 2);
      const year = cleaned.substring(2);
      setNewPeriodLabel(`${month}/${year}`);
    }
  };

  // --- CSV Import Handlers ---
  const handleDownloadTemplate = () => {
    const headers = "Atividade;Jira/Ticket;Prioridade;Proprietário;Estado;Categoria;Data de Início;Data de Fim;Descrição;Anotações";
    const sampleRow1 = "Migração de Banco de Dados Postgre (Main);DOC24-1980;P0;Antônio Gonçalves A. Batista;Ag. Deploy;Funcional;12/08/2026;20/08/2026;Migração estrutural de banco de dados legado para nuvem;[15/08] Impedimento resolvido. Aguardando deploy.";
    const sampleRow2 = "Integração Webhook Movidesk v2;MV-9821;P1;Maria Silva Santos;Ag. Desenv.;Suporte Integração;05/08/2026;15/08/2026;Nova API de webhooks de terceiros;[10/08] Aguardando definição da rota.";
    const csvContent = `${headers}\n${sampleRow1}\n${sampleRow2}`;
    
    // Create download link with BOM to handle Portuguese characters
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_importacao_atividades.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processCsvFile = (file: File) => {
    setCsvFileName(file.name);
    setImportStatus({ type: null, message: '' });

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) {
        setImportStatus({ type: 'error', message: 'O arquivo está vazio ou não pôde ser lido.' });
        return;
      }
      setRawCsvText(text);

      const currentId = importPeriodId || 'temp';
      const { tasks, error } = parseCSVContent(text, currentId);
      
      if (error) {
        setImportStatus({ type: 'error', message: error });
        setParsedTasks([]);
      } else {
        setParsedTasks(tasks);
        setImportStatus({
          type: 'success',
          message: `Arquivo "${file.name}" processado! Encontradas ${tasks.length} atividades prontas para importação.`
        });
      }
    };
    reader.onerror = () => {
      setImportStatus({ type: 'error', message: 'Erro ao ler o arquivo CSV.' });
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processCsvFile(file);
  };

  const handleImportPeriodIdChange = (idVal: string) => {
    const cleaned = idVal.replace(/\D/g, '').substring(0, 6);
    setImportPeriodId(cleaned);
    
    if (cleaned.length === 6) {
      const month = cleaned.substring(0, 2);
      const year = cleaned.substring(2);
      setImportPeriodLabel(`${month}/${year}`);
      
      // Update parsed tasks' IDs if they exist
      if (parsedTasks.length > 0 && rawCsvText) {
        const { tasks } = parseCSVContent(rawCsvText, cleaned);
        setParsedTasks(tasks);
      }
    }
  };

  const executeImport = (overwrite = false) => {
    setImportStatus({ type: null, message: '' });
    setShowOverwriteConfirm(false);

    const result = importPeriod(importPeriodId, importPeriodLabel, parsedTasks, overwrite);

    if (result.success) {
      setImportStatus({
        type: 'success',
        message: overwrite
          ? `Período ${importPeriodLabel} excluído e substituído com sucesso! ${parsedTasks.length} atividades registradas no sistema.`
          : `Período ${importPeriodLabel} importado com sucesso! ${parsedTasks.length} atividades registradas no sistema.`
      });
      onConfigChange();
      loadPeriodsAndFiles();
      
      // Reset
      setImportPeriodId('');
      setImportPeriodLabel('');
      setCsvFileName('');
      setRawCsvText('');
      setParsedTasks([]);
    } else {
      setImportStatus({
        type: 'error',
        message: result.error || 'Erro ao salvar o período importado.'
      });
    }
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setImportStatus({ type: null, message: '' });

    if (!importPeriodId.trim() || !importPeriodLabel.trim()) {
      setImportStatus({ type: 'error', message: 'Preencha o ID e rótulo do período.' });
      return;
    }

    if (!/^\d{6}$/.test(importPeriodId)) {
      setImportStatus({ type: 'error', message: 'O ID deve ser de exatamente 6 dígitos no padrão MMYYYY (ex: 092026).' });
      return;
    }

    if (parsedTasks.length === 0) {
      setImportStatus({ type: 'error', message: 'Nenhuma atividade válida foi carregada do arquivo CSV.' });
      return;
    }

    // Check if period already exists
    const periodExists = periods.some(p => p.id === importPeriodId);
    if (periodExists) {
      setShowOverwriteConfirm(true);
      return;
    }

    executeImport(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setCsvDragOver(true);
  };

  const handleDragLeave = () => {
    setCsvDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setCsvDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      processCsvFile(file);
    } else {
      setImportStatus({ type: 'error', message: 'Por favor, envie apenas arquivos com extensão .csv' });
    }
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in" id="admin-config-root">
      
      {/* Title block */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 font-display flex items-center space-x-2">
          <Settings className="h-5 w-5 text-[#343180]" />
          <span>Configurações do Sistema (Exclusivo Admin)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">Mapeamento de permissões dinâmicas, duplicação e edição direta de arquivos parametrizados</p>
      </div>

      {/* Sub-tab selection */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('periods')}
          className={`pb-3 px-6 text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'periods'
              ? 'border-b-2 border-[#343180] text-[#343180]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Gerenciar Períodos</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('import')}
          className={`pb-3 px-6 text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'import'
              ? 'border-b-2 border-[#343180] text-[#343180]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>Importar Período (CSV)</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('json')}
          className={`pb-3 px-6 text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'json'
              ? 'border-b-2 border-[#343180] text-[#343180]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span>Editar Arquivos JSON</span>
          </div>
        </button>
      </div>

      {/* View A: Period Management */}
      {activeTab === 'periods' && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800">Criação de Novo Período Mensal</h3>
            <p className="text-xs text-slate-400 mt-0.5">Utilize este assistente para encerrar o mês corrente e abrir o período de trabalho seguinte herdando as configurações.</p>
          </div>

          {periodStatus.type && (
            <div className={`p-4 rounded-lg flex items-start space-x-3 text-sm ${
              periodStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'
            }`}>
              {periodStatus.type === 'success' ? <CheckCircle className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
              <span>{periodStatus.message}</span>
            </div>
          )}

          <form onSubmit={handleCreatePeriod} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Source selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Período de Origem (Para Cópia/Herança)
                </label>
                <select
                  value={sourcePeriodId}
                  onChange={(e) => setSourcePeriodId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180]"
                >
                  {periods.map(p => (
                    <option key={p.id} value={p.id}>Copiar dados de: {p.label}</option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 block mt-1">Status e dados gerais deste período serão usados como base.</span>
              </div>

              {/* Arrow Indicator on Desktop */}
              <div className="hidden md:flex items-center justify-center p-4">
                <div className="h-10 w-10 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-[#343180]">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>

              {/* ID of the new period */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Novo ID do Período (MMYYYY)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 082026"
                  maxLength={6}
                  value={newPeriodId}
                  onChange={(e) => handlePeriodIdChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180]"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Apenas dígitos no padrão MMYYYY. Ex: agosto de 2026 deve ser 082026.</span>
              </div>

              {/* Label of the new period */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Rótulo do Período (Visualizado nas Abas)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 08/2026"
                  value={newPeriodLabel}
                  onChange={(e) => setNewPeriodLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180]"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Formato visual das abas. Ex: 08/2026. Auto-completa ao preencher o ID.</span>
              </div>

            </div>

            {/* Checkbox: Inherit Unfinished Tasks */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-start space-x-3">
              <input
                id="inherit"
                type="checkbox"
                checked={inheritUnfinished}
                onChange={(e) => setInheritUnfinished(e.target.checked)}
                className="h-4.5 w-4.5 text-[#343180] border-slate-300 rounded-md focus:ring-[#343180] mt-0.5 cursor-pointer"
              />
              <div className="text-sm">
                <label htmlFor="inherit" className="font-bold text-slate-800 cursor-pointer">
                  Herdar Atividades Não Finalizadas
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  Se ativado, todas as atividades do período de origem que não possuem status <strong>"Finalizada"</strong> ou <strong>"Concluída"</strong> serão criadas automaticamente no novo período como tarefas de continuação.
                </p>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#343180] hover:bg-[#2c2a6d] text-white rounded-lg text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
                id="btn-confirm-duplicate-period"
              >
                Duplicar e Criar Novo Período
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View B: CSV Period Import */}
      {activeTab === 'import' && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-6 animate-fade-in" id="admin-config-import-panel">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Importação Automática de Período (CSV)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Preencha os dados do novo período e envie uma planilha CSV contendo as atividades.</p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center space-x-2 text-xs font-bold text-[#343180] hover:text-[#2c2a6d] bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-200 transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Baixar Modelo CSV</span>
            </button>
          </div>

          {importStatus.type && (
            <div className={`p-4 rounded-lg flex items-start space-x-3 text-sm ${
              importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'
            }`}>
              {importStatus.type === 'success' ? <CheckCircle className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
              <span>{importStatus.message}</span>
            </div>
          )}

          <form onSubmit={handleImportSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ID of the imported period */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  ID do Novo Período (MMYYYY)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 092026"
                  maxLength={6}
                  value={importPeriodId}
                  onChange={(e) => handleImportPeriodIdChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180]"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Digite 6 dígitos no formato MMYYYY (Ex: Setembro/2026 deve ser 092026).</span>
              </div>

              {/* Label of the imported period */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Rótulo do Período (MM/YYYY)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 09/2026"
                  value={importPeriodLabel}
                  onChange={(e) => setImportPeriodLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180]"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Rótulo que aparecerá na barra de abas. Auto-completa ao digitar o ID.</span>
              </div>
            </div>

            {/* Drag & Drop File Upload Area */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Planilha CSV de Atividades
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                  csvDragOver 
                    ? 'border-[#343180] bg-indigo-50/40' 
                    : csvFileName 
                      ? 'border-emerald-300 bg-emerald-50/5' 
                      : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  type="file"
                  id="csv-file-input"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                />
                {csvFileName ? (
                  <FileSpreadsheet className="h-10 w-10 text-emerald-600 mb-3" />
                ) : (
                  <Upload className="h-10 w-10 text-slate-400 mb-3" />
                )}
                
                <label htmlFor="csv-file-input" className="cursor-pointer">
                  <span className="text-sm font-bold text-[#343180] hover:underline">
                    {csvFileName ? 'Trocar arquivo selecionado' : 'Selecione um arquivo CSV'}
                  </span>
                  <span className="text-sm text-slate-500"> ou arraste e solte aqui</span>
                </label>
                
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {csvFileName ? `Selecionado: ${csvFileName}` : 'Formatos aceitos: .csv (separador por vírgula ou ponto e vírgula)'}
                </p>
              </div>
            </div>

            {/* Instruction Panel */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-start space-x-3">
              <Info className="h-4.5 w-4.5 text-[#343180] shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 leading-relaxed space-y-1">
                <p className="font-bold text-slate-800">Diretrizes de Mapeamento de Colunas:</p>
                <p>O importador possui inteligência para detectar automaticamente os cabeçalhos das colunas em português e inglês:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-500 mt-1">
                  <li><strong>Nome da Atividade:</strong> Atividade, Nome, Name, Task ou Título.</li>
                  <li><strong>Código/Ticket:</strong> Jira, Ticket, Movidesk, Chamado ou Código.</li>
                  <li><strong>Prioridade:</strong> Prioridade, Priority ou Criticidade (aceita P0, P1, P2, P3).</li>
                  <li><strong>Responsável:</strong> Proprietário, Responsável, Owner ou Membro.</li>
                  <li><strong>Categoria:</strong> Categoria ou Category (Funcional ou Suporte Integração).</li>
                </ul>
              </div>
            </div>

            {/* Parsed Tasks Preview Table */}
            {parsedTasks.length > 0 && (
              <div className="space-y-3 bg-slate-50 border border-slate-200/60 rounded-xl p-4 animate-fade-in" id="csv-parsed-preview">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                    <Check className="h-4 w-4 text-emerald-500 mr-1.5" />
                    Pré-visualização dos Dados ({parsedTasks.length} atividades mapeadas)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Exibindo primeiras 5 linhas</span>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-sans">
                    <thead className="bg-slate-50 font-bold text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-[10px] uppercase tracking-wider">Atividade</th>
                        <th className="px-3 py-2 text-[10px] uppercase tracking-wider">Ticket</th>
                        <th className="px-3 py-2 text-[10px] uppercase tracking-wider">Prioridade</th>
                        <th className="px-3 py-2 text-[10px] uppercase tracking-wider">Responsável</th>
                        <th className="px-3 py-2 text-[10px] uppercase tracking-wider">Categoria</th>
                        <th className="px-3 py-2 text-[10px] uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {parsedTasks.slice(0, 5).map((task, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-medium max-w-xs truncate">{task.name}</td>
                          <td className="px-3 py-2 font-mono text-slate-500">{task.jiraOrMovidesk || '-'}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                              task.priority === 'P0' ? 'bg-red-50 text-red-700 border border-red-100' :
                              task.priority === 'P1' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                              task.priority === 'P2' ? 'bg-indigo-50 text-[#343180] border border-indigo-100' :
                              'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="px-3 py-2 truncate max-w-[120px]">{task.owner}</td>
                          <td className="px-3 py-2 text-[11px] text-slate-500">{task.category}</td>
                          <td className="px-3 py-2 font-semibold text-[11px] text-[#343180]">{task.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#343180] hover:bg-[#2c2a6d] text-white rounded-lg text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center space-x-2"
                id="btn-confirm-import-csv"
                disabled={parsedTasks.length === 0}
              >
                <Upload className="h-4 w-4" />
                <span>Salvar e Importar Período</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View B: Raw JSON Files Editor */}
      {activeTab === 'json' && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Editor Cru de Arquivos JSON de Parametrização</h3>
              <p className="text-xs text-slate-400 mt-0.5">Edite diretamente os dados do banco de dados em formato JSON para depurações.</p>
            </div>

            {/* Select File */}
            <div className="flex items-center space-x-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider shrink-0">Arquivo:</label>
              <select
                value={selectedFile}
                onChange={(e) => setSelectedFile(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] bg-slate-50 font-mono"
              >
                {availableFiles.map(file => (
                  <option key={file} value={file}>{file}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Feedback messages */}
          {jsonSaveStatus.type && (
            <div className={`p-4 rounded-lg flex items-start space-x-3 text-sm ${
              jsonSaveStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'
            }`}>
              {jsonSaveStatus.type === 'success' ? <CheckCircle className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
              <span className="whitespace-pre-wrap">{jsonSaveStatus.message}</span>
            </div>
          )}

          {/* Textarea Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span className="flex items-center"><FileCode className="h-3.5 w-3.5 mr-1" /> {selectedFile}</span>
              <span>Lembre-se de manter os colchetes e as chaves corretas</span>
            </div>
            <textarea
              value={rawJsonContent}
              onChange={(e) => setRawJsonContent(e.target.value)}
              className="w-full h-[380px] p-4 bg-slate-950 text-emerald-400 border border-slate-800 rounded-xl font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 leading-relaxed"
              spellCheck="false"
            />
          </div>

          <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 flex items-start space-x-2">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-800 leading-relaxed">
              <strong>Aviso de Integridade:</strong> O editor realiza a verificação de sintaxe antes de salvar. Se você digitar um JSON malformado, o sistema rejeitará as mudanças e informará o local exato do erro para evitar falhas no carregamento das telas do Board de TI.
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-slate-100">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowResetAllConfirm(true)}
                className="flex items-center space-x-1.5 px-3 py-2 border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                title="Sincroniza todas as tabelas e arquivos com as sementes do código-fonte (initialData.ts)"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Sincronizar Banco Inteiro com Código (GitHub)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowResetFileConfirm(true)}
                className="flex items-center space-x-1.5 px-3 py-2 border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                title="Restaura apenas este arquivo selecionado para sua semente estática original"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Restaurar arquivo selecionado</span>
              </button>
            </div>

            <button
              onClick={handleSaveJson}
              className="flex items-center space-x-2 px-5 py-2.5 bg-[#343180] hover:bg-[#2c2a6d] text-white rounded-lg text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer w-full sm:w-auto justify-center"
              id="btn-save-raw-json"
            >
              <Save className="h-4.5 w-4.5" />
              <span>Salvar Arquivo JSON</span>
            </button>
          </div>
        </div>
      )}

      {showOverwriteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="overwrite-confirm-modal">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 p-6 space-y-4 animate-scale-up">
            <div className="flex items-start space-x-3 text-amber-600">
              <AlertCircle className="h-6 w-6 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-slate-800">Período Já Existente</h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  O período <strong>{importPeriodLabel}</strong> ({importPeriodId}) já possui atividades cadastradas no sistema.
                </p>
                <p className="text-sm text-slate-600 mt-2 font-medium">
                  Deseja excluir permanentemente o período atual e todas as suas atividades para importar estas novas {parsedTasks.length} atividades?
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowOverwriteConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => executeImport(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer"
                id="confirm-overwrite-btn"
              >
                Sim, Excluir e Substituir
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetFileConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="reset-file-confirm-modal">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 p-6 space-y-4 animate-scale-up">
            <div className="flex items-start space-x-3 text-rose-600">
              <AlertCircle className="h-6 w-6 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-slate-800">Restaurar Arquivo</h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Isso substituirá o conteúdo atual de <strong>{selectedFile}</strong> no seu navegador pelo valor estático correspondente em <strong>initialData.ts</strong> (GitHub).
                </p>
                <p className="text-sm text-slate-600 mt-2 font-medium">
                  Quaisquer modificações feitas neste arquivo especificamente serão perdidas localmente. Deseja continuar?
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetFileConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeResetFile}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer"
                id="confirm-reset-file-btn"
              >
                Sim, Restaurar Arquivo
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetAllConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="reset-all-confirm-modal">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 p-6 space-y-4 animate-scale-up">
            <div className="flex items-start space-x-3 text-red-600">
              <AlertCircle className="h-6 w-6 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-slate-800">Sincronização Completa com GitHub</h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Isso apagará <strong>TODAS</strong> as alterações locais guardadas no seu navegador (usuários, permissões, períodos novos, atividades cadastradas) e recarregará as sementes idênticas ao código do GitHub.
                </p>
                <p className="text-sm text-slate-600 mt-2 font-medium">
                  Isso é útil para puxar as atualizações "físicas" feitas no arquivo <strong>initialData.ts</strong> que foram implantadas na Vercel. Deseja continuar?
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetAllConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeResetAll}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer"
                id="confirm-reset-all-btn"
              >
                Sim, Sincronizar Tudo com GitHub
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
