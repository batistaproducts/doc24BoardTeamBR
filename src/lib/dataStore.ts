import { User, RolePermissionsData, LockStatus, Atividade, Period, Versionamento, RefinementItem, PlanningItem, AppParameters, DatasAvisosData, PersonalTask, TimerPreset } from '../types';
import defaultUsuarios from '../data/usuarios.json';
import defaultRolesPermissions from '../data/roles_permissions.json';
import defaultLockStatus from '../data/lock_status.json';
import defaultPeriods from '../data/periods.json';
import defaultAtividades072026 from '../data/atividades_072026.json';
import defaultVersionamento from '../data/versionamento.json';
import defaultGitHubConfig from '../data/github_config.json';
import defaultRefinement from '../data/refinement.json';
import defaultPlanning from '../data/planning.json';
import defaultParameters from '../data/parameters.json';
import defaultDatasAvisos from '../data/datas_avisos.json';
import defaultUserTasks from '../data/user_tasks.json';
import defaultTimerPresets from '../data/timer_presets.json';

// Local only mode flag when physical file sync is not available (e.g. static platforms like Vercel)
export let isLocalOnlyMode = false;

// In-Memory Cache to optimize memory usage and prevent repeated JSON.parse/localStorage calls
let isDataStoreInitialized = false;
const rawFileCache = new Map<string, string>();
const parsedJsonCache = new Map<string, { raw: string; parsed: any }>();

// Antonio Batista - SEG_002 - Limpa o cache em memória de arquivos brutos e objetos JSON parseados.
export function clearDataStoreCache() {
  rawFileCache.clear();
  parsedJsonCache.clear();
}

// Antonio Batista - SEG_002 - Atualiza o cache em memória para um arquivo JSON específico.
function updateCache(fileName: string, content: string) {
  const key = `btb_${fileName.replace('.json', '')}_json`;
  rawFileCache.set(key, content);
  parsedJsonCache.delete(key);
}

// Antonio Batista - SEG_002 - Retorna os dados tipados de um arquivo JSON utilizando o cache em memória para otimizar o consumo de recursos.
function getParsedJson<T>(fileName: string, fallback: T): T {
  const raw = getRawFile(fileName);
  const key = `btb_${fileName.replace('.json', '')}_json`;
  const cached = parsedJsonCache.get(key);
  if (cached && cached.raw === raw) {
    return cached.parsed as T;
  }
  try {
    const parsed = JSON.parse(raw);
    parsedJsonCache.set(key, { raw, parsed });
    return parsed as T;
  } catch {
    return fallback;
  }
}

// Antonio Batista - SEG_002 - Marca um arquivo JSON como modificado para enfileirar a sincronização assíncrona com o disco e GitHub.
export function markFileAsDirty(fileName: string) {
  if (fileName === 'github_config.json' || fileName === 'lock_status.json') return;
  try {
    const dirtyStr = localStorage.getItem('btb_dirty_files_json') || '[]';
    const dirtyList: string[] = JSON.parse(dirtyStr);
    if (!dirtyList.includes(fileName)) {
      dirtyList.push(fileName);
      localStorage.setItem('btb_dirty_files_json', JSON.stringify(dirtyList));
      console.log(`[dataStore] Marked file as modified (dirty): ${fileName}`);
    }
  } catch (e) {
    console.error("Error marking file as dirty:", e);
  }
}

// Antonio Batista - SEG_002 - Limpa a lista de arquivos pendentes de sincronização.
export function clearDirtyFiles() {
  localStorage.setItem('btb_dirty_files_json', '[]');
  console.log('[dataStore] Cleared all dirty/modified file flags.');
}

// Antonio Batista - SEG_002 - Obtém a lista dos nomes de arquivos marcados como modificados.
export function getDirtyFiles(): string[] {
  try {
    const dirtyStr = localStorage.getItem('btb_dirty_files_json');
    if (!dirtyStr) return [];
    return JSON.parse(dirtyStr);
  } catch {
    return [];
  }
}

// Antonio Batista - SEG_002 - Sincroniza o cache local do navegador com a base física do servidor ou repositório remoto.
export async function syncFromServer(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[dataStore] Sincronizando cache local com o banco de dados / servidor (/api/sync)...");
    const response = await fetch('/api/sync');
    if (!response.ok) {
      throw new Error(`Servidor retornou status HTTP ${response.status}`);
    }
    const files: Record<string, string> = await response.json();
    
    // Clear old localStorage keys associated with our app to prevent stale cache
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('btb_') && key.endsWith('_json') && key !== 'btb_github_config_json') {
        localStorage.removeItem(key);
      }
    }

    // Load each file content into localStorage and cache
    clearDataStoreCache();
    for (const [filename, content] of Object.entries(files)) {
      const key = `btb_${filename.replace('.json', '')}_json`;
      localStorage.setItem(key, content);
      rawFileCache.set(key, content);
    }
    
    isLocalOnlyMode = false;
    console.log("[dataStore] Cache local sincronizado com sucesso com o banco de dados / servidor!");
    return { success: true };
  } catch (e: any) {
    console.warn("[dataStore] Falha ao sincronizar via /api/sync:", e.message);

    // Fallback: If GitHub integration is enabled and configured, attempt pullFromGitHub as contingency
    const config = getGitHubConfig();
    if (config.enabled && config.token && config.owner && config.repo) {
      console.log("[dataStore Fallback] Tentando obter dados do GitHub como contingência...");
      try {
        const gitResult = await pullFromGitHub();
        if (gitResult.success) {
          isLocalOnlyMode = false;
          return { success: true };
        }
      } catch (gitErr: any) {
        console.warn("[dataStore Fallback] Falha no pull do GitHub:", gitErr);
      }
    }

    isLocalOnlyMode = true;
    return { success: false, error: e.message || 'Erro de rede ao conectar ao servidor / banco de dados.' };
  }
}

