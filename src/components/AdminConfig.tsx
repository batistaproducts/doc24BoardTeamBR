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
  RefreshCw,
  Github,
  Palette,
  Sliders,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  Clock,
  Sparkles,
  X,
  Table,
  CheckCheck
} from 'lucide-react';
import { Period, User, Atividade } from '../types';
import AdminParameters from './AdminParameters';
import {
  getPeriods,
  getRawFile,
  saveRawFile,
  saveRawFileAsync,
  duplicatePeriod,
  importPeriod,
  importPeriodAsync,
  resetAllToInitial,
  resetFileToInitial,
  getGitHubConfig,
  getGitHubConfigStatus,
  saveGitHubConfig,
  pushToGitHub,
  isMaskedToken,
  GitHubConfig,
  checkDbStatus,
  triggerDbMigration
} from '../lib/dataStore';

// Antonio Batista - SEG_002 - Converte o texto completo de um arquivo JSON em uma lista de objetos do tipo Atividade.
function parseJSONContent(content: string, periodId: string): { tasks: Atividade[]; error: string | null } {
  try {
    const data = JSON.parse(content);
    let taskList: any[] = [];
    if (Array.isArray(data)) {
      taskList = data;
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.atividades)) {
        taskList = data.atividades;
      } else if (Array.isArray(data.tasks)) {
        taskList = data.tasks;
      } else if (Array.isArray(data.items)) {
        taskList = data.items;
      } else {
        return { tasks: [], error: 'O JSON deve conter uma lista (array) de atividades ou um objeto com a propriedade "atividades" ou "tasks".' };
      }
    } else {
      return { tasks: [], error: 'Estrutura JSON inválida. O arquivo precisa conter uma lista de atividades.' };
    }

    if (taskList.length === 0) {
      return { tasks: [], error: 'A lista de atividades no JSON está vazia.' };
    }

    const tasks: Atividade[] = taskList.map((item, idx) => {
      const currentPeriod = periodId || 'temp';
      const rawPriority = (item.priority || item.prioridade || 'P2').toString().toUpperCase();
      let priority: 'P0' | 'P1' | 'P2' | 'P3' = 'P2';
      if (['P0', 'P1', 'P2', 'P3'].includes(rawPriority)) {
        priority = rawPriority as any;
      }

      return {
        id: item.id || `task-${currentPeriod}-${Math.random().toString(36).substring(2, 7)}`,
        name: item.name || item.atividade || item.nome || item.title || `Atividade ${idx + 1}`,
        jiraOrMovidesk: item.jiraOrMovidesk || item.jira || item.ticket || item.movidesk || item.chamado || '-',
        priority: priority,
        owner: item.owner || item.proprietario || item.responsavel || item.membro || 'Sem proprietário',
        status: item.status || item.estado || 'Em Desenvolvimento',
        category: item.category || item.categoria || item.classificacao || 'Funcional',
        startDate: item.startDate || item.dataInicio || item.data_inicio || item.inicio || '',
        endDate: item.endDate || item.dataFim || item.data_fim || item.fim || '',
        description: item.description || item.descricao || '',
        notes: item.notes || item.anotacoes || item.observacoes || '',
        componente: item.componente || item.component || ''
      };
    });

    return { tasks, error: null };
  } catch (err: any) {
    return { tasks: [], error: `Erro na estrutura do JSON: ${err.message}` };
  }
}

// Antonio Batista - SEG_002 - Realiza o parse das colunas de uma linha de CSV respeitando delimitação por aspas duplas.
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

