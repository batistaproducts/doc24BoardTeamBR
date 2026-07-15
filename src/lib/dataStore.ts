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
      if (key.startsWith('btb_') && key.endsWith('_json')) {
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

export function saveRawFile(fileName: string, content: string): boolean {
  try {
    // Validate JSON before saving
    JSON.parse(content);
    const key = `btb_${fileName.replace('.json', '')}_json`;
    localStorage.setItem(key, content);

    // Dispatch save start event for real-time visual progress
    window.dispatchEvent(new CustomEvent('btb_save_start', { detail: { fileName } }));

    if (isLocalOnlyMode) {
      // Simulate physical file save success instantly in local/offline mode (Vercel)
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('btb_save_success', { detail: { fileName } }));
      }, 400);
      return true;
    }

    // Save to the server-side physical file system on the container disk
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
        window.dispatchEvent(new CustomEvent('btb_save_error', { detail: { fileName, error: `HTTP ${res.status}` } }));
      } else {
        console.log(`[dataStore] Successfully wrote physical file ${fileName} to server disk`);
        window.dispatchEvent(new CustomEvent('btb_save_success', { detail: { fileName } }));
      }
    })
    .catch(err => {
      console.error(`[dataStore] Network error writing physical file ${fileName}:`, err);
      window.dispatchEvent(new CustomEvent('btb_save_error', { detail: { fileName, error: err.message || 'Network error' } }));
    });

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

    if (isLocalOnlyMode) {
      window.dispatchEvent(new CustomEvent('btb_save_success', { detail: { fileName } }));
      return { success: true };
    }

    // Save to the server-side physical file system on the container disk
    const res = await fetch(`/api/files/${fileName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });

    if (!res.ok) {
      const text = await res.text();
      const errMessage = `HTTP ${res.status} - ${text}`;
      console.error(`[dataStore] Failed to write physical file ${fileName} to server disk:`, errMessage);
      window.dispatchEvent(new CustomEvent('btb_save_error', { detail: { fileName, error: errMessage } }));
      return { success: false, error: errMessage };
    }

    console.log(`[dataStore] Successfully wrote physical file ${fileName} to server disk`);
    window.dispatchEvent(new CustomEvent('btb_save_success', { detail: { fileName } }));
    return { success: true };
  } catch (e: any) {
    console.error(`Error saving raw file ${fileName} asynchronously:`, e);
    return { success: false, error: e.message || 'Erro ao processar arquivo' };
  }
}

// Save all modified localStorage cache files to physical disk on the server
export async function saveAllFilesToServer(): Promise<{ success: boolean; error?: string }> {
  try {
    if (isLocalOnlyMode) {
      console.log("[dataStore] Local-only mode (Vercel), skipping physical file save on server.");
      return { success: true };
    }

    console.log("[dataStore] Saving all localStorage JSON files to physical server disk...");
    const keys = Object.keys(localStorage);
    const savePromises = [];

    for (const key of keys) {
      if (key.startsWith('btb_') && key.endsWith('_json')) {
        const fileName = key.replace(/^btb_/, '').replace(/_json$/, '') + '.json';
        const content = localStorage.getItem(key);
        if (content) {
          // Push promise to save this file
          const promise = fetch(`/api/files/${fileName}`, {
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
            console.log(`[dataStore] Successfully saved physical file ${fileName} to disk.`);
            return { fileName, success: true };
          });
          savePromises.push(promise);
        }
      }
    }

    if (savePromises.length > 0) {
      await Promise.all(savePromises);
    }
    console.log("[dataStore] All files saved to physical server disk successfully!");
    return { success: true };
  } catch (e: any) {
    console.error("[dataStore] Failed to save all files to physical server disk:", e);
    return { success: false, error: e.message || 'Erro de rede ao salvar arquivos no servidor.' };
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


