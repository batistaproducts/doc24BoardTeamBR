import { User, RolePermissionsData, LockStatus, Atividade, Period, Versionamento } from '../types';
import {
  INITIAL_USERS,
  INITIAL_ROLE_PERMISSIONS,
  INITIAL_LOCK_STATUS,
  INITIAL_PERIODS,
  INITIAL_ATIVIDADES_072026,
  INITIAL_ATIVIDADES_062026,
  INITIAL_VERSIONAMENTO
} from '../data/initialData';
import defaultGitHubConfig from '../data/github_config.json';

// Local only mode flag when physical file sync is not available (e.g. static platforms like Vercel)
export let isLocalOnlyMode = false;

// Synchronizes the local storage cache with the physical JSON files on the server's disk
export async function syncFromServer(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[dataStore] Syncing local cache with physical files from server...");
    const response = await fetch('/api/sync');
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }
    const files: Record<string, string> = await response.json();
    
    // Clear old localStorage keys associated with our app to prevent stale cache
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('btb_') && key.endsWith('_json') && key !== 'btb_github_config_json') {
        localStorage.removeItem(key);
      }
    }

    // Load each file content into localStorage
    for (const [filename, content] of Object.entries(files)) {
      const key = `btb_${filename.replace('.json', '')}_json`;
      localStorage.setItem(key, content);
    }
    
    isLocalOnlyMode = false;
    console.log("[dataStore] Local cache is fully in sync with physical server files!");
    return { success: true };
  } catch (e: any) {
    console.error("Failed to sync from server, falling back to local localStorage cache:", e);
    isLocalOnlyMode = true;
    return { success: false, error: e.message || 'Erro de rede ao conectar ao servidor.' };
  }
}

// Helper to check if database is initialized, if not, set up initial values in local cache
export function initializeDataStore() {
  if (!localStorage.getItem('btb_usuarios_json')) {
    localStorage.setItem('btb_usuarios_json', JSON.stringify(INITIAL_USERS, null, 2));
  }
  if (!localStorage.getItem('btb_roles_permissions_json')) {
    localStorage.setItem('btb_roles_permissions_json', JSON.stringify(INITIAL_ROLE_PERMISSIONS, null, 2));
  }
  if (!localStorage.getItem('btb_lock_status_json')) {
    localStorage.setItem('btb_lock_status_json', JSON.stringify(INITIAL_LOCK_STATUS, null, 2));
  }
  if (!localStorage.getItem('btb_periods_json')) {
    localStorage.setItem('btb_periods_json', JSON.stringify(INITIAL_PERIODS, null, 2));
  }
  
  // Seed activities for periods
  if (!localStorage.getItem('btb_atividades_072026_json')) {
    localStorage.setItem('btb_atividades_072026_json', JSON.stringify(INITIAL_ATIVIDADES_072026, null, 2));
  }
  if (!localStorage.getItem('btb_atividades_062026_json')) {
    localStorage.setItem('btb_atividades_062026_json', JSON.stringify(INITIAL_ATIVIDADES_062026, null, 2));
  }
  if (!localStorage.getItem('btb_versionamento_json')) {
    localStorage.setItem('btb_versionamento_json', JSON.stringify(INITIAL_VERSIONAMENTO, null, 2));
  }
  if (!localStorage.getItem('btb_github_config_json')) {
    localStorage.setItem('btb_github_config_json', JSON.stringify(defaultGitHubConfig, null, 2));
  }
}

export function getVersionamento(): Versionamento {
  try {
    const content = getRawFile('versionamento.json');
    return JSON.parse(content);
  } catch (e) {
    console.error("[dataStore] Failed to parse versionamento.json:", e);
    return INITIAL_VERSIONAMENTO;
  }
}

// Low-level getters/setters for raw string representations (simulating physical .json files)
export function getRawFile(fileName: string): string {
  initializeDataStore();
  const key = `btb_${fileName.replace('.json', '')}_json`;
  return localStorage.getItem(key) || '[]';
}

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  enabled: boolean;
}

