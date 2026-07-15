import { User, RolePermissionsData, LockStatus, Atividade, Period } from '../types';
import {
  INITIAL_USERS,
  INITIAL_ROLE_PERMISSIONS,
  INITIAL_LOCK_STATUS,
  INITIAL_PERIODS,
  INITIAL_ATIVIDADES_072026,
  INITIAL_ATIVIDADES_062026
} from '../data/initialData';

// Helper to check if database is initialized, if not, set up initial values
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
    return true;
  } catch (e) {
    console.error(`Invalid JSON for file ${fileName}`, e);
    return false;
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