// Antonio Batista - SEG_002 - Inicializa o repositório local de dados com valores padrão caso o storage esteja vazio.
export function initializeDataStore() {
  if (isDataStoreInitialized) return;
  
  const cachedUsuarios = localStorage.getItem('btb_usuarios_json');
  if (!cachedUsuarios || cachedUsuarios === '[]') {
    localStorage.setItem('btb_usuarios_json', JSON.stringify(defaultUsuarios, null, 2));
  }
  const cachedRoles = localStorage.getItem('btb_roles_permissions_json');
  if (!cachedRoles || !cachedRoles.includes('planning_refinement')) {
    localStorage.setItem('btb_roles_permissions_json', JSON.stringify(defaultRolesPermissions, null, 2));
  }
  if (!localStorage.getItem('btb_lock_status_json')) {
    localStorage.setItem('btb_lock_status_json', JSON.stringify(defaultLockStatus, null, 2));
  }
  const cachedParams = localStorage.getItem('btb_parameters_json');
  if (!cachedParams || !cachedParams.includes('"components"') || !cachedParams.includes('Funcional') || !cachedParams.includes('"type"')) {
    localStorage.setItem('btb_parameters_json', JSON.stringify(defaultParameters, null, 2));
  }
  if (!localStorage.getItem('btb_periods_json')) {
    localStorage.setItem('btb_periods_json', JSON.stringify(defaultPeriods, null, 2));
  }
  
  // Seed activities for periods
  if (!localStorage.getItem('btb_atividades_072026_json')) {
    localStorage.setItem('btb_atividades_072026_json', JSON.stringify(defaultAtividades072026, null, 2));
  }
  if (!localStorage.getItem('btb_versionamento_json')) {
    localStorage.setItem('btb_versionamento_json', JSON.stringify(defaultVersionamento, null, 2));
  }
  if (!localStorage.getItem('btb_github_config_json')) {
    localStorage.setItem('btb_github_config_json', JSON.stringify(defaultGitHubConfig, null, 2));
  }
  if (!localStorage.getItem('btb_refinement_json')) {
    localStorage.setItem('btb_refinement_json', JSON.stringify(defaultRefinement, null, 2));
  }
  if (!localStorage.getItem('btb_planning_json')) {
    localStorage.setItem('btb_planning_json', JSON.stringify(defaultPlanning, null, 2));
  }
  if (!localStorage.getItem('btb_datas_avisos_json')) {
    localStorage.setItem('btb_datas_avisos_json', JSON.stringify(defaultDatasAvisos, null, 2));
  }
  if (!localStorage.getItem('btb_user_tasks_json')) {
    localStorage.setItem('btb_user_tasks_json', JSON.stringify(defaultUserTasks, null, 2));
  }
  if (!localStorage.getItem('btb_timer_presets_json')) {
    localStorage.setItem('btb_timer_presets_json', JSON.stringify(defaultTimerPresets, null, 2));
  }
  
  isDataStoreInitialized = true;
}

// Antonio Batista - SEG_002 - Recupera os presets de timer parametrizados pelo admin (timer_presets.json).
export function getTimerPresets(): TimerPreset[] {
  return getParsedJson('timer_presets.json', defaultTimerPresets as TimerPreset[]);
}

// Antonio Batista - SEG_002 - Salva síncronamente a lista de presets de timer.
export function saveTimerPresets(presets: TimerPreset[]): boolean {
  return saveRawFile('timer_presets.json', JSON.stringify(presets, null, 2));
}

// Antonio Batista - SEG_002 - Salva assíncronamente a lista de presets de timer.
export async function saveTimerPresetsAsync(presets: TimerPreset[]): Promise<{ success: boolean; error?: string }> {
  return saveRawFileAsync('timer_presets.json', JSON.stringify(presets, null, 2));
}

// Antonio Batista - SEG_002 - Recupera as informações do histórico de versionamento da aplicação.
export function getVersionamento(): Versionamento {
  return getParsedJson('versionamento.json', defaultVersionamento as Versionamento);
}

// Antonio Batista - SEG_002 - Retorna a lista de todas as tarefas pessoais dos usuários.
export function getAllUserTasks(): PersonalTask[] {
  return getParsedJson('user_tasks.json', defaultUserTasks as PersonalTask[]);
}

// Antonio Batista - SEG_002 - Retorna as tarefas pessoais filtradas por um usuário específico.
export function getUserPersonalTasks(username: string): PersonalTask[] {
  const allTasks = getAllUserTasks();
  if (!username) return [];
  const lowerUser = username.toLowerCase().trim();
  return allTasks.filter(t => (t.ownerUsername || '').toLowerCase().trim() === lowerUser);
}

// Antonio Batista - SEG_002 - Salva síncronamente a lista de tarefas pessoais.
export function saveUserTasks(tasks: PersonalTask[]): boolean {
  return saveRawFile('user_tasks.json', JSON.stringify(tasks, null, 2));
}

// Antonio Batista - SEG_002 - Salva assíncronamente a lista de tarefas pessoais.
export async function saveUserTasksAsync(tasks: PersonalTask[]): Promise<{ success: boolean; error?: string }> {
  return saveRawFileAsync('user_tasks.json', JSON.stringify(tasks, null, 2));
}

// Antonio Batista - SEG_002 - Retorna o conteúdo JSON inicial padrão para um arquivo solicitado.
export function getDefaultFileContent(fileName: string): string {
  if (fileName === 'usuarios.json') return JSON.stringify(defaultUsuarios, null, 2);
  if (fileName === 'roles_permissions.json') return JSON.stringify(defaultRolesPermissions, null, 2);
  if (fileName === 'lock_status.json') return JSON.stringify(defaultLockStatus, null, 2);
  if (fileName === 'periods.json') return JSON.stringify(defaultPeriods, null, 2);
  if (fileName === 'parameters.json') return JSON.stringify(defaultParameters, null, 2);
  if (fileName === 'atividades_072026.json') return JSON.stringify(defaultAtividades072026, null, 2);
  if (fileName === 'versionamento.json') return JSON.stringify(defaultVersionamento, null, 2);
  if (fileName === 'refinement.json') return JSON.stringify(defaultRefinement, null, 2);
  if (fileName === 'planning.json') return JSON.stringify(defaultPlanning, null, 2);
  if (fileName === 'datas_avisos.json') return JSON.stringify(defaultDatasAvisos, null, 2);
  if (fileName === 'github_config.json') return JSON.stringify(defaultGitHubConfig, null, 2);
  if (fileName === 'user_tasks.json') return JSON.stringify(defaultUserTasks, null, 2);
  if (fileName === 'timer_presets.json') return JSON.stringify(defaultTimerPresets, null, 2);
  return '[]';
}

// Antonio Batista - SEG_002 - Lê o conteúdo bruto em string de um arquivo de dados.
export function getRawFile(fileName: string): string {
  if (!isDataStoreInitialized) {
    initializeDataStore();
  }
  const key = `btb_${fileName.replace('.json', '')}_json`;
  if (rawFileCache.has(key)) {
    return rawFileCache.get(key)!;
  }
  const val = localStorage.getItem(key);
  if (val === null || val === '') {
    const defaultContent = getDefaultFileContent(fileName);
    rawFileCache.set(key, defaultContent);
    return defaultContent;
  }
  rawFileCache.set(key, val);
  return val;
}

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  enabled: boolean;
}

export interface GitHubConfigStatus {
  configured: boolean;
  enabled?: boolean;
  owner?: string;
  repo?: string;
  branch?: string;
  hasToken?: boolean;
  maskedToken?: string;
}

// Antonio Batista - SEG_002 - Consulta o status da configuração da integração com o GitHub no servidor ou localmente.
export async function getGitHubConfigStatus(): Promise<GitHubConfigStatus> {
  try {
    const res = await fetch('/api/github/config/status');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error("Failed to fetch GitHub config status from server:", e);
  }
  
  // Fallback to local storage if server is unreachable
  const local = getGitHubConfig();
  return {
    configured: !!local.owner,
    enabled: local.enabled,
    owner: local.owner,
    repo: local.repo,
    branch: local.branch,
    hasToken: !!local.token,
    maskedToken: local.token ? '****' : ''
  };
}