export function getGitHubConfig(): GitHubConfig {
  try {
    const configStr = localStorage.getItem('btb_github_config_json');
    if (configStr) {
      const parsed = JSON.parse(configStr);
      // Fallback to environment variables or default values if any field is empty
      const token = parsed.token || (import.meta as any).env?.VITE_GITHUB_TOKEN || defaultGitHubConfig.token || '';
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
  const token = (import.meta as any).env?.VITE_GITHUB_TOKEN || defaultGitHubConfig.token || '';
  const owner = (import.meta as any).env?.VITE_GITHUB_OWNER || defaultGitHubConfig.owner || '';
  const repo = (import.meta as any).env?.VITE_GITHUB_REPO || defaultGitHubConfig.repo || '';
  const branch = (import.meta as any).env?.VITE_GITHUB_BRANCH || defaultGitHubConfig.branch || 'main';
  const enabled = ((import.meta as any).env?.VITE_GITHUB_ENABLED === 'true') || defaultGitHubConfig.enabled || false;

  return { token, owner, repo, branch, enabled };
}

export async function saveGitHubConfig(config: GitHubConfig): Promise<{ success: boolean; error?: string }> {
  const content = JSON.stringify(config, null, 2);
  localStorage.setItem('btb_github_config_json', content);
  
  let serverSuccess = false;
  let serverError: string | undefined = undefined;

  // 1. Attempt to write to local server disk (if there is one)
  try {
    const res = await fetch('/api/files/github_config.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
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

export async function pullFromGitHub(): Promise<{ success: boolean; error?: string }> {
  const config = getGitHubConfig();
  if (!config.enabled || !config.token || !config.owner || !config.repo) {
    return { success: false, error: 'O Sincronismo Direto com o GitHub não está configurado ou ativado.' };
  }

  const { token, owner, repo, branch } = config;

  // 1. Try server-side proxy first to pull from GitHub
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
        return { success: false, error: result.error };
      }

      // Clear old localStorage keys associated with our app to prevent stale cache
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('btb_') && key.endsWith('_json') && key !== 'btb_github_config_json' && key !== 'btb_lock_status_json') {
          localStorage.removeItem(key);
        }
      }

      // Load each file content into localStorage
      const files = result.files || {};
      for (const [filename, content] of Object.entries(files)) {
        const key = `btb_${filename.replace('.json', '')}_json`;
        localStorage.setItem(key, content as string);
      }

      isLocalOnlyMode = false;
      console.log("[dataStore] Local cache has been fully refreshed from GitHub via Server Proxy.");
      return { success: true };
    } else {
      console.warn(`[GitHub Sync] Server pull proxy returned status ${res.status} with content-type "${contentType}". Falling back to direct client-side fetch...`);
      useServerProxy = false;
    }
  } catch (err) {
    console.warn('[GitHub Sync] Server proxy unreachable for pull. Falling back to direct client-side fetch...', err);
    useServerProxy = false;
  }

  // 2. Direct client-side fetch fallback (perfect for static environments like Vercel)
  if (!useServerProxy) {
    try {
      console.log("[GitHub Sync] Executando Pull direto no cliente (CORS/REST API)...");
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/src/data?ref=${branch}&_t=${Date.now()}`;
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github+json'
      };
      if (token && token.trim() !== '') {
        headers['Authorization'] = getAuthHeader(token);
      }
      const res = await fetch(url, { headers });

      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `Falha ao obter lista de arquivos do repositório (HTTP ${res.status}): ${text}` };
      }

      const items = await res.json();
      if (!Array.isArray(items)) {
        return { success: false, error: 'O caminho src/data no repositório GitHub não retornou uma lista válida de arquivos.' };
      }

      // Filter only JSON files
      const jsonFiles = items.filter(item => item.type === 'file' && item.name.endsWith('.json'));
      const fetchedFiles: Record<string, string> = {};

      for (const fileItem of jsonFiles) {
        // Fetch each file's detailed content from GitHub using its API with cache-busting
        const separator = fileItem.url.includes('?') ? '&' : '?';
        const fileUrlWithBust = `${fileItem.url}${separator}_t=${Date.now()}`;
        
        const fileHeaders: Record<string, string> = {
          'Accept': 'application/vnd.github+json'
        };
        if (token && token.trim() !== '') {
          fileHeaders['Authorization'] = getAuthHeader(token);
        }
        const fileRes = await fetch(fileUrlWithBust, { headers: fileHeaders });

        if (fileRes.ok) {
          const fileData = await fileRes.json();
          if (fileData.content) {
            // Decode base64 to UTF-8 string safely supporting special characters
            const base64Clean = fileData.content.replace(/\s/g, '');
            const decodedContent = decodeURIComponent(escape(atob(base64Clean)));
            fetchedFiles[fileItem.name] = decodedContent;
          }
        } else {
          console.error(`[GitHub Sync] Failed to fetch content for ${fileItem.name} (HTTP ${fileRes.status})`);
        }
      }

      // If we got no files, return error
      if (Object.keys(fetchedFiles).length === 0) {
        return { success: false, error: 'Nenhum arquivo JSON válido foi encontrado ou baixado de src/data.' };
      }

      // Clear old localStorage keys associated with our app to prevent stale cache
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('btb_') && key.endsWith('_json') && key !== 'btb_github_config_json' && key !== 'btb_lock_status_json') {
          localStorage.removeItem(key);
        }
      }

      // Load each file content into localStorage
      for (const [filename, content] of Object.entries(fetchedFiles)) {
        const key = `btb_${filename.replace('.json', '')}_json`;
        localStorage.setItem(key, content);
      }

      isLocalOnlyMode = false;
      console.log("[dataStore] Local cache has been fully refreshed DIRECTLY from GitHub contents API!");
      return { success: true };
    } catch (err: any) {
      console.error("Error in direct pullFromGitHub fallback:", err);
      return { success: false, error: `Erro no sincronismo direto (Cliente-GitHub): ${err.message || err}` };
    }
  }

  return { success: false, error: 'Erro desconhecido ao tentar puxar dados do GitHub.' };
}

function getAuthHeader(token: string): string {
  const trimmed = token.trim();
  if (trimmed.startsWith('github_pat_')) {
    return `Bearer ${trimmed}`;
  }
  return `token ${trimmed}`;
}

export async function pushToGitHub(fileName: string, content: string, force: boolean = false): Promise<{ success: boolean; error?: string }> {
  if (fileName === 'github_config.json' && !force) {
    console.log('[GitHub Sync] Skipping github_config.json push to git to protect credentials.');
    return { success: true };
  }
  if (fileName === 'lock_status.json') {
    console.log('[GitHub Sync] Skipping lock_status.json push to git to prevent lock state pollution and rate limiting.');
    return { success: true };
  }
  const config = getGitHubConfig();
  if (!config.enabled || !config.token || !config.owner || !config.repo) {
    return { success: false, error: 'GitHub Direct Publishing is not configured or enabled.' };
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
    if (proxyRes.ok && contentType.includes('application/json')) {
      const result = await proxyRes.json();
      if (result.success) {
        console.log(`[GitHub Sync via Server Proxy] Successfully committed ${fileName}`);
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Erro na publicação pelo servidor.' };
      }
    } else {
      console.warn(`[GitHub Sync] Server proxy returned status ${proxyRes.status} with content-type "${contentType}". Falling back to direct client-side fetch...`);
      useServerProxy = false;
    }
  } catch (e) {
    console.warn('[GitHub Sync] Server proxy unreachable. Falling back to direct client-side fetch...', e);
    useServerProxy = false;
  }

  // 2. Direct client-side fetch fallback
  const filePath = `src/data/${fileName}`;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  try {
    // A. Get current file's SHA (required by GitHub API to update existing files)
    let sha: string | undefined = undefined;
    const getRes = await fetch(`${url}?ref=${branch}`, {
      headers: {
        'Authorization': getAuthHeader(token)
      }
    });

    if (getRes.status === 200) {
      const getData = await getRes.json();
      sha = getData.sha;
    } else if (getRes.status !== 404) {
      const getErrText = await getRes.text();
      return { success: false, error: `Error fetching file SHA from GitHub (HTTP ${getRes.status}): ${getErrText}` };
    }

    // B. Base64 encode supporting UTF-8 special characters safely
    const b64Content = btoa(unescape(encodeURIComponent(content)));

    // C. Perform the commit
    const putRes = await fetch(url, {
      method: 'PUT',
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

    if (!putRes.ok) {
      const putErrText = await putRes.text();
      return { success: false, error: `GitHub API Commit Error (HTTP ${putRes.status}): ${putErrText}` };
    }

    console.log(`[GitHub API Direct] Successfully pushed ${fileName} to ${owner}/${repo} on branch ${branch}`);
    return { success: true };
  } catch (err: any) {
    console.error(`[GitHub API Direct] Failed to push file ${fileName}:`, err);
    return { success: false, error: err.message || 'Network/connection error' };
  }
}

export function saveRawFile(fileName: string, content: string): boolean {
  try {
    // Validate JSON before saving
    JSON.parse(content);
    const key = `btb_${fileName.replace('.json', '')}_json`;
    localStorage.setItem(key, content);

    // Dispatch save start event for real-time visual progress
    window.dispatchEvent(new CustomEvent('btb_save_start', { detail: { fileName } }));

    // ALWAYS save to the physical server disk
    fetch(`/api/files/${fileName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    })
    .then(res => {
      if (!res.ok) {
        console.error(`[dataStore] Failed to write physical file ${fileName} to server disk`);
        // If GitHub sync is disabled, raise visual error
        if (!getGitHubConfig().enabled) {
          window.dispatchEvent(new CustomEvent('btb_save_error', { detail: { fileName, error: `HTTP ${res.status}` } }));
        }
      } else {
        console.log(`[dataStore] Successfully wrote physical file ${fileName} to server disk`);
        if (!getGitHubConfig().enabled) {
          window.dispatchEvent(new CustomEvent('btb_save_success', { detail: { fileName } }));
        }
      }
    })
    .catch(err => {
      console.error(`[dataStore] Network error writing physical file ${fileName}:`, err);
      if (!getGitHubConfig().enabled) {
        window.dispatchEvent(new CustomEvent('btb_save_error', { detail: { fileName, error: err.message || 'Network error' } }));
      }
    });

    // Also trigger push to GitHub asynchronously if configured and enabled
    const githubConfig = getGitHubConfig();
    if (githubConfig.enabled) {
      pushToGitHub(fileName, content).then(result => {
        if (!result.success) {
          console.error(`[GitHub Sync] Async GitHub commit failed for ${fileName}:`, result.error);
          window.dispatchEvent(new CustomEvent('btb_save_error', { detail: { fileName, error: result.error } }));
        } else {
          console.log(`[GitHub Sync] Async GitHub commit succeeded for ${fileName}`);
          window.dispatchEvent(new CustomEvent('btb_save_success', { detail: { fileName } }));
        }
      });
    }

    return true;
  } catch (e) {
    console.error(`Invalid JSON for file ${fileName}`, e);
    return false;
  }
}

