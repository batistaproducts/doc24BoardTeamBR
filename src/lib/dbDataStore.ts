import { User, RolePermissionsData, LockStatus, Atividade, Period, Versionamento, RefinementItem, PlanningItem, AppParameters, DatasAvisosData, PersonalTask, TimerPreset } from '../types';
import defaultUsuarios from '../data/usuarios.json';
import defaultRolesPermissions from '../data/roles_permissions.json';
import defaultLockStatus from '../data/lock_status.json';
import defaultPeriods from '../data/periods.json';
import defaultAtividades072026 from '../data/atividades_072026.json';
import defaultVersionamento from '../data/versionamento.json';
import defaultRefinement from '../data/refinement.json';
import defaultPlanning from '../data/planning.json';
import defaultParameters from '../data/parameters.json';
import defaultDatasAvisos from '../data/datas_avisos.json';
import defaultUserTasks from '../data/user_tasks.json';
import defaultTimerPresets from '../data/timer_presets.json';

const rawFileCache = new Map<string, string>();
const parsedJsonCache = new Map<string, { raw: string; parsed: any }>();

export function clearDbDataStoreCache() {
  rawFileCache.clear();
  parsedJsonCache.clear();
}

function updateCache(fileName: string, content: string) {
  const key = `btb_${fileName.replace('.json', '')}_json`;
  rawFileCache.set(key, content);
  parsedJsonCache.delete(key);
}

function getParsedJson<T>(fileName: string, fallback: T): T {
  const raw = getRawFileDb(fileName);
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

export async function syncFromDb(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[dbDataStore] Sincronizando com o Banco de Dados Neon (/api/db/sync)...");
    const response = await fetch('/api/db/sync');
    if (!response.ok) {
      throw new Error(`Servidor retornou status HTTP ${response.status}`);
    }
    const files: Record<string, string> = await response.json();
    
    clearDbDataStoreCache();
    for (const [filename, content] of Object.entries(files)) {
      const key = `btb_${filename.replace('.json', '')}_json`;
      localStorage.setItem(key, content);
      rawFileCache.set(key, content);
    }
    
    console.log("[dbDataStore] Sincronizado com sucesso com o banco Neon!");
    return { success: true };
  } catch (e: any) {
    console.warn("[dbDataStore] Falha ao sincronizar com Neon:", e.message);
    return { success: false, error: e.message || 'Erro ao conectar ao banco Neon.' };
  }
}

export function initializeDbDataStore() {
  const cachedUsuarios = localStorage.getItem('btb_usuarios_json');
  if (!cachedUsuarios || cachedUsuarios === '[]') {
    localStorage.setItem('btb_usuarios_json', JSON.stringify(defaultUsuarios, null, 2));
  }
  const cachedRoles = localStorage.getItem('btb_roles_permissions_json');
  if (!cachedRoles) {
    localStorage.setItem('btb_roles_permissions_json', JSON.stringify(defaultRolesPermissions, null, 2));
  }
  const cachedLock = localStorage.getItem('btb_lock_status_json');
  if (!cachedLock) {
    localStorage.setItem('btb_lock_status_json', JSON.stringify(defaultLockStatus, null, 2));
  }
  const cachedPeriods = localStorage.getItem('btb_periods_json');
  if (!cachedPeriods) {
    localStorage.setItem('btb_periods_json', JSON.stringify(defaultPeriods, null, 2));
  }
  const cachedAtiv = localStorage.getItem('btb_atividades_072026_json');
  if (!cachedAtiv) {
    localStorage.setItem('btb_atividades_072026_json', JSON.stringify(defaultAtividades072026, null, 2));
  }
  const cachedVers = localStorage.getItem('btb_versionamento_json');
  if (!cachedVers) {
    localStorage.setItem('btb_versionamento_json', JSON.stringify(defaultVersionamento, null, 2));
  }
  const cachedRef = localStorage.getItem('btb_refinement_json');
  if (!cachedRef) {
    localStorage.setItem('btb_refinement_json', JSON.stringify(defaultRefinement, null, 2));
  }
  const cachedPlan = localStorage.getItem('btb_planning_json');
  if (!cachedPlan) {
    localStorage.setItem('btb_planning_json', JSON.stringify(defaultPlanning, null, 2));
  }
  const cachedParams = localStorage.getItem('btb_parameters_json');
  if (!cachedParams) {
    localStorage.setItem('btb_parameters_json', JSON.stringify(defaultParameters, null, 2));
  }
  const cachedAvisos = localStorage.getItem('btb_datas_avisos_json');
  if (!cachedAvisos) {
    localStorage.setItem('btb_datas_avisos_json', JSON.stringify(defaultDatasAvisos, null, 2));
  }
  const cachedUserTasks = localStorage.getItem('btb_user_tasks_json');
  if (!cachedUserTasks) {
    localStorage.setItem('btb_user_tasks_json', JSON.stringify(defaultUserTasks, null, 2));
  }
  const cachedTimer = localStorage.getItem('btb_timer_presets_json');
  if (!cachedTimer) {
    localStorage.setItem('btb_timer_presets_json', JSON.stringify(defaultTimerPresets, null, 2));
  }
}