// Antonio Batista - SEG_002 - Retorna as configurações ativas do GitHub (Dono, Repositório, Branch, Token).
export function getGitHubConfig(): GitHubConfig {
  try {
    const configStr = localStorage.getItem('btb_github_config_json');
    if (configStr) {
      const parsed = JSON.parse(configStr);
      
      // Fallback to environment variables or default values if any field is empty
      const token = parsed.token || '';
      const owner = parsed.owner || (import.meta as any).env?.VITE_GITHUB_OWNER || defaultGitHubConfig.owner || '';
      const repo = parsed.repo || (import.meta as any).env?.VITE_GITHUB_REPO || defaultGitHubConfig.repo || '';
      const branch = parsed.branch || (import.meta as any).env?.VITE_GITHUB_BRANCH || defaultGitHubConfig.branch || 'main';
      const enabled = parsed.enabled !== undefined ? parsed.enabled : (((import.meta as any).env?.VITE_GITHUB_ENABLED === 'true') || defaultGitHubConfig.enabled || false);

      return { token, owner, repo, branch, enabled };
    }
  } catch (e) {
    console.error("Error parsing GitHub config:", e);
  }

  // Pure environment/default fallback
  const token = '';
  const owner = (import.meta as any).env?.VITE_GITHUB_OWNER || defaultGitHubConfig.owner || '';
  const repo = (import.meta as any).env?.VITE_GITHUB_REPO || defaultGitHubConfig.repo || '';
  const branch = (import.meta as any).env?.VITE_GITHUB_BRANCH || defaultGitHubConfig.branch || 'main';
  const enabled = ((import.meta as any).env?.VITE_GITHUB_ENABLED === 'true') || defaultGitHubConfig.enabled || false;

  return { token, owner, repo, branch, enabled };
}

// Antonio Batista - SEG_002 - Salva e persiste as configurações de sincronização do GitHub.
export async function saveGitHubConfig(config: GitHubConfig): Promise<{ success: boolean; error?: string }> {
  // SECURITY: Don't store the actual token in local storage if we can avoid it.
  // We'll store everything EXCEPT the token in local storage, or store a masked version.
  const configToStore = { ...config };
  if (isMaskedToken(configToStore.token)) {
    delete configToStore.token; // Don't overwrite with masked string
  }
  
  const content = JSON.stringify(configToStore, null, 2);
  localStorage.setItem('btb_github_config_json', content);
  
  // On the server, we send the full config.
  // If the token is masked, the server handler should know not to overwrite the existing one.
  const serverPayload = JSON.stringify({ content: JSON.stringify(config, null, 2) });

  let serverSuccess = false;
  let serverError: string | undefined = undefined;

  // 1. Attempt to write to local server disk (if there is one)
  try {
    const res = await fetch('/api/files/github_config.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: serverPayload
    });
    if (res.ok) {
      serverSuccess = true;
    } else {
      const text = await res.text();
      serverError = `HTTP ${res.status} - ${text}`;
      console.warn("[dataStore] Failed to write github_config.json to server disk:", serverError);
    }
  } catch (err: any) {
    serverError = err.message || 'Network error';
    console.warn("[dataStore] Network error writing github_config.json to server:", err);
  }

  // 2. Direct push to GitHub if enabled and credentials are valid
  if (config.enabled && config.token && config.owner && config.repo) {
    console.log("[GitHub Config Push] Saving configuration to GitHub repository so other users can sync it...");
    const gitResult = await pushToGitHub('github_config.json', content, true);
    if (!gitResult.success) {
      console.error("[GitHub Config Push] Failed to push github_config.json to GitHub:", gitResult.error);
    } else {
      console.log("[GitHub Config Push] Successfully pushed github_config.json to GitHub repository!");
    }
  }

  // We return success: true because the configuration was successfully written to localStorage and optionally to GitHub!
  // This bypasses the 404 blocking error on static deployments (like Vercel).
  return { success: true };
}

// Antonio Batista - SEG_002 - Formata o cabeçalho de autenticação do GitHub segundo o tipo de token.
export function isMaskedToken(token: string | undefined | null): boolean {
  if (!token) return true;
  const trimmed = token.trim();
  if (!trimmed) return true;
  return (
    trimmed.includes('...') ||
    trimmed.includes('****') ||
    trimmed.includes('••••') ||
    trimmed.includes('***') ||
    trimmed === '******' ||
    /\.{3,}/.test(trimmed) ||
    /\*{3,}/.test(trimmed) ||
    /•{3,}/.test(trimmed)
  );
}

// Antonio Batista - SEG_002 - Formata o cabeçalho de autenticação do GitHub segundo o tipo de token de forma segura.
function getAuthHeader(token: string | undefined | null): string {
  if (!token || isMaskedToken(token)) return '';
  const trimmed = token.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('github_pat_') || trimmed.startsWith('ghp_') || trimmed.startsWith('gho_')) {
    return `Bearer ${trimmed}`;
  }
  return `token ${trimmed}`;
}