export async function saveRawFileAsync(fileName: string, content: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate JSON before saving
    JSON.parse(content);
    const key = `btb_${fileName.replace('.json', '')}_json`;
    localStorage.setItem(key, content);

    // Dispatch save start event for real-time visual progress
    window.dispatchEvent(new CustomEvent('btb_save_start', { detail: { fileName } }));

    let serverSuccess = false;
    let serverError: string | undefined = undefined;

    // 1. Attempt to write to local server physical disk
    try {
      const res = await fetch(`/api/files/${fileName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });

      if (res.ok) {
        serverSuccess = true;
        console.log(`[dataStore] Successfully wrote physical file ${fileName} to server disk`);
      } else {
        const text = await res.text();
        serverError = `HTTP ${res.status} - ${text}`;
        console.error(`[dataStore] Failed to write physical file ${fileName} to server disk:`, serverError);
      }
    } catch (e: any) {
      serverError = e.message || 'Network error';
      console.error(`[dataStore] Network error writing physical file ${fileName}:`, e);
    }

    // 2. Attempt to publish directly to GitHub if configured
    const githubConfig = getGitHubConfig();
    if (githubConfig.enabled) {
      console.log(`[GitHub Direct] Committing ${fileName} to GitHub...`);
      const githubResult = await pushToGitHub(fileName, content);
      if (githubResult.success) {
        console.log(`[GitHub Direct] Successfully committed ${fileName} to GitHub repository!`);
        window.dispatchEvent(new CustomEvent('btb_save_success', { detail: { fileName } }));
        return { success: true };
      } else {
        console.error(`[GitHub Direct] Failed to commit to GitHub:`, githubResult.error);
        window.dispatchEvent(new CustomEvent('btb_save_error', { detail: { fileName, error: githubResult.error } }));
        return { success: false, error: `Erro no Commit do GitHub: ${githubResult.error}` };
      }
    }

    // 3. If GitHub is NOT enabled, we rely entirely on local server physical disk (or browser localStorage fallback if in local-only mode)
    if (serverSuccess || isLocalOnlyMode) {
      if (!serverSuccess && isLocalOnlyMode) {
        console.warn(`[dataStore] Local server disk save skipped for ${fileName} because we are in local-only (static/Vercel) mode.`);
      }
      window.dispatchEvent(new CustomEvent('btb_save_success', { detail: { fileName } }));
      return { success: true };
    } else {
      // If we are on a static deployment (like Vercel), let's explain clearly in the error
      const is404 = serverError?.includes('HTTP 404');
      const enhancedError = is404 
        ? `${serverError} (Você está rodando no Vercel/Ambiente estático. Ative a Publicação Direta do GitHub nas Configurações para salvar fisicamente!)`
        : serverError;
      
      window.dispatchEvent(new CustomEvent('btb_save_error', { detail: { fileName, error: enhancedError } }));
      return { success: false, error: enhancedError };
    }
  } catch (e: any) {
    console.error(`Error saving raw file ${fileName} asynchronously:`, e);
    return { success: false, error: e.message || 'Erro ao processar arquivo' };
  }
}

// Save all modified localStorage cache files to physical disk on the server
export async function saveAllFilesToServer(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[dataStore] Saving all localStorage JSON files...");
    const keys = Object.keys(localStorage);
    const filesToSave: { fileName: string; content: string }[] = [];

    for (const key of keys) {
      if (key.startsWith('btb_') && key.endsWith('_json')) {
        const fileName = key.replace(/^btb_/, '').replace(/_json$/, '') + '.json';
        if (fileName === 'github_config.json' || fileName === 'lock_status.json') continue; // Securely protect credentials and prevent lock state pollution from repository commits
        const content = localStorage.getItem(key);
        if (content) {
          filesToSave.push({ fileName, content });
        }
      }
    }

    // 1. ALWAYS write files to the local physical server disk first
    let localSaveSuccess = false;
    let localSaveError: string | undefined = undefined;

    try {
      const savePromises = filesToSave.map(({ fileName, content }) => {
        return fetch(`/api/files/${fileName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content })
        }).then(async res => {
          if (!res.ok) {
            const text = await res.text();
            throw new Error(`Failed to save ${fileName}: HTTP ${res.status} - ${text}`);
          }
          console.log(`[dataStore] Successfully saved physical file ${fileName} to server disk.`);
          return { fileName, success: true };
        });
      });

      if (savePromises.length > 0) {
        await Promise.all(savePromises);
      }
      console.log("[dataStore] All files saved to physical server disk successfully!");
      localSaveSuccess = true;
    } catch (err: any) {
      localSaveError = err.message || 'Erro ao gravar no disco local';
      console.warn("[dataStore] Local physical server save warning/error:", localSaveError);
    }

    // 2. Try to sync to GitHub if configured
    const githubConfig = getGitHubConfig();

    if (githubConfig.enabled) {
      console.log("[dataStore] Attempting to sync all files to GitHub repository...");
      let gitError: string | undefined = undefined;

      for (const { fileName, content } of filesToSave) {
        const result = await pushToGitHub(fileName, content);
        if (!result.success) {
          gitError = result.error;
          break;
        }
      }

      if (gitError) {
        console.warn("[dataStore] GitHub commit sync failed:", gitError);
        
        // If local save succeeded or we are in local-only mode, we don't throw a fatal error. We allow the operation to succeed with a warning.
        if (localSaveSuccess || isLocalOnlyMode) {
          console.log("[dataStore] Falling back to local/localStorage storage because GitHub sync failed.");
          return { 
            success: true, 
            error: `Os dados foram salvos localmente, mas a sincronização com o GitHub falhou: ${gitError}. Por favor, verifique suas credenciais de publicação direta do GitHub.` 
          };
        } else {
          // Both local save and git sync failed
          throw new Error(`Falha ao salvar arquivos localmente (${localSaveError}) e no GitHub: ${gitError}`);
        }
      } else {
        console.log("[dataStore] All files successfully committed to GitHub!");
        return { success: true };
      }
    }

    // If GitHub is not enabled, return based on local server success (or local only mode)
    if (localSaveSuccess || isLocalOnlyMode) {
      if (!localSaveSuccess && isLocalOnlyMode) {
        console.warn("[dataStore] Local server disk save skipped because we are in local-only (static/Vercel) mode.");
      }
      return { success: true };
    } else {
      throw new Error(localSaveError || "Falha ao gravar no servidor local.");
    }

  } catch (e: any) {
    console.warn("[dataStore] Failed to save all files:", e);
    
    const githubConfig = getGitHubConfig();
    let displayError = e.message || 'Erro ao persistir arquivos.';
    if (!githubConfig.enabled && displayError.includes('HTTP 404')) {
      displayError += ' (Você está rodando no Vercel/Ambiente estático. Ative a Publicação Direta do GitHub nas Configurações para salvar fisicamente!)';
    }
    return { success: false, error: displayError };
  }
}