export function getRawFileDb(fileName: string): string {
  const key = `btb_${fileName.replace('.json', '')}_json`;
  if (rawFileCache.has(key)) {
    return rawFileCache.get(key)!;
  }
  const local = localStorage.getItem(key);
  if (local !== null) {
    rawFileCache.set(key, local);
    return local;
  }
  let fallback: any = '';
  if (fileName === 'usuarios.json') fallback = defaultUsuarios;
  else if (fileName === 'roles_permissions.json') fallback = defaultRolesPermissions;
  else if (fileName === 'lock_status.json') fallback = defaultLockStatus;
  else if (fileName === 'periods.json') fallback = defaultPeriods;
  else if (fileName === 'atividades_072026.json') fallback = defaultAtividades072026;
  else if (fileName === 'versionamento.json') fallback = defaultVersionamento;
  else if (fileName === 'refinement.json') fallback = defaultRefinement;
  else if (fileName === 'planning.json') fallback = defaultPlanning;
  else if (fileName === 'parameters.json') fallback = defaultParameters;
  else if (fileName === 'datas_avisos.json') fallback = defaultDatasAvisos;
  else if (fileName === 'user_tasks.json') fallback = defaultUserTasks;
  else if (fileName === 'timer_presets.json') fallback = defaultTimerPresets;
  
  const content = JSON.stringify(fallback, null, 2);
  rawFileCache.set(key, content);
  localStorage.setItem(key, content);
  return content;
}

export function saveRawFileDb(fileName: string, content: string): boolean {
  updateCache(fileName, content);
  localStorage.setItem(`btb_${fileName.replace('.json', '')}_json`, content);
  
  fetch(`/api/db/files/${fileName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: content
  }).catch(err => console.warn(`[dbDataStore] Failed to save ${fileName} to Neon DB:`, err));

  return true;
}

export function getUsers(): User[] {
  return getParsedJson<User[]>('usuarios.json', defaultUsuarios as User[]);
}

export function getRolePermissions(): RolePermissionsData {
  return getParsedJson<RolePermissionsData>('roles_permissions.json', defaultRolesPermissions as RolePermissionsData);
}

export function getLockStatus(): LockStatus {
  return getParsedJson<LockStatus>('lock_status.json', defaultLockStatus as LockStatus);
}

export function saveLockStatus(status: LockStatus) {
  saveRawFileDb('lock_status.json', JSON.stringify(status, null, 2));
}

export function getPeriods(): Period[] {
  return getParsedJson<Period[]>('periods.json', defaultPeriods as Period[]);
}

export function savePeriods(periods: Period[]) {
  saveRawFileDb('periods.json', JSON.stringify(periods, null, 2));
}

export function getAtividadesForPeriod(periodId: string): Atividade[] {
  const fileName = `atividades_${periodId}.json`;
  let fallback = defaultAtividades072026 as Atividade[];
  return getParsedJson<Atividade[]>(fileName, fallback);
}

export function saveAtividadesForPeriod(periodId: string, atividades: Atividade[]) {
  const fileName = `atividades_${periodId}.json`;
  saveRawFileDb(fileName, JSON.stringify(atividades, null, 2));
}

export function getRefinementData(): RefinementItem[] {
  return getParsedJson<RefinementItem[]>('refinement.json', defaultRefinement as RefinementItem[]);
}

export function saveRefinementData(data: RefinementItem[]) {
  saveRawFileDb('refinement.json', JSON.stringify(data, null, 2));
}

export function getPlanningData(): PlanningItem[] {
  return getParsedJson<PlanningItem[]>('planning.json', defaultPlanning as PlanningItem[]);
}

export function savePlanningData(data: PlanningItem[]) {
  saveRawFileDb('planning.json', JSON.stringify(data, null, 2));
}

export function getAppParameters(): AppParameters {
  return getParsedJson<AppParameters>('parameters.json', defaultParameters as AppParameters);
}

export function saveParametersData(data: AppParameters) {
  saveRawFileDb('parameters.json', JSON.stringify(data, null, 2));
}

export function getDatasAvisos(): DatasAvisosData {
  return getParsedJson<DatasAvisosData>('datas_avisos.json', defaultDatasAvisos as DatasAvisosData);
}

export function saveDatasAvisos(data: DatasAvisosData): boolean {
  saveRawFileDb('datas_avisos.json', JSON.stringify(data, null, 2));
  return true;
}

export function getVersionamento(): Versionamento {
  return getParsedJson<Versionamento>('versionamento.json', defaultVersionamento as Versionamento);
}

export function getAllUserTasks(): PersonalTask[] {
  return getParsedJson<PersonalTask[]>('user_tasks.json', defaultUserTasks as PersonalTask[]);
}

export function getUserPersonalTasks(username: string): PersonalTask[] {
  const all = getAllUserTasks();
  return all.filter(t => t.ownerUsername.toLowerCase() === username.toLowerCase());
}

export function saveUserTasks(tasks: PersonalTask[]): boolean {
  saveRawFileDb('user_tasks.json', JSON.stringify(tasks, null, 2));
  return true;
}

export function getTimerPresets(): TimerPreset[] {
  return getParsedJson<TimerPreset[]>('timer_presets.json', defaultTimerPresets as TimerPreset[]);
}

export function saveTimerPresets(presets: TimerPreset[]): boolean {
  saveRawFileDb('timer_presets.json', JSON.stringify(presets, null, 2));
  return true;
}

export async function testNeonConnectionApi(connectionString?: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/db/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionString })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Falha ao testar conexão com o Neon.' };
    }
    return { success: true, message: data.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro de rede ao testar conexão.' };
  }
}

export async function seedDbFromGithubApi(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/db/seed_from_github', { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Falha ao importar dados para o banco.' };
    }
    return { success: true, message: data.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro de rede.' };
  }
}

export async function pushDbToGithubApi(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/db/push_to_github', { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Falha ao exportar dados do banco para o GitHub.' };
    }
    return { success: true, message: data.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro de rede.' };
  }
}