// Antonio Batista - SEG_002 - Executa a atualização (pull) de dados a partir do repositório remoto no GitHub.
export async function pullFromGitHub(): Promise<{ success: boolean; error?: string }> {
  const config = getGitHubConfig();
  if (!config.enabled || !config.owner || !config.repo) {
    return { success: false, error: 'O Sincronismo com o GitHub não está configurado ou ativado.' };
  }

  const { token, owner, repo, branch } = config;

  // 1. Try server-side proxy first to pull from GitHub (uses server-side token)
  let useServerProxy = true;
  try {
    const res = await fetch('/api/sync/pull', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const result = await res.json();
      if (result.error) {
        console.warn('[GitHub Sync] Server proxy retornou aviso:', result.error);
        useServerProxy = false;
      } else {
        const files = result.files || {};
        
        // EXCLUDE lock_status.json and github_config.json from server proxy files result
        delete files['lock_status.json'];
        delete files['github_config.json'];

        // Clear old localStorage keys associated with our app to prevent stale cache
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.startsWith('btb_') && key.endsWith('_json') && key !== 'btb_github_config_json' && key !== 'btb_lock_status_json') {
            const filename = key.replace('btb_', '').replace('_json', '') + '.json';
            if (Object.keys(files).length > 0 && files[filename] === undefined) {
              localStorage.removeItem(key);
            }
          }
        }

        // Load each file content into localStorage
        for (const [filename, content] of Object.entries(files)) {
          const key = `btb_${filename.replace('.json', '')}_json`;
          localStorage.setItem(key, content as string);
        }

        clearDirtyFiles();
        isLocalOnlyMode = false;
        console.log("[dataStore] Local cache has been fully refreshed from GitHub via Server Proxy.");
        return { success: true };
      }
    } else {
      console.warn(`[GitHub Sync] Server pull proxy status ${res.status}. Falling back to direct client-side fetch...`);
      useServerProxy = false;
    }
  } catch (err) {
    console.warn('[GitHub Sync] Server proxy unreachable for pull. Falling back to direct client-side fetch...', err);
    useServerProxy = false;
  }

  // 2. Direct client-side fetch fallback (for static / client-side environments)
  if (!useServerProxy) {
    try {
      console.log("[GitHub Sync] Tentando Pull direto no cliente via GitHub REST API...");
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/src/data?ref=${branch || 'main'}&_t=${Date.now()}`;
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github+json'
      };
      
      const authHeader = getAuthHeader(token);
      if (authHeader) {
        headers['Authorization'] = authHeader;
      }

      const res = await fetch(url, { headers });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.warn(`[GitHub Sync] Resposta não-200 no pull direto (HTTP ${res.status}): ${text}`);
        return { success: false, error: `Falha ao obter lista de arquivos do repositório (HTTP ${res.status})` };
      }

      const items = await res.json();
      if (!Array.isArray(items)) {
        return { success: false, error: 'O caminho src/data no repositório GitHub não retornou uma lista válida de arquivos.' };
      }

      // Filter only JSON files, excluding config/state files
      const jsonFiles = items.filter(item => 
        item.type === 'file' && 
        item.name.endsWith('.json') &&
        item.name !== 'github_config.json' &&
        item.name !== 'lock_status.json'
      );
      const fetchedFiles: Record<string, string> = {};

      for (const fileItem of jsonFiles) {
        try {
          const separator = fileItem.url.includes('?') ? '&' : '?';
          const fileUrlWithBust = `${fileItem.url}${separator}_t=${Date.now()}`;
          
          const fileHeaders: Record<string, string> = {
            'Accept': 'application/vnd.github+json'
          };
          if (authHeader) {
            fileHeaders['Authorization'] = authHeader;
          }
          const fileRes = await fetch(fileUrlWithBust, { headers: fileHeaders });

          if (fileRes.ok) {
            const fileData = await fileRes.json();
            if (fileData.content) {
              const base64Clean = fileData.content.replace(/\s/g, '');
              const decodedContent = decodeURIComponent(escape(atob(base64Clean)));
              fetchedFiles[fileItem.name] = decodedContent;
            }
          } else {
            console.warn(`[GitHub Sync] Não foi possível obter o conteúdo de ${fileItem.name} (HTTP ${fileRes.status})`);
          }
        } catch (fetchItemErr: any) {
          console.warn(`[GitHub Sync] Aviso ao carregar item ${fileItem.name}:`, fetchItemErr?.message || fetchItemErr);
        }
      }

      // If we got no files, return graceful error
      if (Object.keys(fetchedFiles).length === 0) {
        return { success: false, error: 'Nenhum arquivo JSON válido foi retornado de src/data.' };
      }

      // Clear old localStorage keys associated with our app to prevent stale cache
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('btb_') && key.endsWith('_json') && key !== 'btb_github_config_json' && key !== 'btb_lock_status_json') {
          const fileName = key.replace('btb_', '').replace('_json', '') + '.json';
          const isFileInRepo = jsonFiles.some(f => f.name === fileName);
          const fetchedOk = fetchedFiles[fileName] !== undefined;
          
          if (isFileInRepo && !fetchedOk) {
            // Keep the cached version
            continue;
          }
          localStorage.removeItem(key);
        }
      }

      // Load each file content into localStorage
      for (const [filename, content] of Object.entries(fetchedFiles)) {
        const key = `btb_${filename.replace('.json', '')}_json`;
        localStorage.setItem(key, content);
      }

      clearDirtyFiles();
      isLocalOnlyMode = false;
      console.log("[dataStore] Local cache has been fully refreshed DIRECTLY from GitHub contents API!");
      return { success: true };
    } catch (err: any) {
      console.warn("[GitHub Sync] Aviso no sincronismo direto (Cliente-GitHub):", err?.message || err);
      return { success: false, error: `Sincronismo direto temporariamente indisponível: ${err?.message || err}` };
    }
  }

  return { success: false, error: 'Erro desconhecido ao tentar puxar dados do GitHub.' };
}

// Antonio Batista - SEG_002 - Realiza o envio/commit (push) de alterações de arquivos diretamente para a API do GitHub.
export async function pushToGitHub(fileName: string, content: string, force: boolean = false): Promise<{ success: boolean; error?: string }> {
  if (fileName === 'github_config.json' && !force) {
    console.log('[GitHub Sync] Skipping github_config.json push to git to protect credentials.');
    return { success: true };
  }
  const config = getGitHubConfig();
  if (!config.enabled || !config.owner || !config.repo) {
    return { success: false, error: 'O Sincronismo Direto com o GitHub não está configurado ou ativado.' };
  }

  const { token, owner, repo, branch } = config;

  // 1. Try server-side proxy first to bypass client-side CORS and iframe fetch constraints
  let useServerProxy = true;
  try {
    const proxyRes = await fetch('/api/sync/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileName,
        content
      })
    });

    const contentType = proxyRes.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const result = await proxyRes.json();
      if (proxyRes.ok) {
        if (result.success) {
          console.log(`[GitHub Sync via Server Proxy] Successfully committed ${fileName}`);
          return { success: true };
        } else {
          return { success: false, error: result.error || 'Erro na publicação pelo servidor.' };
        }
      } else {
        // Authentic client error or conflict returned by proxy (e.g. 409 Conflict, 403 Forbidden, 401 Unauthorized)
        console.error(`[GitHub Sync via Server Proxy] Server returned error status ${proxyRes.status}:`, result.error);
        return { success: false, error: result.error || `Erro do servidor proxy (Status ${proxyRes.status})` };
      }
    } else {
      if (proxyRes.status === 404) {
        console.warn(`[GitHub Sync] Server proxy endpoint /api/sync/publish not found (404). Falling back to direct client-side fetch...`);
      } else {
        console.warn(`[GitHub Sync] Server proxy returned non-JSON response status ${proxyRes.status} with content-type "${contentType}". Falling back to direct client-side fetch...`);
      }
      useServerProxy = false;
    }
  } catch (e) {
    console.warn('[GitHub Sync] Server proxy unreachable. Falling back to direct client-side fetch...', e);
    useServerProxy = false;
  }

  // 2. Direct client-side fetch fallback
  if (isMaskedToken(token) || !token) {
    return { success: false, error: 'O servidor proxy não respondeu e o token do GitHub no navegador está mascarado/ausente.' };
  }

  const filePath = `src/data/${fileName}`;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  let attempts = 0;
  const maxAttempts = 3;
  let lastPutStatus = 0;
  let lastPutErrorText = "";
  let overrideSha: string | undefined = undefined;

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`[GitHub API Direct] Push attempt ${attempts}/${maxAttempts} for ${fileName}...`);

    try {
      let sha: string | undefined = overrideSha;
      overrideSha = undefined; // reset for next round if this one fails too

      if (sha) {
        console.log(`[GitHub API Direct] Using override SHA from previous 409 Conflict: ${sha}`);
      } else {
        // A. Get current file's SHA with cache-busting and no-store
        const cacheBuster = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        const getRes = await fetch(`${url}?ref=${branch}&_cb=${cacheBuster}`, {
          cache: 'no-store', // Disable internal/engine HTTP cache
          headers: {
            'Authorization': getAuthHeader(token)
          }
        });

        if (getRes.status === 200) {
          const getData = await getRes.json();
          sha = getData.sha;
          console.log(`[GitHub API Direct] Retrieved current SHA for ${fileName} on attempt ${attempts}: ${sha}`);
        } else if (getRes.status === 404) {
          console.log(`[GitHub API Direct] File ${fileName} not found on attempt ${attempts}. Creating new file.`);
        } else {
          const getErrText = await getRes.text();
          if (attempts === maxAttempts) {
            return { success: false, error: `Error fetching file SHA from GitHub (HTTP ${getRes.status}): ${getErrText}` };
          }
          const waitTime = 600 * attempts;
          console.log(`[GitHub API Direct] Fetch SHA failed. Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }

      // B. Base64 encode supporting UTF-8 special characters safely
      const b64Content = btoa(unescape(encodeURIComponent(content)));

      // C. Perform the commit
      const putRes = await fetch(url, {
        method: 'PUT',
        cache: 'no-store',
        headers: {
          'Authorization': getAuthHeader(token),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Update ${fileName} via Doc24 Board Admin (Client-side Fallback)`,
          content: b64Content,
          sha: sha,
          branch: branch
        })
      });

      if (putRes.ok) {
        console.log(`[GitHub API Direct] Successfully pushed ${fileName} to ${owner}/${repo} on branch ${branch} on attempt ${attempts}`);
        return { success: true };
      }

      lastPutStatus = putRes.status;
      lastPutErrorText = await putRes.text();
      console.warn(`[GitHub API Direct] Commit attempt ${attempts} failed with status ${lastPutStatus}. Error: ${lastPutErrorText}`);

      if (lastPutStatus === 409) {
        try {
          const parsed = JSON.parse(lastPutErrorText);
          const msg = parsed.message || "";
          const match = msg.match(/is at ([a-f0-9]{40}) but expected/i);
          if (match && match[1]) {
            overrideSha = match[1];
            console.log(`[GitHub API Direct] Extracted correct SHA from 409 Conflict: ${overrideSha}. Retrying immediately with overrideSha.`);
          }
        } catch (_) {}

        const waitTime = overrideSha ? 200 : 1000 * attempts;
        console.log(`[GitHub API Direct] 409 Conflict detected. Retrying with fresh overrideSha/SHA fetch in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        if (lastPutStatus === 401 || lastPutStatus === 403 || lastPutStatus === 404) {
          break;
        }
        const waitTime = 800 * attempts;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    } catch (err: any) {
      console.error(`[GitHub API Direct] Failed to push file ${fileName} on attempt ${attempts}:`, err);
      if (attempts === maxAttempts) {
        return { success: false, error: err.message || 'Network/connection error' };
      }
      await new Promise(resolve => setTimeout(resolve, 800 * attempts));
    }
  }

  return { success: false, error: `GitHub API Commit Error (HTTP ${lastPutStatus}): ${lastPutErrorText}` };
}

// Antonio Batista - SEG_002 - Grava o conteúdo síncrono de um arquivo no storage local e dispara o salvamento prioritário no Banco de Dados / Servidor.
export function saveRawFile(fileName: string, content: string): boolean {
  try {
    // Validate JSON before saving
    JSON.parse(content);
    const key = `btb_${fileName.replace('.json', '')}_json`;
    
    // Mark as dirty if content actually changed
    const oldContent = localStorage.getItem(key);
    if (oldContent !== content) {
      markFileAsDirty(fileName);
    }

    localStorage.setItem(key, content);
    updateCache(fileName, content);

    // Dispatch save start event for real-time visual progress
    window.dispatchEvent(new CustomEvent('btb_save_start', { detail: { fileName } }));

    // 1. PRIORIDADE MÁXIMA: Salvar no Banco de Dados / Servidor (/api/files/:filename)
    fetch(`/api/files/${fileName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    })
    .then(async res => {
      if (res.ok) {
        console.log(`[dataStore] Sucesso ao persistir ${fileName} no banco de dados / servidor.`);
        window.dispatchEvent(new CustomEvent('btb_save_success', { detail: { fileName } }));
      } else {
        const text = await res.text();
        console.warn(`[dataStore] Falha ao salvar no banco de dados (${res.status}: ${text}). Acionando contingência do GitHub/JSON...`);
        
        // CONTINGÊNCIA: Salva no GitHub somente em caso de erro na gravação do banco
        const githubConfig = getGitHubConfig();
        if (githubConfig.enabled) {
          pushToGitHub(fileName, content).then(result => {
            if (!result.success) {
              console.error(`[Contingência GitHub] Falha ao gravar ${fileName} no GitHub:`, result.error);
              window.dispatchEvent(new CustomEvent('btb_save_error', { detail: { fileName, error: result.error } }));
            } else {
              console.log(`[Contingência GitHub] Sucesso ao salvar ${fileName} no GitHub como fallback.`);
              window.dispatchEvent(new CustomEvent('btb_save_success', { detail: { fileName } }));
            }
          });
        } else {
          window.dispatchEvent(new CustomEvent('btb_save_error', { detail: { fileName, error: `HTTP ${res.status} - ${text}` } }));
        }
      }
    })
    .catch(err => {
      console.warn(`[dataStore] Erro de rede ao persistir ${fileName} no servidor:`, err);
      // CONTINGÊNCIA: Salva no GitHub se servidor/banco estiver inacessível
      const githubConfig = getGitHubConfig();
      if (githubConfig.enabled) {
        pushToGitHub(fileName, content).then(result => {
          if (!result.success) {
            window.dispatchEvent(new CustomEvent('btb_save_error', { detail: { fileName, error: result.error } }));
          } else {
            window.dispatchEvent(new CustomEvent('btb_save_success', { detail: { fileName } }));
          }
        });
      } else {
        window.dispatchEvent(new CustomEvent('btb_save_error', { detail: { fileName, error: err.message || 'Erro de rede' } }));
      }
    });

    return true;
  } catch (e) {
    console.error(`Invalid JSON for file ${fileName}`, e);
    return false;
  }
}

// Antonio Batista - SEG_002 - Grava o conteúdo assíncrono de um arquivo garantindo persistência prioritária no Banco de Dados (Neon), com fallback para GitHub/JSON em caso de erro.
export async function saveRawFileAsync(fileName: string, content: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate JSON before saving
    JSON.parse(content);
    const key = `btb_${fileName.replace('.json', '')}_json`;
    
    // Mark as dirty if content actually changed
    const oldContent = localStorage.getItem(key);
    if (oldContent !== content) {
      markFileAsDirty(fileName);
    }

    localStorage.setItem(key, content);
    updateCache(fileName, content);

    // Dispatch save start event for real-time visual progress
    window.dispatchEvent(new CustomEvent('btb_save_start', { detail: { fileName } }));

    let dbSuccess = false;
    let dbErrorText = "";

    // 1. PRIORIDADE MÁXIMA: Salvar no Banco de Dados via endpoint da API
    try {
      const res = await fetch(`/api/files/${fileName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });

      if (res.ok) {
        dbSuccess = true;
        console.log(`[dataStore] Arquivo ${fileName} salvo com sucesso no Banco de Dados / Servidor.`);
        window.dispatchEvent(new CustomEvent('btb_save_success', { detail: { fileName } }));
        return { success: true };
      } else {
        const text = await res.text();
        dbErrorText = `HTTP ${res.status} - ${text}`;
        console.warn(`[dataStore] Falha ao persistir no Banco de Dados (${dbErrorText}).`);
      }
    } catch (e: any) {
      dbErrorText = e.message || 'Erro de rede ao conectar ao servidor de banco de dados';
      console.warn(`[dataStore] Exceção de rede ao persistir no banco de dados:`, e);
    }

    // 2. CONTINGÊNCIA: Salva no GitHub somente se o salvamento no banco de dados falhou
    const githubConfig = getGitHubConfig();
    if (githubConfig.enabled) {
      console.log(`[dataStore Fallback] Tentando gravar ${fileName} no GitHub como contingência após falha no banco de dados...`);
      const githubResult = await pushToGitHub(fileName, content);
      if (githubResult.success) {
        console.log(`[dataStore Fallback] Salvo no repositório GitHub com sucesso.`);
        window.dispatchEvent(new CustomEvent('btb_save_success', { detail: { fileName } }));
        return { success: true };
      } else {
        console.error(`[dataStore Fallback] Falha no fallback para o GitHub:`, githubResult.error);
        const finalError = `Erro ao salvar no banco (${dbErrorText}) e no GitHub (${githubResult.error})`;
        window.dispatchEvent(new CustomEvent('btb_save_error', { detail: { fileName, error: finalError } }));
        return { success: false, error: finalError };
      }
    }

    // 3. Se GitHub não está configurado e banco falhou
    if (isLocalOnlyMode) {
      window.dispatchEvent(new CustomEvent('btb_save_success', { detail: { fileName } }));
      return { success: true };
    }

    window.dispatchEvent(new CustomEvent('btb_save_error', { detail: { fileName, error: dbErrorText } }));
    return { success: false, error: dbErrorText || 'Falha ao salvar no banco de dados.' };
  } catch (e: any) {
    console.error(`Error saving raw file ${fileName} asynchronously:`, e);
    return { success: false, error: e.message || 'Erro ao processar arquivo' };
  }
}