// Strongly typed APIs
export function getUsers(): User[] {
  try {
    return JSON.parse(getRawFile('usuarios.json'));
  } catch {
    return INITIAL_USERS;
  }
}

export function getRolePermissions(): RolePermissionsData {
  try {
    return JSON.parse(getRawFile('roles_permissions.json'));
  } catch {
    return INITIAL_ROLE_PERMISSIONS;
  }
}

export function getLockStatus(): LockStatus {
  try {
    return JSON.parse(getRawFile('lock_status.json'));
  } catch {
    return INITIAL_LOCK_STATUS;
  }
}

export function saveLockStatus(status: LockStatus) {
  saveRawFile('lock_status.json', JSON.stringify(status, null, 2));
}

export function getPeriods(): Period[] {
  try {
    const list: Period[] = JSON.parse(getRawFile('periods.json'));
    // Sort decending based on MMYYYY (e.g., 082026 > 072026 > 062026)
    return list.sort((a, b) => {
      const yearA = parseInt(a.id.substring(2));
      const monthA = parseInt(a.id.substring(0, 2));
      const yearB = parseInt(b.id.substring(2));
      const monthB = parseInt(b.id.substring(0, 2));
      
      if (yearA !== yearB) {
        return yearB - yearA; // descending
      }
      return monthB - monthA; // descending
    });
  } catch {
    return INITIAL_PERIODS;
  }
}