// Antonio Batista - SEG_002 - Converte o texto completo de um CSV em uma lista de objetos do tipo Atividade.
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
  const categoryIdx = findHeaderIndex(['classificação', 'classificacao', 'categoria', 'category', 'classificação/categoria'], 5);
  const componenteIdx = findHeaderIndex(['componente', 'component', 'tecnologia', 'tech'], 6);
  const startDateIdx = findHeaderIndex(['data de início', 'data de inicio', 'inicio', 'startdate', 'start', 'data_inicio'], 7);
  const endDateIdx = findHeaderIndex(['data de fim', 'data de conclusão', 'data de conclusao', 'fim', 'enddate', 'end', 'data_fim'], 8);
  const descriptionIdx = findHeaderIndex(['descrição', 'descricao', 'description', 'detalhes'], 9);
  const notesIdx = findHeaderIndex(['anotações', 'anotacoes', 'notes', 'comentários', 'comentarios', 'obs', 'observações', 'observacoes'], 10);

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
    const category = getValue(categoryIdx, 'Funcional');
    const rawComponente = getValue(componenteIdx, '');
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

    // Heuristic component detection if not specified in CSV
    let componente = rawComponente;
    if (!componente) {
      const nameLower = name.toLowerCase();
      if (nameLower.includes('front') || nameLower.includes('interface') || nameLower.includes('tela')) componente = 'Front-End';
      else if (nameLower.includes('back') || nameLower.includes('api') || nameLower.includes('serviço') || nameLower.includes('servico') || nameLower.includes('integração') || nameLower.includes('integracao')) componente = 'Back-End';
      else if (nameLower.includes('mobile') || nameLower.includes('app') || nameLower.includes('android') || nameLower.includes('ios')) componente = 'Mobile';
      else if (nameLower.includes('design') || nameLower.includes('ux') || nameLower.includes('ui') || nameLower.includes('layout')) componente = 'Design';
      else componente = 'Back-End';
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
      componente,
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

// Antonio Batista - SEG_002 - Painel administrativo para gerenciamento de períodos, importação de CSV, configuração do GitHub e edição de JSON.
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
  const [activeTab, setActiveTab] = useState<'periods' | 'import' | 'json' | 'github' | 'parameters' | 'database'>('periods');

  // Neon DB State
  const [dbStatus, setDbStatus] = useState<{ success?: boolean; message?: string; tables?: Record<string, number>; diagnostics?: any } | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [customDbUrl, setCustomDbUrl] = useState('');
  const [showCustomDbInput, setShowCustomDbInput] = useState(false);
  const [dbMigrating, setDbMigrating] = useState(false);
  const [dbMigrationResult, setDbMigrationResult] = useState<{ success?: boolean; message?: string; details?: any } | null>(null);

  const handleCheckDbStatus = async (override?: string) => {
    setDbLoading(true);
    setDbMigrationResult(null);
    try {
      const urlToTest = override !== undefined ? override : (customDbUrl.trim() || undefined);
      const res = await checkDbStatus(urlToTest);
      setDbStatus(res);
    } catch (e: any) {
      setDbStatus({ success: false, message: e.message });
    } finally {
      setDbLoading(false);
    }
  };

  const handleRunMigration = async (force: boolean) => {
    setDbMigrating(true);
    setDbMigrationResult(null);
    try {
      const res = await triggerDbMigration(force);
      setDbMigrationResult({
        ...res,
        timestamp: res.timestamp || new Date().toISOString()
      });
      await handleCheckDbStatus();
      onConfigChange();
      // Scroll suave para a mensagem de resultado
      setTimeout(() => {
        const el = document.getElementById('db-migration-result-box');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    } catch (e: any) {
      setDbMigrationResult({
        success: false,
        message: e.message || 'Erro inesperado durante a sincronização.',
        timestamp: new Date().toISOString()
      });
    } finally {
      setDbMigrating(false);
    }
  };

  // GitHub Config State
  const [githubToken, setGithubToken] = useState('');
  const [githubOwner, setGithubOwner] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubBranch, setGithubBranch] = useState('main');
  const [githubEnabled, setGithubEnabled] = useState(false);
  const [githubTestStatus, setGithubTestStatus] = useState<{ type: 'success' | 'error' | 'pending' | null; message: string }>({ type: null, message: '' });
  const [showToken, setShowToken] = useState(false);

  // GitHub Diagnostic State
  const [diagnosticResult, setDiagnosticResult] = useState<any | null>(null);
  const [diagnosticLoading, setDiagnosticLoading] = useState<boolean>(false);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);

  // Antonio Batista - SEG_002 - Mascara o token de acesso pessoal do GitHub para segurança na interface.
  const getRedactedToken = (token: string) => {
    if (!token) return 'Nenhum token configurado';
    const trimmed = token.trim();
    if (trimmed.length <= 8) {
      return '******';
    }
    const prefix = trimmed.substring(0, 4);
    const suffix = trimmed.substring(trimmed.length - 4);
    return `${prefix}******${suffix}`;
  };

  // Antonio Batista - SEG_002 - Executa diagnósticos de conexão diretamente via chamadas de API do cliente no navegador.
  const runClientSideDiagnostics = async (token: string, owner: string, repo: string, branch: string) => {
    const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Doc24-Board-Team-BR-Client'
    };
    if (token && !isMaskedToken(token)) {
      headers['Authorization'] = token.startsWith('github_pat_') ? `Bearer ${token}` : `token ${token}`;
    }

    // 1. Repo general connection check
    const repoResponse = await fetch(repoUrl, { headers });
    const scopesHeader = repoResponse.headers.get('x-oauth-scopes') || "Não disponível (PAT fine-grained ou sem cabeçalho)";
    const rateLimitLimit = repoResponse.headers.get('x-ratelimit-limit');
    const rateLimitRemaining = repoResponse.headers.get('x-ratelimit-remaining');
    const rateLimitReset = repoResponse.headers.get('x-ratelimit-reset');

    if (!repoResponse.ok) {
      const text = await repoResponse.text();
      let rawMsg = text;
      try {
        const parsed = JSON.parse(text);
        rawMsg = parsed.message || text;
      } catch (_) {}

      return {
        success: false,
        error: `Falha na conexão com o repositório via Cliente (Código HTTP ${repoResponse.status}): ${rawMsg}`,
        connection: {
          success: false,
          status: repoResponse.status,
          message: rawMsg
        },
        rateLimit: {
          limit: rateLimitLimit ? parseInt(rateLimitLimit, 10) : null,
          remaining: rateLimitRemaining ? parseInt(rateLimitRemaining, 10) : null,
          resetTime: rateLimitReset ? new Date(parseInt(rateLimitReset, 10) * 1000).toISOString() : null
        },
        serverDisk: {
          configExists: false,
          enabled: githubEnabled
        }
      };
    }

    const repoData = await repoResponse.json();
    const permissions = repoData.permissions || { admin: false, push: false, pull: false };
    const isPrivate = repoData.private;
    const defaultBranch = repoData.default_branch;

    // 2. Check if specific branch exists
    let branchExists = false;
    let branchError = null;
    try {
      const branchUrl = `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`;
      const branchResponse = await fetch(branchUrl, { headers });
      branchExists = branchResponse.ok;
      if (!branchResponse.ok) {
        const bText = await branchResponse.text();
        branchError = `HTTP ${branchResponse.status} - ${bText}`;
      }
    } catch (be: any) {
      branchError = be.message;
    }

    // 3. Check if core files exist on the remote branch
    let usuariosJsonExists = false;
    let remoteFilesError = null;
    try {
      const usuariosUrl = `https://api.github.com/repos/${owner}/${repo}/contents/src/data/usuarios.json?ref=${branch}`;
      const usuariosResponse = await fetch(usuariosUrl, { headers });
      usuariosJsonExists = usuariosResponse.ok;
      if (!usuariosResponse.ok) {
        const uText = await usuariosResponse.text();
        remoteFilesError = `HTTP ${usuariosResponse.status} - ${uText}`;
      }
    } catch (fe: any) {
      remoteFilesError = fe.message;
    }

    return {
      success: true,
      connection: {
        success: true,
        status: 200,
        message: "Conectado com sucesso (Via Cliente - Compatível com Vercel/Ambientes Estáticos)"
      },
      permissions: {
        push: permissions.push || false,
        pull: permissions.pull || false,
        admin: permissions.admin || false,
        scopes: scopesHeader
      },
      rateLimit: {
        limit: rateLimitLimit ? parseInt(rateLimitLimit, 10) : null,
        remaining: rateLimitRemaining ? parseInt(rateLimitRemaining, 10) : null,
        resetTime: rateLimitReset ? new Date(parseInt(rateLimitReset, 10) * 1000).toISOString() : null
      },
      repoState: {
        isPrivate,
        defaultBranch,
        branchExists,
        branchError,
        usuariosJsonExists,
        remoteFilesError
      },
      serverDisk: {
        configExists: false,
        enabled: githubEnabled
      }
    };
  };

  // Antonio Batista - SEG_002 - Dispara os testes de diagnóstico de conexão e permissões da integração com o GitHub.
  const handleRunDiagnostics = async () => {
    setDiagnosticLoading(true);
    setDiagnosticError(null);
    setDiagnosticResult(null);

    const token = githubToken.trim();
    const owner = githubOwner.trim();
    const repo = githubRepo.trim();
    const branch = githubBranch.trim() || 'main';

    if (!owner || !repo) {
      setDiagnosticError('Por favor, preencha o Dono e o Nome do Repositório para rodar o diagnóstico completo.');
      setDiagnosticLoading(false);
      return;
    }

    try {
      let useClientDiagnostics = false;
      try {
        const response = await fetch('/api/github/diagnostic', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token, owner, repo, branch })
        });

        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
          const data = await response.json();
          setDiagnosticResult(data);
          if (!data.success && data.error) {
            setDiagnosticError(data.error);
          }
        } else {
          console.warn(`[Diagnostics] Server diagnostics not available or returned non-JSON (Status ${response.status}). Falling back to direct client-side diagnostics...`);
          useClientDiagnostics = true;
        }
      } catch (e) {
        console.warn("[Diagnostics] Server endpoint unreachable. Falling back to direct client-side diagnostics...", e);
        useClientDiagnostics = true;
      }

      if (useClientDiagnostics) {
        const clientData = await runClientSideDiagnostics(token, owner, repo, branch);
        setDiagnosticResult(clientData);
        if (!clientData.success && clientData.error) {
          setDiagnosticError(clientData.error);
        }
      }
    } catch (err: any) {
      setDiagnosticError(err.message || 'Falha na requisição de diagnóstico.');
    } finally {
      setDiagnosticLoading(false);
    }
  };

  // JSON Editing State
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [rawJsonContent, setRawJsonContent] = useState<string>('');
  const [jsonSaveStatus, setJsonSaveStatus] = useState<{ type: 'success' | 'error' | 'pending' | null; message: string }>({ type: null, message: '' });

  // Period Duplication State
  const [periods, setPeriods] = useState<Period[]>([]);
  const [sourcePeriodId, setSourcePeriodId] = useState<string>('');
  const [newPeriodId, setNewPeriodId] = useState<string>(''); // e.g. "082026"
  const [newPeriodLabel, setNewPeriodLabel] = useState<string>(''); // e.g. "08/2026"
  const [inheritUnfinished, setInheritUnfinished] = useState<boolean>(true);
  const [periodStatus, setPeriodStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // JSON Import States
  const [importPeriodId, setImportPeriodId] = useState<string>('');
  const [importPeriodLabel, setImportPeriodLabel] = useState<string>('');
  const [jsonImportFileName, setJsonImportFileName] = useState<string>('');
  const [rawJsonImportText, setRawJsonImportText] = useState<string>('');
  const [parsedTasks, setParsedTasks] = useState<Atividade[]>([]);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'pending' | null; message: string }>({ type: null, message: '' });
  const [jsonDragOver, setJsonDragOver] = useState<boolean>(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState<boolean>(false);
  const [showResetFileConfirm, setShowResetFileConfirm] = useState<boolean>(false);
  const [showResetAllConfirm, setShowResetAllConfirm] = useState<boolean>(false);

  // Antonio Batista - SEG_002 - Carrega a lista de períodos e todos os arquivos JSON do projeto para edição e seleção.
  const loadPeriodsAndFiles = async () => {
    const loadedPeriods = getPeriods();
    setPeriods(loadedPeriods);
    if (loadedPeriods.length > 0 && !sourcePeriodId) {
      setSourcePeriodId(loadedPeriods[0].id);
    }

    const standardFiles = [
      'usuarios.json',
      'roles_permissions.json',
      'lock_status.json',
      'periods.json',
      'parameters.json',
      'datas_avisos.json',
      'planning.json',
      'refinement.json',
      'versionamento.json',
      'github_config.json',
      'user_tasks.json',
      'timer_presets.json'
    ];

    const periodFiles = loadedPeriods.map(p => `atividades_${p.id}.json`);

    let serverFiles: string[] = [];
    try {
      const res = await fetch('/api/files');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          serverFiles = data;
        }
      }
    } catch (e) {
      // Ignore network error fallback
    }

    const localKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('btb_') && k.endsWith('_json')) {
        const fileName = k.replace(/^btb_/, '').replace(/_json$/, '') + '.json';
        localKeys.push(fileName);
      }
    }

    const allFilesSet = new Set([
      ...standardFiles,
      ...periodFiles,
      ...serverFiles,
      ...localKeys
    ]);

    const files = Array.from(allFilesSet).sort((a, b) => a.localeCompare(b));
    setAvailableFiles(files);
    setSelectedFile(prev => (prev && files.includes(prev) ? prev : files[0] || ''));
  };

  useEffect(() => {
    loadPeriodsAndFiles();
    
    // Load GitHub Config Status from Server
    const loadConfigStatus = async () => {
      const status = await getGitHubConfigStatus();
      if (status.configured) {
        setGithubOwner(status.owner || '');
        setGithubRepo(status.repo || '');
        setGithubBranch(status.branch || 'main');
        setGithubEnabled(status.enabled || false);
        if (status.hasToken) {
          setGithubToken(status.maskedToken || '••••••••••••');
        }
      } else {
        const config = getGitHubConfig();
        setGithubToken(config.token);
        setGithubOwner(config.owner);
        setGithubRepo(config.repo);
        setGithubBranch(config.branch || 'main');
        setGithubEnabled(config.enabled);
      }
    };
    
    loadConfigStatus();
  }, []);

  // Load selected JSON file content
  useEffect(() => {
    if (selectedFile) {
      const content = getRawFile(selectedFile);
      setRawJsonContent(content);
      setJsonSaveStatus({ type: null, message: '' });
    }
  }, [selectedFile]);

  // Antonio Batista - SEG_002 - Salva e valida o conteúdo formatado em JSON do arquivo selecionado.
  const handleSaveJson = async () => {
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

    setJsonSaveStatus({
      type: 'pending',
      message: 'Salvando alterações e sincronizando versão física no servidor...'
    });

    const result = await saveRawFileAsync(selectedFile, rawJsonContent);
    if (result.success) {
      setJsonSaveStatus({
        type: 'success',
        message: `Arquivo ${selectedFile} salvo com sucesso no banco simulado e publicado fisicamente no servidor!`
      });
      onConfigChange(); // Notify parent of changes
      loadPeriodsAndFiles(); // Reload if periods file was updated
    } else {
      setJsonSaveStatus({
        type: 'error',
        message: `Falha ao persistir e publicar o arquivo ${selectedFile} no servidor: ${result.error || 'Erro desconhecido'}`
      });
    }
  };

  // Antonio Batista - SEG_002 - Salva os parâmetros da integração com o GitHub no servidor.
  const handleSaveGithubConfig = async () => {
    setGithubTestStatus({
      type: 'pending',
      message: 'Salvando configurações no servidor...'
    });
    const config: GitHubConfig = {
      token: githubToken.trim(),
      owner: githubOwner.trim(),
      repo: githubRepo.trim(),
      branch: githubBranch.trim() || 'main',
      enabled: githubEnabled
    };
    const result = await saveGitHubConfig(config);
    if (result.success) {
      setGithubTestStatus({
        type: 'success',
        message: 'Configurações do GitHub salvas com sucesso no servidor e localmente!'
      });
      onConfigChange(); // Notify parent of updates
    } else {
      setGithubTestStatus({
        type: 'error',
        message: `Falha ao salvar as configurações no arquivo JSON do servidor: ${result.error || 'Erro desconhecido'}`
      });
    }
  };

  // Antonio Batista - SEG_002 - Valida a conexão de acesso com a API do GitHub utilizando o token informado.
  const handleTestGithubConnection = async () => {
    setGithubTestStatus({ type: 'pending', message: 'Testando conexão com repositório do GitHub...' });
    
    const token = githubToken.trim();
    const owner = githubOwner.trim();
    const repo = githubRepo.trim();
    const branch = githubBranch.trim() || 'main';

    if (!owner || !repo) {
      setGithubTestStatus({
        type: 'error',
        message: 'Por favor, preencha o Dono e Nome do Repositório para testar.'
      });
      return;
    }

    // 1. Try server proxy test first to bypass client CORS / iframe blocks
    try {
      const proxyRes = await fetch('/api/github/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, owner, repo, branch })
      });

      if (proxyRes.ok) {
        setGithubTestStatus({
          type: 'success',
          message: 'Sucesso! Conexão com o GitHub validada com êxito através do servidor.'
        });
        return;
      } else if (proxyRes.status !== 404) {
        const errData = await proxyRes.json().catch(() => ({}));
        const errMsg = errData.error || `Erro HTTP ${proxyRes.status}`;
        setGithubTestStatus({
          type: 'error',
          message: `Falha na conexão através do Servidor: ${errMsg}. Verifique se o token tem permissões adequadas e se o Dono/Repositório estão corretos.`
        });
        return;
      }
      // If 404, fallback to direct browser fetch
      console.warn('[GitHub Sync] Server connection proxy returned 404. Falling back to direct client-side test...');
    } catch (e) {
      console.warn('[GitHub Sync] Server connection proxy unreachable. Falling back to direct client-side test...', e);
    }

    // 2. Direct browser fetch fallback (simplified to avoid strict CORS preflight failures)
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    const headers: Record<string, string> = {};
    if (token && !isMaskedToken(token)) {
      headers['Authorization'] = token.startsWith('github_pat_') ? `Bearer ${token}` : `token ${token}`;
    }

    try {
      const res = await fetch(url, { headers });

      if (res.ok) {
        setGithubTestStatus({
          type: 'success',
          message: 'Sucesso! Conectado diretamente ao repositório via navegador.'
        });
      } else {
        const text = await res.text();
        setGithubTestStatus({
          type: 'error',
          message: `Falha na conexão direta (HTTP ${res.status}): ${text || 'Verifique se o repositório existe e se seu Token de Acesso Pessoal (PAT) está ativo.'}`
        });
      }
    } catch (e: any) {
      setGithubTestStatus({
        type: 'error',
        message: `Erro de rede/conexão direta: ${e.message || 'Falha de rede/CORS.'} (Dica: Se estiver usando o Safari, Firefox ou bloqueadores estritos, use a conexão pelo servidor de desenvolvimento do AI Studio ou verifique suas credenciais).`
      });
    }
  };

  // Antonio Batista - SEG_002 - Restaura o arquivo JSON selecionado aos seus valores padrão originais.
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

  // Antonio Batista - SEG_002 - Restaura toda a base de dados do sistema aos valores padrão iniciais.
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

  // Antonio Batista - SEG_002 - Executa a criação e duplicação de um novo período com migração de demandas.
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
        message: `Período ${newPeriodLabel} criado com sucesso a partir de ${sourcePeriodId}! ${inheritUnfinished ? 'Tarefas, planning e refinamento não concluídos foram migrados.' : ''}`
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

  // Antonio Batista - SEG_002 - Formata e valida a entrada de ID do período preenchendo o rótulo de forma automática.
  const handlePeriodIdChange = (idVal: string) => {
    const cleaned = idVal.replace(/\D/g, '').substring(0, 6);
    setNewPeriodId(cleaned);
    
    if (cleaned.length === 6) {
      const month = cleaned.substring(0, 2);
      const year = cleaned.substring(2);
      setNewPeriodLabel(`${month}/${year}`);
    }
  };

  // Antonio Batista - SEG_002 - Gera e faz download do arquivo JSON modelo de exemplo para importação de tarefas.
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        "id": "task-092026-sample1",
        "name": "Migração de Banco de Dados Postgre (Main)",
        "jiraOrMovidesk": "DOC24-1980",
        "priority": "P0",
        "owner": "Antônio Gonçalves A. Batista",
        "status": "Ag. Deploy",
        "category": "Funcional",
        "startDate": "12/09/2026",
        "endDate": "20/09/2026",
        "description": "Migração estrutural de banco de dados legado para nuvem",
        "notes": "[15/09] Impedimento resolvido. Aguardando deploy.",
        "componente": "Back-End"
      },
      {
        "id": "task-092026-sample2",
        "name": "Integração Webhook Movidesk v2",
        "jiraOrMovidesk": "MV-9821",
        "priority": "P1",
        "owner": "Maria Silva Santos",
        "status": "Ag. Desenv.",
        "category": "Suporte Integração",
        "startDate": "05/09/2026",
        "endDate": "15/09/2026",
        "description": "Nova API de webhooks de terceiros",
        "notes": "[10/09] Aguardando definição da rota.",
        "componente": "Front-End"
      }
    ];
    
    const jsonContent = JSON.stringify(sampleData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_importacao_atividades.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Antonio Batista - SEG_002 - Lê e processa o arquivo JSON enviado extraindo a lista de atividades.
  const processJsonFile = (file: File) => {
    setJsonImportFileName(file.name);
    setImportStatus({ type: null, message: '' });

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) {
        setImportStatus({ type: 'error', message: 'O arquivo está vazio ou não pôde ser lido.' });
        return;
      }
      setRawJsonImportText(text);

      const currentId = importPeriodId || 'temp';
      const { tasks, error } = parseJSONContent(text, currentId);
      
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
      setImportStatus({ type: 'error', message: 'Erro ao ler o arquivo JSON.' });
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Antonio Batista - SEG_002 - Captura o evento de seleção de arquivo JSON via input.
  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processJsonFile(file);
  };

  // Antonio Batista - SEG_002 - Atualiza o ID do período da importação e ajusta as tarefas carregadas.
  const handleImportPeriodIdChange = (idVal: string) => {
    const cleaned = idVal.replace(/\D/g, '').substring(0, 6);
    setImportPeriodId(cleaned);
    
    if (cleaned.length === 6) {
      const month = cleaned.substring(0, 2);
      const year = cleaned.substring(2);
      setImportPeriodLabel(`${month}/${year}`);
      
      // Update parsed tasks' IDs if they exist
      if (parsedTasks.length > 0 && rawJsonImportText) {
        const { tasks } = parseJSONContent(rawJsonImportText, cleaned);
        setParsedTasks(tasks);
      }
    }
  };

  // Antonio Batista - SEG_002 - Executa a gravação do novo período importado e suas atividades no sistema.
  const executeImport = async (overwrite = false) => {
    setImportStatus({ type: 'pending', message: 'Salvando período, gerando arquivo físico e sincronizando com o GitHub...' });
    setShowOverwriteConfirm(false);

    const result = await importPeriodAsync(importPeriodId, importPeriodLabel, parsedTasks, overwrite);

    if (result.success) {
      setImportStatus({
        type: 'success',
        message: overwrite
          ? `Período ${importPeriodLabel} substituído! Arquivo físico atividades_${importPeriodId}.json e periods.json salvos e sincronizados com sucesso no GitHub!`
          : `Período ${importPeriodLabel} importado! Arquivo físico atividades_${importPeriodId}.json criado no repositório GitHub!`
      });
      onConfigChange();
      loadPeriodsAndFiles();
      
      // Reset
      setImportPeriodId('');
      setImportPeriodLabel('');
      setJsonImportFileName('');
      setRawJsonImportText('');
      setParsedTasks([]);
    } else {
      setImportStatus({
        type: 'error',
        message: result.error || 'Erro ao salvar o período importado.'
      });
    }
  };

  // Antonio Batista - SEG_002 - Submete o formulário de importação validando os campos e tratando sobressaídas de períodos existentes.
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
      setImportStatus({ type: 'error', message: 'Nenhuma atividade válida foi carregada do arquivo JSON.' });
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

  // Antonio Batista - SEG_002 - Trata o efeito de arrastar arquivo sobre a zona de drop do JSON.
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setJsonDragOver(true);
  };

  // Antonio Batista - SEG_002 - Trata a saída do ponteiro do mouse da área de arraste do JSON.
  const handleDragLeave = () => {
    setJsonDragOver(false);
  };

  // Antonio Batista - SEG_002 - Captura e processa o arquivo JSON solto pelo usuário na área de upload.
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setJsonDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.json')) {
      processJsonFile(file);
    } else {
      setImportStatus({ type: 'error', message: 'Por favor, envie apenas arquivos com extensão .json' });
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
            <span>Importar Período (JSON)</span>
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

        <button
          onClick={() => setActiveTab('github')}
          className={`pb-3 px-6 text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'github'
              ? 'border-b-2 border-[#343180] text-[#343180]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Github className="h-4 w-4" />
            <span>Publicação GitHub</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('parameters')}
          className={`pb-3 px-6 text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'parameters'
              ? 'border-b-2 border-[#343180] text-[#343180]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Palette className="h-4 w-4" />
            <span>Parâmetros / Cores</span>
          </div>
        </button>

        <button
          onClick={() => {
            setActiveTab('database');
            handleCheckDbStatus();
          }}
          className={`pb-3 px-6 text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'database'
              ? 'border-b-2 border-[#343180] text-[#343180]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span>Banco Neon (PostgreSQL)</span>
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

      {/* View B: JSON Period Import */}
      {activeTab === 'import' && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-6 animate-fade-in" id="admin-config-import-panel">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Importação Automática de Período (JSON)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Preencha os dados do novo período e envie um arquivo JSON contendo as atividades para criar o novo arquivo físico no GitHub.</p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center space-x-2 text-xs font-bold text-[#343180] hover:text-[#2c2a6d] bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-200 transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Baixar Modelo JSON</span>
            </button>
          </div>

          {importStatus.type && (
            <div className={`p-4 rounded-lg flex items-start space-x-3 text-sm ${
              importStatus.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                : importStatus.type === 'pending'
                  ? 'bg-blue-50 text-blue-800 border border-blue-100'
                  : 'bg-red-50 text-red-800 border border-red-100'
            }`}>
              {importStatus.type === 'success' ? (
                <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
              ) : importStatus.type === 'pending' ? (
                <RefreshCw className="h-5 w-5 shrink-0 text-blue-600 animate-spin" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
              )}
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
                <span className="text-[10px] text-slate-400 block mt-1">Digite 6 dígitos no formato MMYYYY. O arquivo gerado no repositório será <strong className="font-mono text-slate-600">atividades_[ID].json</strong>.</span>
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
                Arquivo JSON de Atividades
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                  jsonDragOver 
                    ? 'border-[#343180] bg-indigo-50/40' 
                    : jsonImportFileName 
                      ? 'border-emerald-300 bg-emerald-50/5' 
                      : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  type="file"
                  id="json-file-input"
                  accept=".json"
                  onChange={handleJsonUpload}
                  className="hidden"
                />
                {jsonImportFileName ? (
                  <FileCode className="h-10 w-10 text-emerald-600 mb-3" />
                ) : (
                  <Upload className="h-10 w-10 text-slate-400 mb-3" />
                )}
                
                <label htmlFor="json-file-input" className="cursor-pointer">
                  <span className="text-sm font-bold text-[#343180] hover:underline">
                    {jsonImportFileName ? 'Trocar arquivo selecionado' : 'Selecione um arquivo JSON'}
                  </span>
                  <span className="text-sm text-slate-500"> ou arraste e solte aqui</span>
                </label>
                
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {jsonImportFileName ? `Selecionado: ${jsonImportFileName}` : 'Formatos aceitos: .json (array de atividades)'}
                </p>
              </div>
            </div>

            {/* Instruction Panel */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-start space-x-3">
              <Info className="h-4.5 w-4.5 text-[#343180] shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 leading-relaxed space-y-1">
                <p className="font-bold text-slate-800">Estrutura Esperada do Arquivo JSON:</p>
                <p>O arquivo JSON deve conter um array de objetos ou um objeto com a chave <code className="bg-slate-200 px-1 py-0.5 rounded text-[#343180]">"atividades"</code>. Campos reconhecidos:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-500 mt-1">
                  <li><strong className="text-slate-700">name / atividade / nome:</strong> Título ou nome da demanda.</li>
                  <li><strong className="text-slate-700">jiraOrMovidesk / jira / ticket:</strong> Código do chamado ou ticket.</li>
                  <li><strong className="text-slate-700">priority / prioridade:</strong> P0, P1, P2 ou P3.</li>
                  <li><strong className="text-slate-700">owner / proprietario / responsavel:</strong> Membro encarregado.</li>
                  <li><strong className="text-slate-700">status / estado:</strong> Situação atual da atividade.</li>
                  <li><strong className="text-slate-700">category / categoria:</strong> Funcional ou Suporte Integração.</li>
                </ul>
              </div>
            </div>

            {/* Parsed Tasks Preview Table */}
            {parsedTasks.length > 0 && (
              <div className="space-y-3 bg-slate-50 border border-slate-200/60 rounded-xl p-4 animate-fade-in" id="json-parsed-preview">
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
                id="btn-confirm-import-json"
                disabled={parsedTasks.length === 0 || importStatus.type === 'pending'}
              >
                {importStatus.type === 'pending' ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Salvando e Publicando no GitHub...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Salvar e Importar Período</span>
                  </>
                )}
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
            <div className={`p-4 rounded-lg flex items-start space-x-3 text-sm border ${
              jsonSaveStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
              jsonSaveStatus.type === 'pending' ? 'bg-indigo-50 text-[#343180] border-indigo-100' :
              'bg-red-50 text-red-800 border-red-100'
            }`}>
              {jsonSaveStatus.type === 'success' && <CheckCircle className="h-5 w-5 shrink-0" />}
              {jsonSaveStatus.type === 'pending' && <RefreshCw className="h-5 w-5 shrink-0 animate-spin text-[#343180]" />}
              {jsonSaveStatus.type === 'error' && <AlertCircle className="h-5 w-5 shrink-0" />}
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

      {/* View D: GitHub Direct Publishing Config */}
      {activeTab === 'github' && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-6" id="github-config-panel">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-start">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Publicação Direta e Commits Automatizados no GitHub</h3>
              <p className="text-xs text-slate-400 mt-0.5">Configure seu Token de Acesso Pessoal (PAT) do GitHub para persistir todas as modificações diretamente no repositório.</p>
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              githubEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
            }`}>
              {githubEnabled ? 'Ativo' : 'Inativo'}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600 leading-relaxed space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center">
              <Info className="h-4 w-4 mr-1 text-[#343180]" /> Como funciona a sincronização direta com o GitHub?
            </h4>
            <p>
              Ao rodar na Vercel (que é uma hospedagem estática/serverless de leitura), operações de gravação local de arquivos JSON não persistem entre as sessões e podem dar erro de 404.
            </p>
            <p>
              Com a <strong>Publicação Direta no GitHub</strong> ativa, sempre que você clicar em "Salvar Arquivo JSON", criar um novo período, carregar um CSV ou alterar o Lock, o sistema fará um <strong>commit real</strong> no repositório do seu GitHub usando a API oficial. Isso atualiza os arquivos do seu repositório de forma definitiva e aciona um novo build automático no Vercel!
            </p>
          </div>

          {githubTestStatus.type && (
            <div className={`p-4 rounded-lg flex items-start space-x-3 text-sm border ${
              githubTestStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
              githubTestStatus.type === 'pending' ? 'bg-indigo-50 text-[#343180] border-indigo-100' :
              'bg-red-50 text-red-800 border-red-100'
            }`}>
              {githubTestStatus.type === 'success' && <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />}
              {githubTestStatus.type === 'pending' && <RefreshCw className="h-5 w-5 shrink-0 animate-spin text-[#343180]" />}
              {githubTestStatus.type === 'error' && <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />}
              <span className="whitespace-pre-wrap">{githubTestStatus.message}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Dono do Repositório (Username / Org)
                </label>
                <input
                  type="text"
                  placeholder="Ex: antoniobatista"
                  value={githubOwner}
                  onChange={(e) => setGithubOwner(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Nome do Repositório
                </label>
                <input
                  type="text"
                  placeholder="Ex: doc24-board-team-br"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Branch do Repositório
                </label>
                <input
                  type="text"
                  placeholder="main"
                  value={githubBranch}
                  onChange={(e) => setGithubBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Status de Ativação
                </label>
                <div className="flex items-center space-x-3 h-[38px]">
                  <input
                    type="checkbox"
                    id="github-enabled-toggle"
                    checked={githubEnabled}
                    onChange={(e) => setGithubEnabled(e.target.checked)}
                    className="h-4 w-4 text-[#343180] focus:ring-[#343180] border-slate-300 rounded"
                  />
                  <label htmlFor="github-enabled-toggle" className="text-sm font-medium text-slate-700 select-none cursor-pointer">
                    Ativar Publicação Automática no GitHub
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                GitHub Personal Access Token (PAT)
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#343180] font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Gere um token com escopo <strong>'repo'</strong> (para repositórios privados) ou <strong>'public_repo'</strong> (para repositórios públicos) no seu painel de desenvolvedor do GitHub.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleTestGithubConnection}
              className="flex items-center space-x-1.5 px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-all cursor-pointer justify-center"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Testar Conexão</span>
            </button>

            <button
              type="button"
              onClick={handleSaveGithubConfig}
              className="flex items-center space-x-1.5 px-5 py-2 bg-[#343180] hover:bg-[#2c2a6d] text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer justify-center"
            >
              <Save className="h-4 w-4" />
              <span>Salvar Configuração GitHub</span>
            </button>
          </div>

          {/* Diagnostic Section */}
          <div className="mt-8 border-t border-slate-200 pt-6 space-y-4" id="github-diagnostics-section">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Painel de Diagnóstico do GitHub</h4>
                <p className="text-xs text-slate-400 mt-0.5">Valide a autenticação, permissões de escrita/leitura e integridade dos arquivos.</p>
              </div>
              <button
                type="button"
                onClick={handleRunDiagnostics}
                disabled={diagnosticLoading}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#343180] rounded-lg text-xs font-bold border border-slate-200 transition-all cursor-pointer disabled:opacity-50"
              >
                {diagnosticLoading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1 text-[#343180]" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1 text-[#343180]" />
                )}
                <span>{diagnosticLoading ? 'Executando...' : 'Rodar Diagnóstico Completo'}</span>
              </button>
            </div>

            {/* Current State values (Always visible, Redacted Token) */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-sans">
              <div>
                <span className="text-slate-400 block font-medium">Token Reduzido</span>
                <span className="font-mono text-slate-700 break-all">{getRedactedToken(githubToken)}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Dono do Repositório</span>
                <span className="font-medium text-slate-800">{githubOwner || <em className="text-slate-400">Não definido</em>}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Repositório</span>
                <span className="font-medium text-slate-800">{githubRepo || <em className="text-slate-400">Não definido</em>}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Branch / Sincronização</span>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="font-mono bg-slate-200/60 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">{githubBranch || 'main'}</span>
                  <span className={`inline-block w-2 h-2 rounded-full ${githubEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} title={githubEnabled ? 'Ativo' : 'Inativo'}></span>
                  <span className="text-[10px] text-slate-500">{githubEnabled ? 'Ativo' : 'Inativo'}</span>
                </div>
              </div>
            </div>

            {/* Diagnostic Error */}
            {diagnosticError && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start space-x-3 text-xs text-rose-800">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Falha no Diagnóstico</p>
                  <p className="leading-relaxed whitespace-pre-wrap">{diagnosticError}</p>
                </div>
              </div>
            )}

            {/* Diagnostic Results detail view */}
            {diagnosticResult && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in text-xs font-sans">
                
                {/* Panel 1: Connection & API Permissions */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                  <h5 className="font-bold text-slate-700 border-b border-slate-100 pb-1.5 uppercase tracking-wider text-[10px]">Autenticação e Permissões</h5>
                  
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Conexão da API:</span>
                      <div className="flex items-center space-x-1.5">
                        <span className={`w-2 h-2 rounded-full ${diagnosticResult.connection?.success ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        <span className={`font-bold ${diagnosticResult.connection?.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {diagnosticResult.connection?.success ? 'OK (200)' : 'Falhou'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Escopos OAuth (Classic):</span>
                      <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] max-w-[180px] truncate" title={diagnosticResult.permissions?.scopes}>
                        {diagnosticResult.permissions?.scopes || 'Nenhum'}
                      </span>
                    </div>

                    <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                      <span className="text-slate-500">Permissão de Leitura (Pull):</span>
                      <div className="flex items-center space-x-1">
                        <span className={diagnosticResult.permissions?.pull ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                          {diagnosticResult.permissions?.pull ? 'Concedido' : 'Negado'}
                        </span>
                        {diagnosticResult.permissions?.pull ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-rose-500" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Permissão de Escrita (Push):</span>
                      <div className="flex items-center space-x-1">
                        <span className={diagnosticResult.permissions?.push ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                          {diagnosticResult.permissions?.push ? 'Concedido' : 'Negado'}
                        </span>
                        {diagnosticResult.permissions?.push ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-rose-500" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Admin do Repositório:</span>
                      <span className="text-slate-700 font-medium">{diagnosticResult.permissions?.admin ? 'Sim' : 'Não'}</span>
                    </div>
                  </div>
                </div>

                {/* Panel 2: Repo Branch and File Integrity */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                  <h5 className="font-bold text-slate-700 border-b border-slate-100 pb-1.5 uppercase tracking-wider text-[10px]">Integridade do Repositório e Servidor</h5>
                  
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Visibilidade do Repo:</span>
                      <span className="font-semibold text-slate-700">{diagnosticResult.repoState?.isPrivate ? 'Privado (Seguro)' : 'Público'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Branch Alvo Existe?</span>
                      <div className="flex items-center space-x-1">
                        <span className={diagnosticResult.repoState?.branchExists ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                          {diagnosticResult.repoState?.branchExists ? 'Sim' : 'Não'}
                        </span>
                        {diagnosticResult.repoState?.branchExists ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-rose-500" title={diagnosticResult.repoState?.branchError || 'Erro na branch'} />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">usuarios.json Remoto?</span>
                      <div className="flex items-center space-x-1">
                        <span className={diagnosticResult.repoState?.usuariosJsonExists ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                          {diagnosticResult.repoState?.usuariosJsonExists ? 'Sim (Mapeado)' : 'Não'}
                        </span>
                        {diagnosticResult.repoState?.usuariosJsonExists ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-rose-500" title={diagnosticResult.repoState?.remoteFilesError || 'Arquivo não mapeado'} />
                        )}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                      <span className="text-slate-500">Configuração no Disco Local:</span>
                      <span className="font-medium text-slate-700">
                        {diagnosticResult.serverDisk?.configExists ? 'Salva no servidor' : 'Apenas em memória'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Limite de Requisições:</span>
                      <span className="text-slate-700 font-medium">
                        {diagnosticResult.rateLimit?.remaining !== null 
                          ? `${diagnosticResult.rateLimit?.remaining} de ${diagnosticResult.rateLimit?.limit} restantes` 
                          : 'Indisponível'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'parameters' && (
        <AdminParameters />
      )}

      {/* View: Neon Database Management */}
      {activeTab === 'database' && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-6" id="admin-database-panel">
          <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-[#343180]" />
                <h3 className="text-base font-bold text-slate-800">Conexão e Banco de Dados Neon (PostgreSQL)</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Gerenciamento da persistência de dados em nuvem via Neon PostgreSQL Serverless, com suporte a Vercel e estrutura unificada.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setShowCustomDbInput(!showCustomDbInput)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer"
                id="btn-toggle-custom-db-input"
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>{showCustomDbInput ? 'Ocultar Teste Direto' : 'Testar URL Direta'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleCheckDbStatus(undefined)}
                disabled={dbLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#343180] hover:bg-[#282666] rounded-lg shadow-sm hover:shadow-md transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                id="btn-test-db-connection"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${dbLoading ? 'animate-spin' : ''}`} />
                <span>{dbLoading ? 'Testando...' : 'Testar Variável Vercel'}</span>
              </button>
            </div>
          </div>

          {/* Optional Direct Connection String Input */}
          {showCustomDbInput && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-fade-in" id="custom-db-input-box">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Testar Connection String Manualmente (Diagnóstico Imediato)</label>
                <span className="text-[11px] text-slate-500">Útil para testar credenciais antes do redeploy</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  value={customDbUrl}
                  onChange={(e) => setCustomDbUrl(e.target.value)}
                  placeholder="postgresql://neondb_owner:password@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
                  className="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#343180]"
                  id="input-custom-db-url"
                />
                <button
                  type="button"
                  onClick={() => handleCheckDbStatus(customDbUrl.trim())}
                  disabled={dbLoading || !customDbUrl.trim()}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  id="btn-test-custom-url"
                >
                  {dbLoading ? 'Testando...' : 'Validar String'}
                </button>
              </div>
            </div>
          )}

          {/* Status Box */}
          {dbStatus && (
            <div className={`p-4 rounded-xl border flex flex-col space-y-2 text-sm ${
              dbStatus.success
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`} id="db-status-banner">
              <div className="flex items-start space-x-3">
                {dbStatus.success ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 flex-1">
                  <div className="font-bold">{dbStatus.success ? 'Conexão Estabelecida com Sucesso!' : 'Status da Conexão Neon'}</div>
                  <div className="text-xs leading-relaxed opacity-90">{dbStatus.message}</div>
                </div>
              </div>

              {/* Detailed Diagnostics Info */}
              {dbStatus.diagnostics && (
                <div className="mt-3 pt-3 border-t border-slate-200/60 text-xs space-y-2 font-mono">
                  <div className="font-bold uppercase tracking-wider text-[10px] text-slate-600 font-sans">Diagnóstico Técnico:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-white/70 p-2.5 rounded-lg border border-slate-200">
                    <div><span className="text-slate-500 font-sans">Origem:</span> <strong className="text-slate-800">{dbStatus.diagnostics.matchedEnv || 'Nenhuma detectada'}</strong></div>
                    <div><span className="text-slate-500 font-sans">Driver:</span> <strong className="text-indigo-700 font-sans">{dbStatus.diagnostics.driver || 'pg / neon-http'}</strong></div>
                    <div><span className="text-slate-500 font-sans">Host:</span> <span className="text-slate-800 font-sans">{dbStatus.diagnostics.host || 'N/A'}</span></div>
                    <div><span className="text-slate-500 font-sans">Banco / Schema:</span> <span className="text-slate-800 font-sans">{dbStatus.diagnostics.database || 'neondb'}</span></div>
                    {dbStatus.diagnostics.isPooled !== undefined && (
                      <div className="sm:col-span-2"><span className="text-slate-500 font-sans">Modo de Conexão:</span> <strong className={dbStatus.diagnostics.isPooled ? 'text-emerald-700 font-sans' : 'text-amber-700 font-sans'}>{dbStatus.diagnostics.isPooled ? 'Pooled (-pooler - ideal para serverless)' : 'Direto'}</strong></div>
                    )}
                    {dbStatus.diagnostics.maskedUrl && (
                      <div className="sm:col-span-2 truncate"><span className="text-slate-500 font-sans">URL:</span> <span className="text-slate-700">{dbStatus.diagnostics.maskedUrl}</span></div>
                    )}
                    {dbStatus.diagnostics.errorCode && (
                      <div className="sm:col-span-2 text-rose-700"><span className="text-slate-500 font-sans">Código do Erro:</span> {dbStatus.diagnostics.errorCode} ({dbStatus.diagnostics.errorName || ''})</div>
                    )}
                    {dbStatus.diagnostics.advice && (
                      <div className="sm:col-span-2 bg-amber-50 p-2 rounded border border-amber-200 text-amber-900 font-sans text-xs">
                        <strong>Recomendação:</strong> {dbStatus.diagnostics.advice}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Migration Tools Card */}
          <div className="border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-[#343180]">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">Sincronização / Carga Inicial para o Neon</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Importa todas as atividades de todos os períodos (unificadas na tabela <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">atividades</code> com a chave <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">period_id</code>) e todas as férias, ausências e deploys (unificados na tabela <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">datas_avisos</code> com o discriminator <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">tipo</code>).
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                disabled={dbMigrating}
                onClick={() => handleRunMigration(false)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#343180] hover:bg-[#282666] rounded-lg shadow-sm hover:shadow-md transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                id="btn-migrate-missing"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${dbMigrating ? 'animate-spin' : ''}`} />
                <span>{dbMigrating ? 'Sincronizando...' : 'Sincronizar Dados Locais para Neon'}</span>
              </button>

              <button
                type="button"
                disabled={dbMigrating}
                onClick={() => handleRunMigration(true)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                id="btn-force-migration"
              >
                <span>Forçar Re-gravação Completa</span>
              </button>
            </div>

            {/* Mensagem e Status Detalhado do Resultado da Sincronização */}
            {dbMigrationResult && (
              <div
                id="db-migration-result-box"
                className={`mt-4 p-4 rounded-xl border transition-all duration-300 shadow-2xs ${
                  dbMigrationResult.success
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    {dbMigrationResult.success ? (
                      <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    ) : (
                      <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg shrink-0 mt-0.5">
                        <XCircle className="h-5 w-5" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h5 className="font-bold text-sm">
                          {dbMigrationResult.success
                            ? 'Sincronização Concluída com Sucesso!'
                            : 'Falha na Sincronização dos Dados'}
                        </h5>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          dbMigrationResult.success
                            ? 'bg-emerald-200/80 text-emerald-800'
                            : 'bg-rose-200/80 text-rose-800'
                        }`}>
                          {dbMigrationResult.success ? 'Êxito' : 'Erro'}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed opacity-90">
                        {dbMigrationResult.message}
                      </p>
                      {dbMigrationResult.timestamp && (
                        <div className="flex items-center space-x-1 text-[11px] opacity-75 pt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>
                            Executado em {new Date(dbMigrationResult.timestamp).toLocaleString('pt-BR')}
                            {dbMigrationResult.executionTimeMs ? ` (${dbMigrationResult.executionTimeMs}ms)` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDbMigrationResult(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
                    title="Fechar mensagem"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Detalhamento das tabelas gravadas com sucesso */}
                {dbMigrationResult.success && dbMigrationResult.details && typeof dbMigrationResult.details === 'object' && (
                  <div className="mt-3.5 pt-3 border-t border-emerald-200/70 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                      <span className="flex items-center space-x-1.5">
                        <Table className="h-3.5 w-3.5 text-emerald-700" />
                        <span>Detalhamento dos Registros Gravados por Tabela:</span>
                      </span>
                      {dbMigrationResult.totalRecords !== undefined && (
                        <span className="text-[11px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                          Total: {dbMigrationResult.totalRecords} itens
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                      {Object.entries(dbMigrationResult.details).map(([key, val]) => {
                        const labels: Record<string, { label: string; icon: string }> = {
                          atividades: { label: 'Atividades (Unificadas)', icon: '📋' },
                          datas_avisos: { label: 'Datas & Avisos (Férias/Deploys)', icon: '🏖️' },
                          planning: { label: 'Planning', icon: '🎯' },
                          refinement: { label: 'Refinamento', icon: '🔍' },
                          usuarios: { label: 'Usuários & Perfis', icon: '👥' },
                          periods: { label: 'Períodos / Sprints', icon: '⏱️' },
                          user_tasks: { label: 'Tarefas de Usuários', icon: '✅' },
                          timer_presets: { label: 'Presets do Timer', icon: '⏳' },
                          parameters: { label: 'Parâmetros Globais', icon: '⚙️' },
                          roles_permissions: { label: 'Roles & Permissões', icon: '🛡️' },
                          versionamento: { label: 'Versionamento', icon: '🏷️' },
                          github_config: { label: 'Configuração GitHub', icon: '🐙' }
                        };
                        const itemMeta = labels[key] || { label: key, icon: '📄' };
                        return (
                          <div
                            key={key}
                            className="bg-white/80 border border-emerald-200/80 rounded-lg p-2.5 flex items-center justify-between text-xs"
                          >
                            <span className="truncate text-slate-700 font-medium flex items-center space-x-1.5" title={itemMeta.label}>
                              <span>{itemMeta.icon}</span>
                              <span className="truncate">{itemMeta.label}</span>
                            </span>
                            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0 ml-1.5">
                              {typeof val === 'number' ? `${val} un.` : String(val)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Orientações em caso de erro */}
                {!dbMigrationResult.success && (
                  <div className="mt-3 pt-3 border-t border-rose-200/70 text-xs space-y-2">
                    <div className="font-bold text-rose-900 flex items-center space-x-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-700" />
                      <span>Diagnóstico e Orientações para Resolução:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-900/90 leading-relaxed bg-white/60 p-2.5 rounded-lg border border-rose-200">
                      <li>Certifique-se de que a variável <code className="font-mono font-bold text-rose-950">DATABASE_URL</code> está configurada no painel da Vercel (aba <em>Settings ➔ Environment Variables</em>).</li>
                      <li>Para ambientes Serverless, use sempre a connection string do tipo <strong>Pooled (-pooler)</strong> do Neon.</li>
                      <li>Use o botão <strong>"Testar Variável Vercel"</strong> acima para verificar a comunicação com o banco.</li>
                      <li>Caso tenha alterado a variável recentemente na Vercel, certifique-se de realizar um <strong>Redeploy</strong>.</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Table Metrics Section */}
          {dbStatus?.tables && Object.keys(dbStatus.tables).length > 0 && (
            <div className="border border-slate-100 rounded-xl p-5 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Mapeamento das Tabelas no Neon PostgreSQL
                </h4>
                <span className="text-[11px] text-slate-500">Contagem de linhas gravadas em produção</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {Object.entries(dbStatus.tables).map(([tbl, cnt]) => (
                  <div key={tbl} className="bg-white p-3 rounded-lg border border-slate-200 text-center shadow-2xs">
                    <div className="text-lg font-black text-[#343180]">{cnt}</div>
                    <div className="text-[11px] font-medium text-slate-500 truncate" title={tbl}>
                      {tbl === 'datas_avisos' ? 'datas_avisos (única)' : tbl}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Architecture & Alternatives Guide */}
          <div className="border border-slate-200 rounded-xl p-5 space-y-4 bg-slate-50/70">
            <div className="flex items-center space-x-2 text-slate-800">
              <Shield className="h-4 w-4 text-[#343180]" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Opções e Alternativas de Persistência em Nuvem</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">1</span>
                  <h5 className="text-xs font-bold text-slate-800">Neon com Connection Pooling (Recomendado)</h5>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  No painel do Neon, selecione a opção <strong>"Pooled connection"</strong> (adiciona <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">-pooler</code> ao endereço). Isso é crucial no ambiente Serverless da Vercel para evitar esgotamento de conexões TCP.
                </p>
                <p className="text-[11px] text-slate-500">
                  Configure como <code className="font-mono font-bold text-slate-700">DATABASE_URL</code> nas Environment Variables da Vercel e realize um <strong>Redeploy</strong>.
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">2</span>
                  <h5 className="text-xs font-bold text-slate-800">Firebase Firestore (Cloud NoSQL)</h5>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Persistência nativa em tempo real no Google Cloud sem problemas de conexão serverless. Funciona tanto na Vercel quanto no AI Studio diretamente pelo cliente ou servidor.
                </p>
                <p className="text-[11px] text-indigo-600 font-medium">
                  Podemos provisionar e ativar o Firebase Firestore diretamente com autenticação e regras de segurança integradas caso prefira!
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center">3</span>
                  <h5 className="text-xs font-bold text-slate-800">Persistência Direta no GitHub (Git-as-DB)</h5>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  A aplicação possui o motor que comita e lê os arquivos de usuários, períodos e tarefas diretamente no seu repositório GitHub via Token de Acesso (aba GitHub).
                </p>
                <p className="text-[11px] text-slate-500">
                  Dispensa qualquer banco de dados externo ou custo adicional de servidor.
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center">4</span>
                  <h5 className="text-xs font-bold text-slate-800">Supabase (PostgreSQL sobre HTTP/REST)</h5>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  PostgreSQL em nuvem que fornece endpoints REST e SDK nativo em JavaScript/TypeScript, sem necessidade de túneis ou proxies TCP na Vercel.
                </p>
              </div>
            </div>
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