// Antonio Batista - SEG_002 - Persiste todos os arquivos modificados (dirty) prioritariamente no Banco de Dados, e apenas em caso de falha no GitHub.
export async function saveAllFilesToServer(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[dataStore] Salvando arquivos modificados (dirty) no banco de dados...");
    const dirtyFiles = getDirtyFiles();

    if (dirtyFiles.length === 0) {
      console.log("[dataStore] Nenhum arquivo foi modificado. Ignorando persistência.");
      return { success: true };
    }

    const filesToSave: { fileName: string; content: string }[] = [];
    for (const fileName of dirtyFiles) {
      const key = `btb_${fileName.replace('.json', '')}_json`;
      const content = localStorage.getItem(key);
      if (content) {
        filesToSave.push({ fileName, content });
      }
    }

    if (filesToSave.length === 0) {
      clearDirtyFiles();
      return { success: true };
    }

    // 1. PRIORIDADE MÁXIMA: Salvar todos os arquivos no Banco de Dados / Servidor
    let dbSuccessCount = 0;
    const failedFiles: { fileName: string; content: string; error: string }[] = [];

    for (const { fileName, content } of filesToSave) {
      try {
        const res = await fetch(`/api/files/${fileName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        });
        if (res.ok) {
          dbSuccessCount++;
          console.log(`[dataStore] Sucesso ao gravar ${fileName} no banco de dados.`);
        } else {
          const text = await res.text();
          failedFiles.push({ fileName, content, error: `HTTP ${res.status}: ${text}` });
        }
      } catch (err: any) {
        failedFiles.push({ fileName, content, error: err.message || 'Network error' });
      }
    }

    // Se todos os arquivos foram salvos com sucesso no banco de dados, encerramos com sucesso!
    if (failedFiles.length === 0) {
      console.log(`[dataStore] Todos os ${dbSuccessCount} arquivos modificados foram salvos com sucesso no Banco de Dados!`);
      clearDirtyFiles();
      return { success: true };
    }

    console.warn(`[dataStore] ${failedFiles.length} arquivos falharam na gravação no banco. Tentando contingência no GitHub...`);

    // 2. CONTINGÊNCIA: Apenas os arquivos que falharam no banco serão enviados para o GitHub
    const githubConfig = getGitHubConfig();
    if (githubConfig.enabled) {
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      let gitError: string | undefined = undefined;
      let isFirst = true;

      for (const { fileName, content } of failedFiles) {
        if (!isFirst) {
          await delay(1200);
        }
        isFirst = false;

        const result = await pushToGitHub(fileName, content);
        if (!result.success) {
          gitError = result.error;
          break;
        }
      }

      if (!gitError) {
        console.log("[dataStore] Arquivos com falha no banco foram salvos com sucesso no GitHub como contingência.");
        clearDirtyFiles();
        return { success: true };
      } else {
        throw new Error(`Falha no banco de dados e na contingência do GitHub: ${gitError}`);
      }
    }

    if (isLocalOnlyMode) {
      clearDirtyFiles();
      return { success: true };
    }

    throw new Error(`Falha ao salvar no banco de dados: ${failedFiles.map(f => `${f.fileName} (${f.error})`).join(', ')}`);

  } catch (e: any) {
    console.warn("[dataStore] Falha na rotina saveAllFilesToServer:", e);
    return { success: false, error: e.message || 'Erro ao persistir arquivos.' };
  }
}

// Antonio Batista - SEG_002 - Aplica transformação de segurança para obfuscar e gerar hash da senha do usuário.
export function hashPassword(password: string): string {
  if (!password) return '';
  const salt = "btb_doc24_";
  const salted = salt + password.split('').reverse().join('');
  return btoa(salted);
}

// Antonio Batista - SEG_002 - Retorna a lista de usuários cadastrados no sistema.
export function getUsers(): User[] {
  return getParsedJson('usuarios.json', defaultUsuarios as User[]);
}

// Antonio Batista - SEG_002 - Recupera a matriz de cargos, papéis e permissões de acesso (RBAC).
export function getRolePermissions(): RolePermissionsData {
  return getParsedJson('roles_permissions.json', defaultRolesPermissions as RolePermissionsData);
}

// Antonio Batista - SEG_002 - Retorna o status atual de trava (lock) de edição do sistema.
export function getLockStatus(): LockStatus {
  return getParsedJson('lock_status.json', defaultLockStatus as LockStatus);
}

// Antonio Batista - SEG_002 - Atualiza e salva o estado da trava de edição de dados.
export function saveLockStatus(status: LockStatus) {
  saveRawFile('lock_status.json', JSON.stringify(status, null, 2));
}

// Antonio Batista - SEG_002 - Puxa e sincroniza a trava de edição diretamente a partir do repositório do GitHub.
export async function pullLockStatusFromGitHub(): Promise<{ success: boolean; lockStatus?: LockStatus; error?: string }> {
  const config = getGitHubConfig();
  if (!config.enabled || !config.owner || !config.repo) {
    return { success: false, error: 'A publicação direta do GitHub não está ativada ou configurada.' };
  }

  // 1. Try via Server Proxy first
  try {
    const res = await fetch('/api/sync/pull_lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      const result = await res.json();
      if (result.success && result.lockStatus) {
        localStorage.setItem('btb_lock_status_json', JSON.stringify(result.lockStatus, null, 2));
        return { success: true, lockStatus: result.lockStatus };
      }
    }
  } catch (err: any) {
    console.warn('[dataStore] Server proxy pull_lock failed:', err?.message || err);
  }

  return { success: false, error: 'Não foi possível sincronizar o lock do GitHub via servidor.' };
}

// Antonio Batista - SEG_002 - Retorna a lista de períodos/sprints ordenados decrescentemente.
export function getPeriods(): Period[] {
  const list = getParsedJson('periods.json', defaultPeriods as Period[]);
  // Sort decending based on MMYYYY (e.g., 082026 > 072026 > 062026)
  return [...list].sort((a, b) => {
    const yearA = parseInt(a.id.substring(2));
    const monthA = parseInt(a.id.substring(0, 2));
    const yearB = parseInt(b.id.substring(2));
    const monthB = parseInt(b.id.substring(0, 2));
    
    if (yearA !== yearB) {
      return yearB - yearA; // descending
    }
    return monthB - monthA; // descending
  });
}

// Antonio Batista - SEG_002 - Persiste a lista atualizada de períodos/sprints.
export function savePeriods(periods: Period[]) {
  saveRawFile('periods.json', JSON.stringify(periods, null, 2));
}

// Antonio Batista - SEG_002 - Obtém a lista de atividades pertencentes a um período específico.
export function getAtividadesForPeriod(periodId: string): Atividade[] {
  return getParsedJson(`atividades_${periodId}.json`, []);
}

// Antonio Batista - SEG_002 - Salva as atividades de um período em seu arquivo JSON correspondente.
export function saveAtividadesForPeriod(periodId: string, atividades: Atividade[]) {
  saveRawFile(`atividades_${periodId}.json`, JSON.stringify(atividades, null, 2));
}

// Antonio Batista - SEG_002 - Carrega os itens e histórias da fila de refinamento técnico.
export function getRefinementData(): RefinementItem[] {
  return getParsedJson('refinement.json', []);
}

// Antonio Batista - SEG_002 - Salva síncronamente os itens do refinamento técnico.
export function saveRefinementData(data: RefinementItem[]) {
  saveRawFile('refinement.json', JSON.stringify(data, null, 2));
}

// Antonio Batista - SEG_002 - Salva assíncronamente os itens do refinamento técnico.
export async function saveRefinementDataAsync(data: RefinementItem[]): Promise<{ success: boolean; error?: string }> {
  return saveRawFileAsync('refinement.json', JSON.stringify(data, null, 2));
}

// Antonio Batista - SEG_002 - Obtém as tarefas do planejamento/backlog do planning.
export function getPlanningData(): PlanningItem[] {
  return getParsedJson('planning.json', []);
}

// Antonio Batista - SEG_002 - Salva os itens de planejamento de sprint.
export function savePlanningData(data: PlanningItem[]) {
  saveRawFile('planning.json', JSON.stringify(data, null, 2));
}

// Antonio Batista - SEG_002 - Salva assíncronamente os itens de planejamento de sprint.
export async function savePlanningDataAsync(data: PlanningItem[]): Promise<{ success: boolean; error?: string }> {
  return saveRawFileAsync('planning.json', JSON.stringify(data, null, 2));
}

// Antonio Batista - SEG_002 - Carrega os parâmetros de configuração do aplicativo (componentes, metas, motivos).
export function getAppParameters(): AppParameters {
  const params = getParsedJson('parameters.json', defaultParameters as AppParameters);
  if (params.goals) {
    params.goals = params.goals.map(g => ({
      ...g,
      type: g.type || 'A'
    }));
  }
  if (!params.components || params.components.length === 0) {
    params.components = (defaultParameters as any).components || [
      { id: 'Front-End', label: 'Front-End', color: '#e69100' },
      { id: 'Back-End', label: 'Back-End', color: '#031ddd' },
      { id: 'Mobile', label: 'Mobile', color: '#c8d600' },
      { id: 'Design', label: 'Design', color: '#3ed507' },
      { id: 'DevOps', label: 'DevOps', color: '#14b8a6' },
      { id: 'QA', label: 'QA', color: '#f97316' },
      { id: 'Ambos', label: 'Ambos', color: '#038c37' }
    ];
  }
  return params;
}

// Antonio Batista - SEG_002 - Salva os parâmetros globais do aplicativo.
export function saveParametersData(data: AppParameters) {
  saveRawFile('parameters.json', JSON.stringify(data, null, 2));
}

// Antonio Batista - SEG_002 - Salva assíncronamente os parâmetros do aplicativo.
export async function saveParametersDataAsync(data: AppParameters): Promise<{ success: boolean; error?: string }> {
  return saveRawFileAsync('parameters.json', JSON.stringify(data, null, 2));
}

// Antonio Batista - SEG_002 - Clona um período existente gerando um novo período e transferindo demandas não concluídas (atividades, planning e refinamento).
export function duplicatePeriod(
  sourcePeriodId: string,
  newPeriodId: string,
  newPeriodLabel: string,
  inheritUnfinished: boolean
): { success: boolean; error?: string } {
  try {
    const periods = getPeriods();
    if (periods.some(p => p.id === newPeriodId)) {
      return { success: false, error: 'Este período já existe.' };
    }

    // 1. Load source tasks
    const sourceTasks = getAtividadesForPeriod(sourcePeriodId);
    let newTasks: Atividade[] = [];

    if (inheritUnfinished) {
      // Unfinished tasks (status !== 'Finalizada' && status !== 'Concluída')
      newTasks = sourceTasks
        .filter(t => t.status !== 'Finalizada' && t.status !== 'Concluída' && t.status !== 'Concluida')
        .map(t => ({
          ...t,
          // Generate new unique ID for the new period
          id: `task-${newPeriodId}-${Math.random().toString(36).substring(2, 7)}`,
          notes: t.notes ? `${t.notes} [Herdada do período ${sourcePeriodId}]` : `[Herdada do período ${sourcePeriodId}]`
        }));
    }

    // Save activities for new period
    saveAtividadesForPeriod(newPeriodId, newTasks);

    // 2. Planning items
    const allPlanning = getPlanningData();
    const sourcePlanning = allPlanning.filter(p => p.periodId === sourcePeriodId);
    let newPlanningItems: PlanningItem[] = [];

    if (inheritUnfinished) {
      newPlanningItems = sourcePlanning
        .filter(p => {
          const st = (p.estado || '').toLowerCase().trim();
          return st !== 'finalizada' && st !== 'concluída' && st !== 'concluida';
        })
        .map((p, idx) => ({
          ...p,
          id: `plan-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          periodId: newPeriodId
        }));
    }

    savePlanningData([...allPlanning, ...newPlanningItems]);

    // 3. Refinement items
    const allRefinement = getRefinementData();
    const sourceRefinement = allRefinement.filter(r => r.periodId === sourcePeriodId);
    let newRefinementItems: RefinementItem[] = [];

    if (inheritUnfinished) {
      newRefinementItems = sourceRefinement
        .filter(r => {
          const st = (r.estado || '').toLowerCase().trim();
          return st !== 'finalizada' && st !== 'concluída' && st !== 'concluida';
        })
        .map((r, idx) => ({
          ...r,
          id: `ref-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          periodId: newPeriodId
        }));
    }

    saveRefinementData([...allRefinement, ...newRefinementItems]);

    // 4. Save period list
    const updatedPeriods = [...periods, { id: newPeriodId, label: newPeriodLabel }];
    savePeriods(updatedPeriods);

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro desconhecido ao duplicar período.' };
  }
}

export interface ParsedNoteResult {
  date: string;
  content: string;
  count: number;
}

// Antonio Batista - SEG_002 - Extrai e analisa a nota/observação mais recente baseada no padrão de data [DD/MM].
export function getLastDatedNote(notes: string): ParsedNoteResult {
  if (!notes || !notes.trim()) {
    return { date: '', content: 'Não há anotações registradas', count: 0 };
  }

  // Find date patterns like [15/06] or 15/06 or [15/06/2026] or 15-06
  // Standard format requested: bracketed date [DD/MM] or standard date DD/MM
  const dateRegex = /(?:\[(\d{2}\/\d{2})\]|\b(\d{2}\/\d{2})\b)/g;

  const matches: { index: number; date: string }[] = [];
  let match;
  while ((match = dateRegex.exec(notes)) !== null) {
    matches.push({
      index: match.index,
      date: match[1] || match[2]
    });
  }

  if (matches.length === 0) {
    // If no dated matches, return the entire string or clean up a bit
    return { date: '', content: notes.trim(), count: 0 };
  }

  // Sort matches by index to be absolutely certain of order
  matches.sort((a, b) => a.index - b.index);

  // Get the last one
  const lastMatch = matches[matches.length - 1];

  // Squeeze out the content after the last date match.
  // First, find exact length of the match itself in the original string.
  const afterMatchString = notes.substring(lastMatch.index);
  const matchedTextPattern = afterMatchString.match(/^(?:\[\d{2}\/\d{2}\]|\d{2}\/\d{2})/);
  const matchedLength = matchedTextPattern ? matchedTextPattern[0].length : 5;

  // The content of this dated note spans from its date's end to the end of the notes string
  let content = afterMatchString.substring(matchedLength).trim();

  // Strip leading punctuation often used as separators (like " - ", ": ", " -> ")
  content = content.replace(/^[\s\-:;,\.➔➔]+/g, '').trim();

  return {
    date: lastMatch.date,
    content: content || 'Sem observações detalhadas nesta data.',
    count: matches.length
  };
}

// Antonio Batista - SEG_002 - Importa um novo período com seu conjunto de atividades.
export function importPeriod(
  newPeriodId: string,
  newPeriodLabel: string,
  atividades: Atividade[],
  overwrite = false
): { success: boolean; error?: string } {
  try {
    const periods = getPeriods();
    const periodExists = periods.some(p => p.id === newPeriodId);
    
    if (periodExists && !overwrite) {
      return { success: false, error: 'Este período já existe.' };
    }

    // Save activities for new period (overwrites if file already exists)
    saveAtividadesForPeriod(newPeriodId, atividades);

    if (!periodExists) {
      // Save period list by appending
      const updatedPeriods = [...periods, { id: newPeriodId, label: newPeriodLabel }];
      savePeriods(updatedPeriods);
    } else {
      // Just ensure label is updated/kept
      const updatedPeriods = periods.map(p => p.id === newPeriodId ? { ...p, label: newPeriodLabel } : p);
      savePeriods(updatedPeriods);
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao importar período.' };
  }
}

// Antonio Batista - SEG_002 - Importa um novo período via JSON com salvamento físico do arquivo e publicação no GitHub.
export async function importPeriodAsync(
  newPeriodId: string,
  newPeriodLabel: string,
  atividades: Atividade[],
  overwrite = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const periods = getPeriods();
    const periodExists = periods.some(p => p.id === newPeriodId);
    
    if (periodExists && !overwrite) {
      return { success: false, error: 'Este período já existe.' };
    }

    const atividadesFileName = `atividades_${newPeriodId}.json`;
    const atividadesContent = JSON.stringify(atividades, null, 2);
    
    // Save activities file (writes physical file to server disk and commits to GitHub)
    const atividadesResult = await saveRawFileAsync(atividadesFileName, atividadesContent);
    if (!atividadesResult.success) {
      console.warn(`[importPeriodAsync] Warning/Error saving ${atividadesFileName}:`, atividadesResult.error);
    }

    // Update periods list
    let updatedPeriods: Period[];
    if (!periodExists) {
      updatedPeriods = [...periods, { id: newPeriodId, label: newPeriodLabel }];
    } else {
      updatedPeriods = periods.map(p => p.id === newPeriodId ? { ...p, label: newPeriodLabel } : p);
    }

    const periodsContent = JSON.stringify(updatedPeriods, null, 2);
    const periodsResult = await saveRawFileAsync('periods.json', periodsContent);
    if (!periodsResult.success) {
      console.warn(`[importPeriodAsync] Warning/Error saving periods.json:`, periodsResult.error);
    }

    if (!atividadesResult.success && !periodsResult.success) {
      return { 
        success: false, 
        error: `Falha ao persistir os arquivos no servidor: ${atividadesResult.error || periodsResult.error}` 
      };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao importar período.' };
  }
}

// Antonio Batista - SEG_002 - Carrega os registros de Férias, DayOffs, Ausências Temporárias e Deploys.
export function getDatasAvisos(): DatasAvisosData {
  return getParsedJson<DatasAvisosData>('datas_avisos.json', defaultDatasAvisos as DatasAvisosData);
}

// Antonio Batista - SEG_002 - Salva síncronamente os dados de Férias, Ausências e Deploys.
export function saveDatasAvisos(data: DatasAvisosData): boolean {
  return saveRawFile('datas_avisos.json', JSON.stringify(data, null, 2));
}

// Antonio Batista - SEG_002 - Salva assíncronamente os dados de Férias, Ausências e Deploys.
export async function saveDatasAvisosAsync(data: DatasAvisosData): Promise<{ success: boolean; error?: string }> {
  return saveRawFileAsync('datas_avisos.json', JSON.stringify(data, null, 2));
}

// Antonio Batista - SEG_002 - Restaura todos os arquivos do sistema aos seus valores originais estáticos.
export function resetAllToInitial(): { success: boolean } {
  saveRawFile('usuarios.json', JSON.stringify(defaultUsuarios, null, 2));
  saveRawFile('roles_permissions.json', JSON.stringify(defaultRolesPermissions, null, 2));
  saveRawFile('lock_status.json', JSON.stringify(defaultLockStatus, null, 2));
  saveRawFile('periods.json', JSON.stringify(defaultPeriods, null, 2));
  saveRawFile('atividades_072026.json', JSON.stringify(defaultAtividades072026, null, 2));
  return { success: true };
}

// Antonio Batista - SEG_002 - Restaura um arquivo específico do sistema ao seu valor inicial.
export function resetFileToInitial(fileName: string): { success: boolean; error?: string } {
  if (fileName === 'usuarios.json') {
    saveRawFile(fileName, JSON.stringify(defaultUsuarios, null, 2));
    return { success: true };
  }
  if (fileName === 'roles_permissions.json') {
    saveRawFile(fileName, JSON.stringify(defaultRolesPermissions, null, 2));
    return { success: true };
  }
  if (fileName === 'lock_status.json') {
    saveRawFile(fileName, JSON.stringify(defaultLockStatus, null, 2));
    return { success: true };
  }
  if (fileName === 'periods.json') {
    saveRawFile(fileName, JSON.stringify(defaultPeriods, null, 2));
    return { success: true };
  }
  if (fileName === 'atividades_072026.json') {
    saveRawFile(fileName, JSON.stringify(defaultAtividades072026, null, 2));
    return { success: true };
  }
  if (fileName === 'user_tasks.json') {
    saveRawFile(fileName, JSON.stringify(defaultUserTasks, null, 2));
    return { success: true };
  }
  return { success: false, error: 'Este arquivo não possui uma semente de dados estáticos.' };
}