export function savePeriods(periods: Period[]) {
  saveRawFile('periods.json', JSON.stringify(periods, null, 2));
}

export function getAtividadesForPeriod(periodId: string): Atividade[] {
  try {
    return JSON.parse(getRawFile(`atividades_${periodId}.json`));
  } catch {
    return [];
  }
}

export function saveAtividadesForPeriod(periodId: string, atividades: Atividade[]) {
  saveRawFile(`atividades_${periodId}.json`, JSON.stringify(atividades, null, 2));
}

// Create a new period MMYYYY inheriting configurations and optionally unfinished tasks
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

    // Load source tasks
    const sourceTasks = getAtividadesForPeriod(sourcePeriodId);
    let newTasks: Atividade[] = [];

    if (inheritUnfinished) {
      // Unfinished tasks (status !== 'Finalizada')
      newTasks = sourceTasks
        .filter(t => t.status !== 'Finalizada')
        .map(t => ({
          ...t,
          // Generate new unique ID for the new period
          id: `task-${newPeriodId}-${Math.random().toString(36).substring(2, 7)}`,
          // Keep other fields but reset dates or copy depending on requirement. We copy them but can reset notes if needed.
          // Let's copy them directly as a continuation.
          notes: `${t.notes} [Herdada do período ${sourcePeriodId}]`
        }));
    }

    // Save activities for new period
    saveAtividadesForPeriod(newPeriodId, newTasks);

    // Save period list
    const updatedPeriods = [...periods, { id: newPeriodId, label: newPeriodLabel }];
    savePeriods(updatedPeriods);

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro desconhecido ao duplicar período.' };
  }
}

// Critical Column Parser: Parses anotações from right-to-left to find the most recent dated note
export interface ParsedNoteResult {
  date: string;
  content: string;
  count: number;
}

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

// Save an imported period and its associated activities
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

// Resets the entire local storage for this system back to the hardcoded constants in initialData
export function resetAllToInitial(): { success: boolean } {
  saveRawFile('usuarios.json', JSON.stringify(INITIAL_USERS, null, 2));
  saveRawFile('roles_permissions.json', JSON.stringify(INITIAL_ROLE_PERMISSIONS, null, 2));
  saveRawFile('lock_status.json', JSON.stringify(INITIAL_LOCK_STATUS, null, 2));
  saveRawFile('periods.json', JSON.stringify(INITIAL_PERIODS, null, 2));
  saveRawFile('atividades_072026.json', JSON.stringify(INITIAL_ATIVIDADES_072026, null, 2));
  saveRawFile('atividades_062026.json', JSON.stringify(INITIAL_ATIVIDADES_062026, null, 2));
  return { success: true };
}

// Resets a single specific file to its hardcoded constant in initialData
export function resetFileToInitial(fileName: string): { success: boolean; error?: string } {
  if (fileName === 'usuarios.json') {
    saveRawFile(fileName, JSON.stringify(INITIAL_USERS, null, 2));
    return { success: true };
  }
  if (fileName === 'roles_permissions.json') {
    saveRawFile(fileName, JSON.stringify(INITIAL_ROLE_PERMISSIONS, null, 2));
    return { success: true };
  }
  if (fileName === 'lock_status.json') {
    saveRawFile(fileName, JSON.stringify(INITIAL_LOCK_STATUS, null, 2));
    return { success: true };
  }
  if (fileName === 'periods.json') {
    saveRawFile(fileName, JSON.stringify(INITIAL_PERIODS, null, 2));
    return { success: true };
  }
  if (fileName === 'atividades_072026.json') {
    saveRawFile(fileName, JSON.stringify(INITIAL_ATIVIDADES_072026, null, 2));
    return { success: true };
  }
  if (fileName === 'atividades_062026.json') {
    saveRawFile(fileName, JSON.stringify(INITIAL_ATIVIDADES_062026, null, 2));
    return { success: true };
  }
  
  return { success: false, error: 'Este arquivo não possui uma semente de dados estáticos em initialData.ts.' };
}


