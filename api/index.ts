import { neon, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import fs from 'fs';
import path from 'path';

// Importação estática dos dados padrão para garantir disponibilidade 100% autônoma em Vercel Serverless
import defaultPeriods from '../src/data/periods.json';
import defaultAtividades072026 from '../src/data/atividades_072026.json';
import defaultDatasAvisos from '../src/data/datas_avisos.json';
import defaultUsuarios from '../src/data/usuarios.json';
import defaultRolesPermissions from '../src/data/roles_permissions.json';
import defaultPlanning from '../src/data/planning.json';
import defaultRefinement from '../src/data/refinement.json';
import defaultParameters from '../src/data/parameters.json';
import defaultTimerPresets from '../src/data/timer_presets.json';
import defaultUserTasks from '../src/data/user_tasks.json';
import defaultVersionamento from '../src/data/versionamento.json';
import defaultLockStatus from '../src/data/lock_status.json';
import defaultGitHubConfig from '../src/data/github_config.json';

// Configuração de WebSocket para Neon Serverless em Node.js / Vercel Serverless
if (typeof neonConfig !== 'undefined') {
  try {
    neonConfig.webSocketConstructor = ws;
    neonConfig.useSecureWebSocket = true;
  } catch (_) {}
}

let cachedActiveUrl: string = '';
let isInitialized = false;

// Antonio Batista - SEG_002 - Normaliza, limpa e higieniza a string de conexão para compatibilidade total com Neon e Vercel Serverless
function normalizeDbUrl(raw: string): string {
  if (!raw) return '';
  let url = raw.trim();
  url = url.replace(/^(export\s+)?([A-Za-z0-9_]+\s*=\s*)?/, '');
  url = url.replace(/^psql\s+/i, '');
  url = url.replace(/^["'`]+|["'`]+$/g, '').trim();
  if (url.startsWith('postgres://')) {
    url = url.replace('postgres://', 'postgresql://');
  }
  url = url.replace(/([?&])channel_binding=[^&]*(&|$)/g, (_match, p1, p2) => p2 === '&' ? p1 : '');
  url = url.replace(/[?&]+$/, '');
  if (!url.includes('sslmode=') && !url.includes('ssl=false')) {
    url += (url.includes('?') ? '&' : '?') + 'sslmode=require';
  }
  return url;
}

// Antonio Batista - SEG_002 - Resolve a URL do banco a partir de todas as variáveis possíveis do Vercel Marketplace / Neon
function getResolvedDbUrl(overrideUrl?: string): {
  url: string;
  source: string;
  masked: string;
  isPooled: boolean;
  host: string;
  database: string;
  user: string;
} {
  let rawUrl = '';
  let source = '';

  if (overrideUrl && overrideUrl.trim()) {
    rawUrl = overrideUrl.trim();
    source = 'CUSTOM_INPUT';
  } else if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) {
    rawUrl = process.env.DATABASE_URL.trim();
    source = 'DATABASE_URL';
  } else if (process.env.POSTGRES_URL && process.env.POSTGRES_URL.trim()) {
    rawUrl = process.env.POSTGRES_URL.trim();
    source = 'POSTGRES_URL (Vercel Neon Integration)';
  } else if (process.env.POSTGRES_PRISMA_URL && process.env.POSTGRES_PRISMA_URL.trim()) {
    rawUrl = process.env.POSTGRES_PRISMA_URL.trim();
    source = 'POSTGRES_PRISMA_URL (Vercel Neon Integration)';
  } else if (process.env.POSTGRES_URL_NON_POOLING && process.env.POSTGRES_URL_NON_POOLING.trim()) {
    rawUrl = process.env.POSTGRES_URL_NON_POOLING.trim();
    source = 'POSTGRES_URL_NON_POOLING (Vercel Neon Integration)';
  } else if (process.env.POSTGRES_URL_NO_SSL && process.env.POSTGRES_URL_NO_SSL.trim()) {
    rawUrl = process.env.POSTGRES_URL_NO_SSL.trim();
    source = 'POSTGRES_URL_NO_SSL (Vercel Neon Integration)';
  } else if (process.env.NEON_DATABASE_URL && process.env.NEON_DATABASE_URL.trim()) {
    rawUrl = process.env.NEON_DATABASE_URL.trim();
    source = 'NEON_DATABASE_URL';
  } else if (process.env.VITE_DATABASE_URL && process.env.VITE_DATABASE_URL.trim()) {
    rawUrl = process.env.VITE_DATABASE_URL.trim();
    source = 'VITE_DATABASE_URL';
  } else if (cachedActiveUrl) {
    rawUrl = cachedActiveUrl;
    source = 'SESSION_CACHED_URL';
  } else if (process.env.POSTGRES_HOST && process.env.POSTGRES_USER) {
    const user = encodeURIComponent(process.env.POSTGRES_USER);
    const pass = process.env.POSTGRES_PASSWORD ? encodeURIComponent(process.env.POSTGRES_PASSWORD) : '';
    const host = process.env.POSTGRES_HOST;
    const db = process.env.POSTGRES_DATABASE || 'neondb';
    rawUrl = `postgresql://${user}${pass ? `:${pass}` : ''}@${host}/${db}?sslmode=require`;
    source = 'POSTGRES_INDIVIDUAL_ENV_VARS (Vercel Neon Integration)';
  }

  const cleanUrl = normalizeDbUrl(rawUrl);
  let masked = cleanUrl;
  let host = 'unknown';
  let database = 'neondb';
  let user = 'unknown';

  if (cleanUrl) {
    try {
      const parsed = new URL(cleanUrl);
      host = parsed.host;
      database = parsed.pathname.replace(/^\//, '') || 'neondb';
      user = parsed.username || 'unknown';
      if (parsed.password) {
        masked = cleanUrl.replace(`:${parsed.password}@`, ':******@');
      }
    } catch (_) {
      masked = cleanUrl.substring(0, 20) + '...';
    }
  }

  return {
    url: cleanUrl,
    source,
    masked,
    isPooled: host.includes('pooler'),
    host,
    database,
    user
  };
}

// Antonio Batista - SEG_002 - Executor de queries nativo Neon HTTP (HTTPS/443)
async function executeDbQuery(sqlText: string, params: any[] = [], overrideUrl?: string): Promise<{ rows: any[]; rowCount: number }> {
  const resolved = getResolvedDbUrl(overrideUrl);
  if (!resolved.url) {
    throw new Error('DATABASE_URL / POSTGRES_URL não configurada no ambiente da Vercel.');
  }

  const sql = neon(resolved.url);
  const result = await sql.query(sqlText, params);
  const rows = Array.isArray(result) ? result : (result && Array.isArray((result as any).rows) ? (result as any).rows : []);
  const rowCount = typeof (result as any)?.rowCount === 'number' ? (result as any).rowCount : rows.length;
  return { rows, rowCount };
}

// Antonio Batista - SEG_002 - Cria a estrutura de tabelas unificadas no Neon PostgreSQL caso não existam
async function initSchema(overrideUrl?: string): Promise<boolean> {
  const resolved = getResolvedDbUrl(overrideUrl);
  if (!resolved.url) return false;

  try {
    // 1. Periods
    await executeDbQuery(`
      CREATE TABLE IF NOT EXISTS periods (
        id VARCHAR(50) PRIMARY KEY,
        label VARCHAR(100) NOT NULL,
        start_date VARCHAR(50),
        end_date VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        is_locked BOOLEAN DEFAULT false,
        raw_data JSONB DEFAULT '{}'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `, [], resolved.url);

    // 2. Atividades
    await executeDbQuery(`
      CREATE TABLE IF NOT EXISTS atividades (
        id VARCHAR(100) PRIMARY KEY,
        period_id VARCHAR(50) NOT NULL,
        name TEXT NOT NULL,
        type VARCHAR(100),
        owner VARCHAR(150),
        notes TEXT,
        jira_ticket VARCHAR(150),
        movidesk VARCHAR(150),
        service_request VARCHAR(150),
        pr_link TEXT,
        doc_link TEXT,
        componente VARCHAR(100),
        versao VARCHAR(100),
        status VARCHAR(100) NOT NULL,
        category VARCHAR(100),
        start_date VARCHAR(50),
        end_date VARCHAR(50),
        description TEXT,
        order_index INT DEFAULT 0,
        subtasks JSONB DEFAULT '[]'::jsonb,
        tags JSONB DEFAULT '[]'::jsonb,
        raw_data JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `, [], resolved.url);
    await executeDbQuery(`CREATE INDEX IF NOT EXISTS idx_atividades_period_id ON atividades(period_id);`, [], resolved.url).catch(() => {});
    await executeDbQuery(`CREATE INDEX IF NOT EXISTS idx_atividades_versao ON atividades(versao);`, [], resolved.url).catch(() => {});

    // 3. Datas e Avisos
    await executeDbQuery(`
      CREATE TABLE IF NOT EXISTS datas_avisos (
        id VARCHAR(100) PRIMARY KEY,
        tipo VARCHAR(50) NOT NULL,
        colaborador VARCHAR(150),
        subtipo VARCHAR(50),
        data_inicio VARCHAR(50),
        data_fim VARCHAR(50),
        data VARCHAR(50),
        hora_inicio VARCHAR(50),
        hora_fim VARCHAR(50),
        status VARCHAR(100),
        observacao TEXT,
        motivo TEXT,
        versao VARCHAR(100),
        componente VARCHAR(100),
        link TEXT,
        related_tasks JSONB DEFAULT '[]'::jsonb,
        raw_data JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `, [], resolved.url);
    await executeDbQuery(`CREATE INDEX IF NOT EXISTS idx_datas_avisos_tipo ON datas_avisos(tipo);`, [], resolved.url).catch(() => {});
    await executeDbQuery(`CREATE INDEX IF NOT EXISTS idx_datas_avisos_versao ON datas_avisos(versao);`, [], resolved.url).catch(() => {});

    // 4. Usuários
    await executeDbQuery(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(150),
        username VARCHAR(100),
        password VARCHAR(255),
        role VARCHAR(50) NOT NULL,
        avatar TEXT,
        preferences JSONB DEFAULT '{}'::jsonb,
        raw_data JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `, [], resolved.url);

    // 5. Roles Permissions
    await executeDbQuery(`
      CREATE TABLE IF NOT EXISTS roles_permissions (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
        roles JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `, [], resolved.url);

    // 6. Planning
    await executeDbQuery(`
      CREATE TABLE IF NOT EXISTS planning (
        id VARCHAR(100) PRIMARY KEY,
        period_id VARCHAR(50),
        atividade TEXT NOT NULL,
        responsavel VARCHAR(150),
        estado VARCHAR(100),
        versao VARCHAR(100),
        componente VARCHAR(100),
        story_point VARCHAR(50),
        jira_ticket VARCHAR(150),
        descricao TEXT,
        raw_data JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `, [], resolved.url);
    await executeDbQuery(`CREATE INDEX IF NOT EXISTS idx_planning_period_id ON planning(period_id);`, [], resolved.url).catch(() => {});

    // 7. Refinement
    await executeDbQuery(`
      CREATE TABLE IF NOT EXISTS refinement (
        id VARCHAR(100) PRIMARY KEY,
        period_id VARCHAR(50),
        atividade TEXT NOT NULL,
        responsavel VARCHAR(150),
        estado VARCHAR(100),
        versao VARCHAR(100),
        componente VARCHAR(100),
        story_point VARCHAR(50),
        jira_ticket VARCHAR(150),
        descricao TEXT,
        raw_data JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `, [], resolved.url);
    await executeDbQuery(`CREATE INDEX IF NOT EXISTS idx_refinement_period_id ON refinement(period_id);`, [], resolved.url).catch(() => {});

    // 8. Parameters
    await executeDbQuery(`
      CREATE TABLE IF NOT EXISTS parameters (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'global',
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `, [], resolved.url);

    // 9. Timer Presets
    await executeDbQuery(`
      CREATE TABLE IF NOT EXISTS timer_presets (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        duration_minutes INT NOT NULL,
        category VARCHAR(100),
        description TEXT,
        sound_alert BOOLEAN DEFAULT true,
        color VARCHAR(50),
        raw_data JSONB DEFAULT '{}'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `, [], resolved.url);

    // 10. User Tasks
    await executeDbQuery(`
      CREATE TABLE IF NOT EXISTS user_tasks (
        id VARCHAR(100) PRIMARY KEY,
        owner_username VARCHAR(100) NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'Pendente',
        priority VARCHAR(50) DEFAULT 'P2',
        raw_data JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `, [], resolved.url);
    await executeDbQuery(`CREATE INDEX IF NOT EXISTS idx_user_tasks_owner ON user_tasks(owner_username);`, [], resolved.url).catch(() => {});

    // 11. Versionamento
    await executeDbQuery(`
      CREATE TABLE IF NOT EXISTS versionamento (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `, [], resolved.url);

    // 12. Lock Status
    await executeDbQuery(`
      CREATE TABLE IF NOT EXISTS lock_status (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
        locked BOOLEAN DEFAULT false,
        locked_by VARCHAR(150),
        locked_at VARCHAR(100),
        expires_at VARCHAR(100),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `, [], resolved.url);

    // 13. GitHub Config
    await executeDbQuery(`
      CREATE TABLE IF NOT EXISTS github_config (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
        config JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `, [], resolved.url);

    isInitialized = true;
    return true;
  } catch (err: any) {
    console.warn('[Neon DB] Erro ao inicializar esquema:', err?.message || err);
    return false;
  }
}

// Antonio Batista - SEG_002 - Auto-popula o banco de dados Neon com dados padrão se as tabelas estiverem vazias
async function ensureAutoSeed(overrideUrl?: string): Promise<boolean> {
  const resolved = getResolvedDbUrl(overrideUrl);
  if (!resolved.url) return false;

  try {
    const res = await executeDbQuery('SELECT COUNT(*) as count FROM periods', [], resolved.url);
    const count = parseInt(res.rows[0]?.count || '0', 10);
    if (count === 0) {
      console.log('[Neon DB Auto-Seed] Banco vazio detectado. Populando com dados padrão...');
      await seedDatabaseWithDefaults(resolved.url);
      return true;
    }
  } catch (e: any) {
    console.warn('[Neon DB Auto-Seed] Aviso na verificação de seed:', e?.message || e);
  }
  return false;
}

// Popula o Neon DB a partir dos dados estáticos importados (sem dependência de filesystem)
async function seedDatabaseWithDefaults(overrideUrl?: string): Promise<{ success: boolean; message: string; details?: any; totalRecords?: number }> {
  const resolved = getResolvedDbUrl(overrideUrl);
  if (!resolved.url) {
    return { success: false, message: 'DATABASE_URL não configurada.' };
  }

  await initSchema(resolved.url);
  const summary: Record<string, number> = {};

  try {
    // 1. Periods
    if (Array.isArray(defaultPeriods)) {
      for (const p of defaultPeriods) {
        await executeDbQuery(`
          INSERT INTO periods (id, label, start_date, end_date, is_active, is_locked, raw_data, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, raw_data = EXCLUDED.raw_data, updated_at = NOW()
        `, [p.id, p.label, (p as any).startDate || null, (p as any).endDate || null, (p as any).isActive !== false, !!(p as any).isLocked, JSON.stringify(p)], resolved.url);
      }
      summary['periods'] = defaultPeriods.length;
    }

    // 2. Atividades (072026)
    if (Array.isArray(defaultAtividades072026)) {
      for (let idx = 0; idx < defaultAtividades072026.length; idx++) {
        const item: any = defaultAtividades072026[idx];
        const pId = item.periodId || item.period_id || '072026';
        const actId = item.id || `act_${pId}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
        await executeDbQuery(`
          INSERT INTO atividades (
            id, period_id, name, type, owner, notes, jira_ticket, movidesk, service_request,
            pr_link, doc_link, componente, versao, status, category, start_date, end_date,
            description, order_index, subtasks, tags, raw_data, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW())
          ON CONFLICT (id) DO UPDATE SET
            period_id = EXCLUDED.period_id, name = EXCLUDED.name, type = EXCLUDED.type, owner = EXCLUDED.owner,
            notes = EXCLUDED.notes, jira_ticket = EXCLUDED.jira_ticket, movidesk = EXCLUDED.movidesk,
            service_request = EXCLUDED.service_request, pr_link = EXCLUDED.pr_link, doc_link = EXCLUDED.doc_link,
            componente = EXCLUDED.componente, versao = EXCLUDED.versao, status = EXCLUDED.status,
            category = EXCLUDED.category, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date,
            description = EXCLUDED.description, order_index = EXCLUDED.order_index, subtasks = EXCLUDED.subtasks,
            tags = EXCLUDED.tags, raw_data = EXCLUDED.raw_data, updated_at = NOW()
        `, [
          actId, pId, item.name || 'Sem título', item.type || '', item.owner || '', item.notes || '',
          item.jiraOrMovidesk || item.jiraTicket || item.jira_ticket || '', item.Movidesk || item.movidesk || '',
          item.serviceRequest || '', item.prLink || '', item.docLink || '', item.componente || '', item.versao || '',
          item.status || 'Backlog', item.category || '', item.startDate || '', item.endDate || '',
          item.description || '', idx, JSON.stringify(item.subtasks || []), JSON.stringify(item.tags || []), JSON.stringify(item)
        ], resolved.url);
      }
      summary['atividades'] = defaultAtividades072026.length;
    }

    // 3. Datas e Avisos
    if (defaultDatasAvisos) {
      const datas: any = defaultDatasAvisos;
      let dCount = 0;
      if (Array.isArray(datas.feriasDayOffs)) {
        for (const f of datas.feriasDayOffs) {
          await executeDbQuery(`
            INSERT INTO datas_avisos (id, tipo, colaborador, subtipo, data_inicio, data_fim, status, observacao, raw_data, updated_at)
            VALUES ($1, 'ferias_day_off', $2, $3, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT (id) DO UPDATE SET colaborador = EXCLUDED.colaborador, data_inicio = EXCLUDED.data_inicio, data_fim = EXCLUDED.data_fim, status = EXCLUDED.status, observacao = EXCLUDED.observacao, raw_data = EXCLUDED.raw_data, updated_at = NOW()
          `, [f.id, f.colaborador || '', f.tipo || 'Férias', f.dataInicio || '', f.dataFim || '', f.status || 'Previsto', f.observacao || '', JSON.stringify(f)], resolved.url);
          dCount++;
        }
      }
      if (Array.isArray(datas.ausenciasTemporarias)) {
        for (const a of datas.ausenciasTemporarias) {
          await executeDbQuery(`
            INSERT INTO datas_avisos (id, tipo, colaborador, data, hora_inicio, hora_fim, motivo, raw_data, updated_at)
            VALUES ($1, 'ausencia_temporaria', $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (id) DO UPDATE SET colaborador = EXCLUDED.colaborador, data = EXCLUDED.data, hora_inicio = EXCLUDED.hora_inicio, hora_fim = EXCLUDED.hora_fim, motivo = EXCLUDED.motivo, raw_data = EXCLUDED.raw_data, updated_at = NOW()
          `, [a.id, a.colaborador || '', a.data || '', a.horaInicio || '', a.horaFim || '', a.motivo || '', JSON.stringify(a)], resolved.url);
          dCount++;
        }
      }
      if (Array.isArray(datas.deploys)) {
        for (const d of datas.deploys) {
          await executeDbQuery(`
            INSERT INTO datas_avisos (id, tipo, data, versao, componente, link, related_tasks, raw_data, updated_at)
            VALUES ($1, 'deploy', $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, versao = EXCLUDED.versao, componente = EXCLUDED.componente, link = EXCLUDED.link, related_tasks = EXCLUDED.related_tasks, raw_data = EXCLUDED.raw_data, updated_at = NOW()
          `, [d.id, d.data || '', d.versao || '', d.componente || '', d.link || '', JSON.stringify(d.relatedTasks || []), JSON.stringify(d)], resolved.url);
          dCount++;
        }
      }
      summary['datas_avisos'] = dCount;
    }

    // 4. Usuários
    if (Array.isArray(defaultUsuarios)) {
      for (const u of defaultUsuarios) {
        const userId = (u as any).id || (u as any).username || (u as any).email || `user_${Math.random().toString(36).substring(2, 9)}`;
        const usernameVal = (u as any).username || (u as any).email?.split('@')[0] || (u as any).name?.toLowerCase().replace(/\s+/g, '') || userId;
        await executeDbQuery(`
          INSERT INTO usuarios (id, name, email, username, password, role, avatar, preferences, raw_data, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, username = EXCLUDED.username, password = EXCLUDED.password, role = EXCLUDED.role, avatar = EXCLUDED.avatar, preferences = EXCLUDED.preferences, raw_data = EXCLUDED.raw_data, updated_at = NOW()
        `, [userId, (u as any).name || 'Sem Nome', (u as any).email || '', usernameVal, (u as any).password || '', (u as any).role || 'Analista', (u as any).avatar || '', JSON.stringify((u as any).preferences || {}), JSON.stringify({ ...u, id: userId, username: usernameVal })], resolved.url);
      }
      summary['usuarios'] = defaultUsuarios.length;
    }

    // 5. Planning
    if (Array.isArray(defaultPlanning)) {
      for (const item of defaultPlanning) {
        await executeDbQuery(`
          INSERT INTO planning (id, period_id, atividade, responsavel, estado, versao, componente, story_point, jira_ticket, descricao, raw_data, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
          ON CONFLICT (id) DO UPDATE SET
            period_id = EXCLUDED.period_id, atividade = EXCLUDED.atividade, responsavel = EXCLUDED.responsavel,
            estado = EXCLUDED.estado, versao = EXCLUDED.versao, componente = EXCLUDED.componente,
            story_point = EXCLUDED.story_point, jira_ticket = EXCLUDED.jira_ticket, descricao = EXCLUDED.descricao,
            raw_data = EXCLUDED.raw_data, updated_at = NOW()
        `, [
          item.id, (item as any).periodId || '072026', (item as any).atividade || '', (item as any).responsavel || '',
          (item as any).estado || '', (item as any).versao || '', (item as any).componente || '',
          String((item as any).storyPoint || ''), (item as any).jiraTicket || '', (item as any).descricao || '',
          JSON.stringify(item)
        ], resolved.url);
      }
      summary['planning'] = defaultPlanning.length;
    }

    // 6. Refinement
    if (Array.isArray(defaultRefinement)) {
      for (const item of defaultRefinement) {
        await executeDbQuery(`
          INSERT INTO refinement (id, period_id, atividade, responsavel, estado, versao, componente, story_point, jira_ticket, descricao, raw_data, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
          ON CONFLICT (id) DO UPDATE SET
            period_id = EXCLUDED.period_id, atividade = EXCLUDED.atividade, responsavel = EXCLUDED.responsavel,
            estado = EXCLUDED.estado, versao = EXCLUDED.versao, componente = EXCLUDED.componente,
            story_point = EXCLUDED.story_point, jira_ticket = EXCLUDED.jira_ticket, descricao = EXCLUDED.descricao,
            raw_data = EXCLUDED.raw_data, updated_at = NOW()
        `, [
          item.id, (item as any).periodId || '072026', (item as any).atividade || '', (item as any).responsavel || '',
          (item as any).estado || '', (item as any).versao || '', (item as any).componente || '',
          String((item as any).storyPoint || ''), (item as any).jiraTicket || '', (item as any).descricao || '',
          JSON.stringify(item)
        ], resolved.url);
      }
      summary['refinement'] = defaultRefinement.length;
    }

    // 7. Parâmetros, Roles, TimerPresets, UserTasks, Versionamento, Lock, GitHubConfig
    await executeDbQuery(`INSERT INTO parameters (id, data, updated_at) VALUES ('global', $1, NOW()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`, [JSON.stringify(defaultParameters)], resolved.url);
    await executeDbQuery(`INSERT INTO roles_permissions (id, roles, updated_at) VALUES ('default', $1, NOW()) ON CONFLICT (id) DO UPDATE SET roles = EXCLUDED.roles, updated_at = NOW()`, [JSON.stringify(defaultRolesPermissions)], resolved.url);
    await executeDbQuery(`INSERT INTO versionamento (id, data, updated_at) VALUES ('current', $1, NOW()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`, [JSON.stringify(defaultVersionamento)], resolved.url);
    await executeDbQuery(`INSERT INTO lock_status (id, locked, updated_at) VALUES ('current', false, NOW()) ON CONFLICT (id) DO UPDATE SET locked = false, updated_at = NOW()`, [], resolved.url);
    await executeDbQuery(`INSERT INTO github_config (id, config, updated_at) VALUES ('current', $1, NOW()) ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`, [JSON.stringify(defaultGitHubConfig)], resolved.url);

    if (Array.isArray(defaultTimerPresets)) {
      for (const tp of defaultTimerPresets) {
        await executeDbQuery(`
          INSERT INTO timer_presets (id, name, duration_minutes, category, description, sound_alert, color, raw_data, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, duration_minutes = EXCLUDED.duration_minutes, raw_data = EXCLUDED.raw_data, updated_at = NOW()
        `, [tp.id, tp.name, tp.durationMinutes || 15, tp.category || '', tp.description || '', tp.soundAlert !== false, tp.color || '', JSON.stringify(tp)], resolved.url);
      }
    }

    if (Array.isArray(defaultUserTasks)) {
      for (const ut of defaultUserTasks) {
        await executeDbQuery(`
          INSERT INTO user_tasks (id, owner_username, title, description, status, priority, raw_data, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, raw_data = EXCLUDED.raw_data, updated_at = NOW()
        `, [ut.id, ut.ownerUsername || 'admin', ut.title || '', ut.description || '', ut.status || 'Pendente', ut.priority || 'P2', JSON.stringify(ut)], resolved.url);
      }
    }

    const totalRecords = Object.values(summary).reduce((acc, c) => acc + (typeof c === 'number' ? c : 0), 0);
    return {
      success: true,
      message: `Migração/Seed padrão concluído com sucesso! ${totalRecords} registros inseridos.`,
      details: summary,
      totalRecords
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro no seed de dados: ${err.message}`
    };
  }
}

// Antonio Batista - SEG_002 - Testa a conectividade com o banco Neon
async function testDbConnection(overrideUrl?: string): Promise<{ success: boolean; message: string; tables?: Record<string, number>; diagnostics?: any }> {
  const resolved = getResolvedDbUrl(overrideUrl);

  if (!resolved.url) {
    return {
      success: false,
      message: 'A variável DATABASE_URL (ou POSTGRES_URL da integração Neon) não foi detectada no ambiente. Verifique no painel da Vercel (Project Settings > Environment Variables) se as variáveis do Neon estão vinculadas a este projeto.',
      diagnostics: {
        envDetected: false,
        availableEnvKeys: Object.keys(process.env).filter(k => k.includes('URL') || k.includes('DB') || k.includes('POSTGRES') || k.includes('NEON'))
      }
    };
  }

  try {
    const sql = neon(resolved.url);
    const res = await sql`SELECT NOW() as now, current_database() as db_name, version() as version`;
    
    if (res && res.length > 0) {
      cachedActiveUrl = resolved.url;
      await initSchema(resolved.url).catch(() => {});
      await ensureAutoSeed(resolved.url).catch(() => {});

      const tablesCount: Record<string, number> = {};
      try {
        const counts: any[] = await sql`
          SELECT 
            (SELECT COUNT(*) FROM periods) as periods_count,
            (SELECT COUNT(*) FROM atividades) as atividades_count,
            (SELECT COUNT(*) FROM datas_avisos) as datas_avisos_count,
            (SELECT COUNT(*) FROM usuarios) as usuarios_count,
            (SELECT COUNT(*) FROM planning) as planning_count,
            (SELECT COUNT(*) FROM refinement) as refinement_count
        `;
        if (counts && counts[0]) {
          tablesCount['periods'] = parseInt(counts[0].periods_count || '0', 10);
          tablesCount['atividades'] = parseInt(counts[0].atividades_count || '0', 10);
          tablesCount['datas_avisos'] = parseInt(counts[0].datas_avisos_count || '0', 10);
          tablesCount['usuarios'] = parseInt(counts[0].usuarios_count || '0', 10);
          tablesCount['planning'] = parseInt(counts[0].planning_count || '0', 10);
          tablesCount['refinement'] = parseInt(counts[0].refinement_count || '0', 10);
        }
      } catch (_) {}

      return {
        success: true,
        message: `Conectado ao Neon PostgreSQL com sucesso! Driver: @neondatabase/serverless (HTTP HTTPS/443). Banco: ${res[0]?.db_name || resolved.database}, Horário do Servidor: ${res[0]?.now}`,
        tables: tablesCount,
        diagnostics: {
          driver: '@neondatabase/serverless (HTTPS/443)',
          envDetected: true,
          envSource: resolved.source,
          maskedUrl: resolved.masked,
          host: resolved.host,
          database: res[0]?.db_name || resolved.database,
          user: resolved.user,
          serverTime: res[0]?.now,
          dbVersion: res[0]?.version,
          isPooled: resolved.isPooled
        }
      };
    }
  } catch (neonErr: any) {
    const errMsg = neonErr?.message || String(neonErr);
    const errCode = neonErr?.code || 'UNKNOWN';

    let actionableAdvice = 'Verifique se a string de conexão está correta e se a branch do Neon está ativa.';
    if (errMsg.includes('password authentication failed')) {
      actionableAdvice = 'Falha de autenticação: A senha do usuário no Neon é inválida ou foi rotacionada.';
    } else if (errMsg.includes('database') && errMsg.includes('does not exist')) {
      actionableAdvice = `O banco de dados '${resolved.database}' não existe no Neon.`;
    }

    return {
      success: false,
      message: `Erro ao conectar com Neon PostgreSQL: ${errMsg}`,
      diagnostics: {
        driver: '@neondatabase/serverless (HTTPS/443)',
        envDetected: true,
        envSource: resolved.source,
        maskedUrl: resolved.masked,
        host: resolved.host,
        database: resolved.database,
        user: resolved.user,
        errorCode: errCode,
        errorMessage: errMsg,
        isPooled: resolved.isPooled,
        advice: actionableAdvice
      }
    };
  }

  return {
    success: false,
    message: 'Não foi possível estabelecer conexão com o Neon.'
  };
}

// Antonio Batista - SEG_002 - DAL para Leitura e Escrita
async function getAtividadesFromDb(periodId?: string, overrideUrl?: string): Promise<any[]> {
  try {
    let query = 'SELECT * FROM atividades';
    const params: any[] = [];
    if (periodId) {
      query += ' WHERE period_id = $1 ORDER BY order_index ASC, id ASC';
      params.push(periodId);
    } else {
      query += ' ORDER BY period_id DESC, order_index ASC, id ASC';
    }
    const res = await executeDbQuery(query, params, overrideUrl);
    return res.rows.map((row: any) => ({
      ...(row.raw_data || {}),
      id: row.id,
      periodId: row.period_id,
      name: row.name,
      type: row.type,
      owner: row.owner,
      notes: row.notes,
      jiraOrMovidesk: row.jira_ticket,
      Movidesk: row.movidesk,
      serviceRequest: row.service_request,
      prLink: row.pr_link,
      docLink: row.doc_link,
      componente: row.componente,
      versao: row.versao,
      status: row.status,
      category: row.category,
      startDate: row.start_date,
      endDate: row.end_date,
      description: row.description,
      subtasks: row.subtasks || [],
      tags: row.tags || []
    }));
  } catch (_) {
    return [];
  }
}

async function saveAtividadesToDb(periodId: string, atividades: any[], overrideUrl?: string): Promise<boolean> {
  try {
    const existing = await executeDbQuery('SELECT id FROM atividades WHERE period_id = $1', [periodId], overrideUrl);
    const existingIds = new Set(existing.rows.map((r: any) => r.id));
    const newIds = new Set(atividades.map((a: any) => a.id));

    for (const oldId of existingIds) {
      if (!newIds.has(oldId)) {
        await executeDbQuery('DELETE FROM atividades WHERE id = $1', [oldId], overrideUrl);
      }
    }

    for (let idx = 0; idx < atividades.length; idx++) {
      const item = atividades[idx];
      await executeDbQuery(`
        INSERT INTO atividades (
          id, period_id, name, type, owner, notes, jira_ticket, movidesk, service_request,
          pr_link, doc_link, componente, versao, status, category, start_date, end_date,
          description, order_index, subtasks, tags, raw_data, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW())
        ON CONFLICT (id) DO UPDATE SET
          period_id = EXCLUDED.period_id, name = EXCLUDED.name, type = EXCLUDED.type, owner = EXCLUDED.owner,
          notes = EXCLUDED.notes, jira_ticket = EXCLUDED.jira_ticket, movidesk = EXCLUDED.movidesk,
          service_request = EXCLUDED.service_request, pr_link = EXCLUDED.pr_link, doc_link = EXCLUDED.doc_link,
          componente = EXCLUDED.componente, versao = EXCLUDED.versao, status = EXCLUDED.status,
          category = EXCLUDED.category, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date,
          description = EXCLUDED.description, order_index = EXCLUDED.order_index, subtasks = EXCLUDED.subtasks,
          tags = EXCLUDED.tags, raw_data = EXCLUDED.raw_data, updated_at = NOW()
      `, [
        item.id, periodId, item.name || 'Sem título', item.type || '', item.owner || '', item.notes || '',
        item.jiraOrMovidesk || item.jiraTicket || item.jira_ticket || '', item.Movidesk || item.movidesk || '',
        item.serviceRequest || '', item.prLink || '', item.docLink || '', item.componente || '', item.versao || '',
        item.status || 'Backlog', item.category || '', item.startDate || '', item.endDate || '',
        item.description || '', idx, JSON.stringify(item.subtasks || []), JSON.stringify(item.tags || []), JSON.stringify(item)
      ], overrideUrl);
    }
    return true;
  } catch (err) {
    console.error('Erro ao salvar atividades no Neon:', err);
    return false;
  }
}

async function getDatasAvisosFromDb(overrideUrl?: string): Promise<{ feriasDayOffs: any[]; ausenciasTemporarias: any[]; deploys: any[] }> {
  try {
    const res = await executeDbQuery('SELECT * FROM datas_avisos ORDER BY updated_at DESC', [], overrideUrl);
    const feriasDayOffs: any[] = [];
    const ausenciasTemporarias: any[] = [];
    const deploys: any[] = [];

    for (const row of res.rows) {
      const raw = row.raw_data || {};
      if (row.tipo === 'ferias_day_off') {
        feriasDayOffs.push({
          ...raw,
          id: row.id,
          colaborador: row.colaborador || raw.colaborador,
          tipo: row.subtipo || raw.tipo || 'Férias',
          dataInicio: row.data_inicio || raw.dataInicio,
          dataFim: row.data_fim || raw.dataFim,
          status: row.status || raw.status || 'Previsto',
          observacao: row.observacao || raw.observacao || ''
        });
      } else if (row.tipo === 'ausencia_temporaria') {
        ausenciasTemporarias.push({
          ...raw,
          id: row.id,
          colaborador: row.colaborador || raw.colaborador,
          data: row.data || raw.data,
          horaInicio: row.hora_inicio || raw.horaInicio,
          horaFim: row.hora_fim || raw.horaFim,
          motivo: row.motivo || raw.motivo || ''
        });
      } else if (row.tipo === 'deploy') {
        deploys.push({
          ...raw,
          id: row.id,
          data: row.data || raw.data,
          versao: row.versao || raw.versao,
          componente: row.componente || raw.componente,
          link: row.link || raw.link,
          relatedTasks: row.related_tasks || raw.relatedTasks || []
        });
      }
    }
    return { feriasDayOffs, ausenciasTemporarias, deploys };
  } catch (_) {
    return { feriasDayOffs: [], ausenciasTemporarias: [], deploys: [] };
  }
}

async function saveDatasAvisosToDb(payload: { feriasDayOffs?: any[]; ausenciasTemporarias?: any[]; deploys?: any[] }, overrideUrl?: string): Promise<boolean> {
  try {
    if (payload.feriasDayOffs) {
      const existing = await executeDbQuery("SELECT id FROM datas_avisos WHERE tipo = 'ferias_day_off'", [], overrideUrl);
      const existingIds = new Set(existing.rows.map((r: any) => r.id));
      const newIds = new Set(payload.feriasDayOffs.map((f: any) => f.id));

      for (const oldId of existingIds) {
        if (!newIds.has(oldId)) {
          await executeDbQuery('DELETE FROM datas_avisos WHERE id = $1', [oldId], overrideUrl);
        }
      }

      for (const f of payload.feriasDayOffs) {
        await executeDbQuery(`
          INSERT INTO datas_avisos (id, tipo, colaborador, subtipo, data_inicio, data_fim, status, observacao, raw_data, updated_at)
          VALUES ($1, 'ferias_day_off', $2, $3, $4, $5, $6, $7, $8, NOW())
          ON CONFLICT (id) DO UPDATE SET
            colaborador = EXCLUDED.colaborador, subtipo = EXCLUDED.subtipo, data_inicio = EXCLUDED.data_inicio,
            data_fim = EXCLUDED.data_fim, status = EXCLUDED.status, observacao = EXCLUDED.observacao,
            raw_data = EXCLUDED.raw_data, updated_at = NOW()
        `, [f.id, f.colaborador || '', f.tipo || 'Férias', f.dataInicio || '', f.dataFim || '', f.status || 'Previsto', f.observacao || '', JSON.stringify(f)], overrideUrl);
      }
    }

    if (payload.ausenciasTemporarias) {
      const existing = await executeDbQuery("SELECT id FROM datas_avisos WHERE tipo = 'ausencia_temporaria'", [], overrideUrl);
      const existingIds = new Set(existing.rows.map((r: any) => r.id));
      const newIds = new Set(payload.ausenciasTemporarias.map((a: any) => a.id));

      for (const oldId of existingIds) {
        if (!newIds.has(oldId)) {
          await executeDbQuery('DELETE FROM datas_avisos WHERE id = $1', [oldId], overrideUrl);
        }
      }

      for (const a of payload.ausenciasTemporarias) {
        await executeDbQuery(`
          INSERT INTO datas_avisos (id, tipo, colaborador, data, hora_inicio, hora_fim, motivo, raw_data, updated_at)
          VALUES ($1, 'ausencia_temporaria', $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (id) DO UPDATE SET
            colaborador = EXCLUDED.colaborador, data = EXCLUDED.data, hora_inicio = EXCLUDED.hora_inicio,
            hora_fim = EXCLUDED.hora_fim, motivo = EXCLUDED.motivo, raw_data = EXCLUDED.raw_data, updated_at = NOW()
        `, [a.id, a.colaborador || '', a.data || '', a.horaInicio || '', a.horaFim || '', a.motivo || '', JSON.stringify(a)], overrideUrl);
      }
    }

    if (payload.deploys) {
      const existing = await executeDbQuery("SELECT id FROM datas_avisos WHERE tipo = 'deploy'", [], overrideUrl);
      const existingIds = new Set(existing.rows.map((r: any) => r.id));
      const newIds = new Set(payload.deploys.map((d: any) => d.id));

      for (const oldId of existingIds) {
        if (!newIds.has(oldId)) {
          await executeDbQuery('DELETE FROM datas_avisos WHERE id = $1', [oldId], overrideUrl);
        }
      }

      for (const d of payload.deploys) {
        await executeDbQuery(`
          INSERT INTO datas_avisos (id, tipo, data, versao, componente, link, related_tasks, raw_data, updated_at)
          VALUES ($1, 'deploy', $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (id) DO UPDATE SET
            data = EXCLUDED.data, versao = EXCLUDED.versao, componente = EXCLUDED.componente,
            link = EXCLUDED.link, related_tasks = EXCLUDED.related_tasks, raw_data = EXCLUDED.raw_data, updated_at = NOW()
        `, [d.id, d.data || '', d.versao || '', d.componente || '', d.link || '', JSON.stringify(d.relatedTasks || []), JSON.stringify(d)], overrideUrl);
      }
    }

    return true;
  } catch (err) {
    console.error('Erro ao salvar datas_avisos no Neon:', err);
    return false;
  }
}

async function getPeriodsFromDb(overrideUrl?: string): Promise<any[]> {
  try {
    const res = await executeDbQuery('SELECT * FROM periods ORDER BY id DESC', [], overrideUrl);
    return res.rows.map((r: any) => ({
      ...(r.raw_data || {}),
      id: r.id,
      label: r.label,
      startDate: r.start_date,
      endDate: r.end_date,
      isActive: r.is_active,
      isLocked: r.is_locked
    }));
  } catch (_) {
    return [];
  }
}

async function savePeriodsToDb(periods: any[], overrideUrl?: string): Promise<boolean> {
  try {
    const existing = await executeDbQuery('SELECT id FROM periods', [], overrideUrl);
    const existingIds = new Set(existing.rows.map((r: any) => r.id));
    const newIds = new Set(periods.map((p: any) => p.id));

    for (const oldId of existingIds) {
      if (!newIds.has(oldId)) {
        await executeDbQuery('DELETE FROM periods WHERE id = $1', [oldId], overrideUrl);
      }
    }

    for (const p of periods) {
      await executeDbQuery(`
        INSERT INTO periods (id, label, start_date, end_date, is_active, is_locked, raw_data, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, is_active = EXCLUDED.is_active, is_locked = EXCLUDED.is_locked, raw_data = EXCLUDED.raw_data, updated_at = NOW()
      `, [p.id, p.label, p.startDate || null, p.endDate || null, p.isActive !== false, !!p.isLocked, JSON.stringify(p)], overrideUrl);
    }
    return true;
  } catch (e) {
    return false;
  }
}

async function getUsuariosFromDb(overrideUrl?: string): Promise<any[]> {
  try {
    const res = await executeDbQuery('SELECT * FROM usuarios ORDER BY name ASC', [], overrideUrl);
    return res.rows.map((r: any) => ({
      ...(r.raw_data || {}),
      id: r.id,
      name: r.name,
      email: r.email,
      username: r.username,
      password: r.password,
      role: r.role,
      avatar: r.avatar,
      preferences: r.preferences || {}
    }));
  } catch (_) {
    return [];
  }
}

async function saveUsuariosToDb(usuarios: any[], overrideUrl?: string): Promise<boolean> {
  try {
    const existing = await executeDbQuery('SELECT id FROM usuarios', [], overrideUrl);
    const existingIds = new Set(existing.rows.map((r: any) => r.id));
    const newIds = new Set(usuarios.map((u: any) => u.id || u.username || u.email));

    for (const oldId of existingIds) {
      if (!newIds.has(oldId)) {
        await executeDbQuery('DELETE FROM usuarios WHERE id = $1', [oldId], overrideUrl);
      }
    }

    for (const u of usuarios) {
      const userId = u.id || u.username || u.email || `user_${Math.random().toString(36).substring(2, 9)}`;
      const usernameVal = u.username || u.email?.split('@')[0] || u.name?.toLowerCase().replace(/\s+/g, '') || userId;
      await executeDbQuery(`
        INSERT INTO usuarios (id, name, email, username, password, role, avatar, preferences, raw_data, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, username = EXCLUDED.username, password = EXCLUDED.password, role = EXCLUDED.role, avatar = EXCLUDED.avatar, preferences = EXCLUDED.preferences, raw_data = EXCLUDED.raw_data, updated_at = NOW()
      `, [userId, u.name || 'Sem Nome', u.email || '', usernameVal, u.password || '', u.role || 'Analista', u.avatar || '', JSON.stringify(u.preferences || {}), JSON.stringify({ ...u, id: userId, username: usernameVal })], overrideUrl);
    }
    return true;
  } catch (e) {
    return false;
  }
}

async function getGenericFromDb(tableName: string, overrideUrl?: string): Promise<any | null> {
  try {
    if (tableName === 'parameters' || tableName === 'versionamento') {
      const res = await executeDbQuery(`SELECT data FROM ${tableName} LIMIT 1`, [], overrideUrl);
      return res.rows[0]?.data || null;
    }
    if (tableName === 'roles_permissions') {
      const res = await executeDbQuery('SELECT roles FROM roles_permissions LIMIT 1', [], overrideUrl);
      return res.rows[0]?.roles || null;
    }
    if (tableName === 'github_config') {
      const res = await executeDbQuery('SELECT config FROM github_config LIMIT 1', [], overrideUrl);
      return res.rows[0]?.config || null;
    }
    if (tableName === 'lock_status') {
      const res = await executeDbQuery('SELECT * FROM lock_status LIMIT 1', [], overrideUrl);
      if (res.rows[0]) {
        const r = res.rows[0];
        return { locked: r.locked, lockedBy: r.locked_by, lockedAt: r.locked_at, expiresAt: r.expires_at };
      }
      return null;
    }
    if (tableName === 'planning' || tableName === 'refinement') {
      const res = await executeDbQuery(`SELECT * FROM ${tableName} ORDER BY id ASC`, [], overrideUrl);
      return res.rows.map((r: any) => ({
        ...(r.raw_data || {}),
        id: r.id,
        periodId: r.period_id,
        atividade: r.atividade,
        responsavel: r.responsavel,
        estado: r.estado,
        versao: r.versao,
        componente: r.componente,
        storyPoint: r.story_point,
        jiraTicket: r.jira_ticket,
        descricao: r.descricao
      }));
    }
    if (tableName === 'timer_presets') {
      const res = await executeDbQuery('SELECT * FROM timer_presets ORDER BY duration_minutes ASC', [], overrideUrl);
      return res.rows.map((r: any) => ({
        ...(r.raw_data || {}),
        id: r.id,
        name: r.name,
        durationMinutes: r.duration_minutes,
        category: r.category,
        description: r.description,
        soundAlert: r.sound_alert,
        color: r.color
      }));
    }
    if (tableName === 'user_tasks') {
      const res = await executeDbQuery('SELECT * FROM user_tasks ORDER BY updated_at DESC', [], overrideUrl);
      return res.rows.map((r: any) => ({
        ...(r.raw_data || {}),
        id: r.id,
        ownerUsername: r.owner_username,
        title: r.title,
        description: r.description,
        status: r.status,
        priority: r.priority
      }));
    }
    return null;
  } catch (_) {
    return null;
  }
}

async function saveGenericToDb(tableName: string, data: any, overrideUrl?: string): Promise<boolean> {
  try {
    if (tableName === 'parameters' || tableName === 'versionamento') {
      await executeDbQuery(`
        INSERT INTO ${tableName} (id, data, updated_at)
        VALUES ('global', $1, NOW())
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `, [JSON.stringify(data)], overrideUrl);
      return true;
    }
    if (tableName === 'roles_permissions') {
      await executeDbQuery(`
        INSERT INTO roles_permissions (id, roles, updated_at)
        VALUES ('default', $1, NOW())
        ON CONFLICT (id) DO UPDATE SET roles = EXCLUDED.roles, updated_at = NOW()
      `, [JSON.stringify(data)], overrideUrl);
      return true;
    }
    if (tableName === 'github_config') {
      await executeDbQuery(`
        INSERT INTO github_config (id, config, updated_at)
        VALUES ('current', $1, NOW())
        ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()
      `, [JSON.stringify(data)], overrideUrl);
      return true;
    }
    if (tableName === 'lock_status') {
      await executeDbQuery(`
        INSERT INTO lock_status (id, locked, locked_by, locked_at, expires_at, updated_at)
        VALUES ('current', $1, $2, $3, $4, NOW())
        ON CONFLICT (id) DO UPDATE SET
          locked = EXCLUDED.locked, locked_by = EXCLUDED.locked_by,
          locked_at = EXCLUDED.locked_at, expires_at = EXCLUDED.expires_at, updated_at = NOW()
      `, [!!data.locked, data.lockedBy || null, data.lockedAt || null, data.expiresAt || null], overrideUrl);
      return true;
    }
    if ((tableName === 'planning' || tableName === 'refinement') && Array.isArray(data)) {
      const existing = await executeDbQuery(`SELECT id FROM ${tableName}`, [], overrideUrl);
      const existingIds = new Set(existing.rows.map((r: any) => r.id));
      const newIds = new Set(data.map((d: any) => d.id));

      for (const oldId of existingIds) {
        if (!newIds.has(oldId)) {
          await executeDbQuery(`DELETE FROM ${tableName} WHERE id = $1`, [oldId], overrideUrl);
        }
      }

      for (const item of data) {
        await executeDbQuery(`
          INSERT INTO ${tableName} (id, period_id, atividade, responsavel, estado, versao, componente, story_point, jira_ticket, descricao, raw_data, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
          ON CONFLICT (id) DO UPDATE SET
            period_id = EXCLUDED.period_id, atividade = EXCLUDED.atividade, responsavel = EXCLUDED.responsavel,
            estado = EXCLUDED.estado, versao = EXCLUDED.versao, componente = EXCLUDED.componente,
            story_point = EXCLUDED.story_point, jira_ticket = EXCLUDED.jira_ticket, descricao = EXCLUDED.descricao,
            raw_data = EXCLUDED.raw_data, updated_at = NOW()
        `, [
          item.id, item.periodId || '', item.atividade || '', item.responsavel || '', item.estado || '',
          item.versao || '', item.componente || '', String(item.storyPoint || ''), item.jiraTicket || '',
          item.descricao || '', JSON.stringify(item)
        ], overrideUrl);
      }
      return true;
    }
    if (tableName === 'timer_presets' && Array.isArray(data)) {
      const existing = await executeDbQuery('SELECT id FROM timer_presets', [], overrideUrl);
      const existingIds = new Set(existing.rows.map((r: any) => r.id));
      const newIds = new Set(data.map((d: any) => d.id));

      for (const oldId of existingIds) {
        if (!newIds.has(oldId)) {
          await executeDbQuery('DELETE FROM timer_presets WHERE id = $1', [oldId], overrideUrl);
        }
      }

      for (const tp of data) {
        await executeDbQuery(`
          INSERT INTO timer_presets (id, name, duration_minutes, category, description, sound_alert, color, raw_data, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name, duration_minutes = EXCLUDED.duration_minutes, category = EXCLUDED.category,
            description = EXCLUDED.description, sound_alert = EXCLUDED.sound_alert, color = EXCLUDED.color,
            raw_data = EXCLUDED.raw_data, updated_at = NOW()
        `, [tp.id, tp.name, tp.durationMinutes || 15, tp.category || '', tp.description || '', tp.soundAlert !== false, tp.color || '', JSON.stringify(tp)], overrideUrl);
      }
      return true;
    }
    if (tableName === 'user_tasks' && Array.isArray(data)) {
      const existing = await executeDbQuery('SELECT id FROM user_tasks', [], overrideUrl);
      const existingIds = new Set(existing.rows.map((r: any) => r.id));
      const newIds = new Set(data.map((d: any) => d.id));

      for (const oldId of existingIds) {
        if (!newIds.has(oldId)) {
          await executeDbQuery('DELETE FROM user_tasks WHERE id = $1', [oldId], overrideUrl);
        }
      }

      for (const ut of data) {
        await executeDbQuery(`
          INSERT INTO user_tasks (id, owner_username, title, description, status, priority, raw_data, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (id) DO UPDATE SET
            owner_username = EXCLUDED.owner_username, title = EXCLUDED.title, description = EXCLUDED.description,
            status = EXCLUDED.status, priority = EXCLUDED.priority, raw_data = EXCLUDED.raw_data, updated_at = NOW()
        `, [ut.id, ut.ownerUsername || 'admin', ut.title || 'Sem título', ut.description || '', ut.status || 'Pendente', ut.priority || 'P2', JSON.stringify(ut)], overrideUrl);
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error(`Erro ao salvar na tabela ${tableName}:`, err);
    return false;
  }
}

// Retorna o cabeçalho de autenticação GitHub
function getAuthHeader(token: string): string {
  const trimmed = token ? token.trim() : "";
  if (trimmed.startsWith('github_pat_')) {
    return `Bearer ${trimmed}`;
  }
  return `token ${trimmed}`;
}

// Parser universal de corpo para Vercel Serverless
async function parseRequestBody(req: any): Promise<any> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch { return req.body; }
    }
    return req.body;
  }

  if (typeof req.on === 'function' && req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      const chunks: any[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const raw = Buffer.concat(chunks).toString('utf-8');
      if (!raw) return {};
      try { return JSON.parse(raw); } catch { return raw; }
    } catch {
      return {};
    }
  }
  return {};
}

// Handler Principal Vercel Serverless (100% Autocontido)
export default async function handler(req: any, res: any) {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-neon-connection-string, x-neon-url');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    req.body = await parseRequestBody(req);

    // Normalização do caminho da URL
    const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;
    const pathParam = req.query?.path;
    let normalizedPath = '';

    if (Array.isArray(pathParam)) {
      normalizedPath = pathParam.join('/');
    } else if (typeof pathParam === 'string' && pathParam.trim()) {
      normalizedPath = pathParam.trim();
    } else {
      normalizedPath = pathname.replace(/^\/api\/?/, '').replace(/^\//, '');
    }

    const headerDbOverride = (req.headers['x-neon-connection-string'] || req.headers['x-neon-url']) as string | undefined;

    const sendJson = (statusCode: number, data: any) => {
      res.setHeader('Content-Type', 'application/json');
      return res.status(statusCode).send(JSON.stringify(data));
    };

    // 1. Healthcheck
    if (normalizedPath === 'health' || normalizedPath === '') {
      return sendJson(200, {
        status: "ok",
        platform: "Vercel Serverless (Self-Contained)",
        timestamp: new Date().toISOString()
      });
    }

    // 2. Status e Teste Neon DB (/api/db/status e /api/db/test)
    if (normalizedPath === 'db/status' || normalizedPath === 'db/test') {
      let overrideUrl: string | undefined = headerDbOverride;
      if (!overrideUrl && req.body && typeof req.body === 'object' && req.body.connectionString) {
        overrideUrl = req.body.connectionString;
      } else if (!overrideUrl && typeof req.body === 'string' && (req.body.startsWith('postgres') || req.body.startsWith('psql'))) {
        overrideUrl = req.body;
      } else if (!overrideUrl && req.query && req.query.connectionString) {
        overrideUrl = String(req.query.connectionString);
      }
      const statusResult = await testDbConnection(overrideUrl);
      return sendJson(200, statusResult);
    }

    // 3. Migração Neon DB (/api/db/migrate)
    if (normalizedPath === 'db/migrate' && req.method === 'POST') {
      const migrateResult = await seedDatabaseWithDefaults(headerDbOverride);
      return sendJson(200, migrateResult);
    }

    const dbConfig = getResolvedDbUrl(headerDbOverride);
    const isDbConfigured = !!dbConfig.url;

    // 4. Listagem de Arquivos (/api/files)
    if (normalizedPath === 'files' && req.method === 'GET') {
      if (isDbConfigured) {
        try {
          const periods = await getPeriodsFromDb(headerDbOverride);
          const fileNames = [
            'periods.json',
            'datas_avisos.json',
            'planning.json',
            'refinement.json',
            'parameters.json',
            'roles_permissions.json',
            'timer_presets.json',
            'user_tasks.json',
            'versionamento.json',
            'lock_status.json',
            'usuarios.json'
          ];
          const periodList = periods && periods.length > 0 ? periods : defaultPeriods;
          periodList.forEach((p: any) => fileNames.push(`atividades_${p.id}.json`));
          return sendJson(200, fileNames);
        } catch (_) {}
      }
      return sendJson(200, [
        'atividades_072026.json',
        'atividades_082026.json',
        'datas_avisos.json',
        'periods.json',
        'usuarios.json',
        'roles_permissions.json',
        'parameters.json',
        'timer_presets.json',
        'user_tasks.json',
        'versionamento.json',
        'lock_status.json',
        'refinement.json',
        'planning.json',
        'github_config.json'
      ]);
    }

    // 5. Rotas de Arquivos Individuais (/api/files/:filename)
    if (normalizedPath.startsWith('files/')) {
      const filename = normalizedPath.replace(/^files\//, '').trim();
      if (!filename || filename.includes('..') || filename.includes('/')) {
        return sendJson(400, { error: "Nome de arquivo inválido" });
      }

      // GET /api/files/:filename
      if (req.method === 'GET') {
        if (isDbConfigured) {
          try {
            await initSchema(headerDbOverride);
            await ensureAutoSeed(headerDbOverride);

            if (filename.startsWith('atividades_') && filename.endsWith('.json')) {
              const periodId = filename.replace('atividades_', '').replace('.json', '');
              const items = await getAtividadesFromDb(periodId, headerDbOverride);
              if (items && items.length > 0) {
                return sendJson(200, items);
              } else if (periodId === '072026') {
                return sendJson(200, defaultAtividades072026);
              } else {
                return sendJson(200, []);
              }
            } else if (filename === 'datas_avisos.json') {
              const items = await getDatasAvisosFromDb(headerDbOverride);
              if (items && (items.feriasDayOffs?.length || items.ausenciasTemporarias?.length || items.deploys?.length)) {
                return sendJson(200, items);
              }
              return sendJson(200, defaultDatasAvisos);
            } else if (filename === 'periods.json') {
              const items = await getPeriodsFromDb(headerDbOverride);
              if (items && items.length > 0) return sendJson(200, items);
              return sendJson(200, defaultPeriods);
            } else if (filename === 'usuarios.json') {
              const items = await getUsuariosFromDb(headerDbOverride);
              if (items && items.length > 0) return sendJson(200, items);
              return sendJson(200, defaultUsuarios);
            } else if (filename === 'planning.json') {
              const items = await getGenericFromDb('planning', headerDbOverride);
              if (items && Array.isArray(items) && items.length > 0) return sendJson(200, items);
              return sendJson(200, defaultPlanning);
            } else if (filename === 'refinement.json') {
              const items = await getGenericFromDb('refinement', headerDbOverride);
              if (items && Array.isArray(items) && items.length > 0) return sendJson(200, items);
              return sendJson(200, defaultRefinement);
            } else if (filename === 'parameters.json') {
              const items = await getGenericFromDb('parameters', headerDbOverride);
              return sendJson(200, items || defaultParameters);
            } else if (filename === 'roles_permissions.json') {
              const items = await getGenericFromDb('roles_permissions', headerDbOverride);
              return sendJson(200, items || defaultRolesPermissions);
            } else if (filename === 'timer_presets.json') {
              const items = await getGenericFromDb('timer_presets', headerDbOverride);
              return sendJson(200, items || defaultTimerPresets);
            } else if (filename === 'user_tasks.json') {
              const items = await getGenericFromDb('user_tasks', headerDbOverride);
              return sendJson(200, items || defaultUserTasks);
            } else if (filename === 'versionamento.json') {
              const items = await getGenericFromDb('versionamento', headerDbOverride);
              return sendJson(200, items || defaultVersionamento);
            } else if (filename === 'lock_status.json') {
              const items = await getGenericFromDb('lock_status', headerDbOverride);
              return sendJson(200, items || defaultLockStatus);
            } else if (filename === 'github_config.json') {
              const items = await getGenericFromDb('github_config', headerDbOverride);
              return sendJson(200, items || defaultGitHubConfig);
            }
          } catch (dbErr) {
            console.warn(`[Vercel Serverless /api/files/${filename}] Leitura Neon:`, dbErr);
          }
        }

        // Fallback para defaults estáticos
        if (filename === 'periods.json') return sendJson(200, defaultPeriods);
        if (filename === 'atividades_072026.json') return sendJson(200, defaultAtividades072026);
        if (filename.startsWith('atividades_')) return sendJson(200, []);
        if (filename === 'datas_avisos.json') return sendJson(200, defaultDatasAvisos);
        if (filename === 'usuarios.json') return sendJson(200, defaultUsuarios);
        if (filename === 'roles_permissions.json') return sendJson(200, defaultRolesPermissions);
        if (filename === 'parameters.json') return sendJson(200, defaultParameters);
        if (filename === 'planning.json') return sendJson(200, defaultPlanning);
        if (filename === 'refinement.json') return sendJson(200, defaultRefinement);
        if (filename === 'timer_presets.json') return sendJson(200, defaultTimerPresets);
        if (filename === 'user_tasks.json') return sendJson(200, defaultUserTasks);
        if (filename === 'versionamento.json') return sendJson(200, defaultVersionamento);
        if (filename === 'lock_status.json') return sendJson(200, defaultLockStatus);
        if (filename === 'github_config.json') return sendJson(200, defaultGitHubConfig);

        return sendJson(404, { error: `Arquivo ${filename} não encontrado` });
      }

      // POST /api/files/:filename
      if (req.method === 'POST') {
        let contentToSave = req.body?.content !== undefined ? req.body.content : req.body;
        if (typeof contentToSave === 'string') {
          try { contentToSave = JSON.parse(contentToSave); } catch (_) {}
        }

        let savedToDb = false;
        if (isDbConfigured) {
          try {
            await initSchema(headerDbOverride);
            if (filename.startsWith('atividades_') && filename.endsWith('.json') && Array.isArray(contentToSave)) {
              const periodId = filename.replace('atividades_', '').replace('.json', '');
              savedToDb = await saveAtividadesToDb(periodId, contentToSave, headerDbOverride);
            } else if (filename === 'datas_avisos.json') {
              savedToDb = await saveDatasAvisosToDb(contentToSave as any, headerDbOverride);
            } else if (filename === 'periods.json' && Array.isArray(contentToSave)) {
              savedToDb = await savePeriodsToDb(contentToSave, headerDbOverride);
            } else if (filename === 'usuarios.json' && Array.isArray(contentToSave)) {
              savedToDb = await saveUsuariosToDb(contentToSave, headerDbOverride);
            } else {
              const docName = filename.replace(/\.json$/, '');
              savedToDb = await saveGenericToDb(docName, contentToSave, headerDbOverride);
            }
          } catch (dbErr) {
            console.warn(`[Vercel Serverless /api/files/${filename}] Gravação Neon:`, dbErr);
          }
        }

        return sendJson(200, {
          success: true,
          message: `Arquivo ${filename} gravado com sucesso`,
          savedToNeon: savedToDb
        });
      }
    }

    // 6. Rota de sincronização completa (/api/sync)
    if (normalizedPath === 'sync' && req.method === 'GET') {
      if (isDbConfigured) {
        try {
          await initSchema(headerDbOverride);
          await ensureAutoSeed(headerDbOverride);

          const result: Record<string, string> = {};
          
          // 1. Periods
          const periods = await getPeriodsFromDb(headerDbOverride);
          const periodList = periods && periods.length > 0 ? periods : defaultPeriods;
          result['periods.json'] = JSON.stringify(periodList, null, 2);

          // 2. Atividades do board agrupadas por period_id
          const allAtividades = await getAtividadesFromDb(undefined, headerDbOverride);
          const groupedAtividades: Record<string, any[]> = {};
          for (const atv of allAtividades) {
            const pId = atv.periodId || '072026';
            if (!groupedAtividades[pId]) groupedAtividades[pId] = [];
            groupedAtividades[pId].push(atv);
          }
          for (const p of periodList) {
            const atvs = groupedAtividades[p.id] || (p.id === '072026' ? defaultAtividades072026 : []);
            result[`atividades_${p.id}.json`] = JSON.stringify(atvs, null, 2);
          }
          for (const [pId, atvs] of Object.entries(groupedAtividades)) {
            if (!result[`atividades_${pId}.json`]) {
              result[`atividades_${pId}.json`] = JSON.stringify(atvs, null, 2);
            }
          }

          // 3. Datas e Avisos
          const datas = await getDatasAvisosFromDb(headerDbOverride);
          result['datas_avisos.json'] = JSON.stringify(
            datas && (datas.feriasDayOffs?.length || datas.ausenciasTemporarias?.length || datas.deploys?.length)
              ? datas
              : defaultDatasAvisos,
            null, 2
          );

          // 4. Planning & Refinement
          const planning = await getGenericFromDb('planning', headerDbOverride);
          result['planning.json'] = JSON.stringify(
            planning && Array.isArray(planning) && planning.length > 0 ? planning : defaultPlanning,
            null, 2
          );

          const refinement = await getGenericFromDb('refinement', headerDbOverride);
          result['refinement.json'] = JSON.stringify(
            refinement && Array.isArray(refinement) && refinement.length > 0 ? refinement : defaultRefinement,
            null, 2
          );

          // 5. Parâmetros
          const parameters = await getGenericFromDb('parameters', headerDbOverride);
          result['parameters.json'] = JSON.stringify(parameters || defaultParameters, null, 2);

          // 6. Roles & Permissions
          const roles = await getGenericFromDb('roles_permissions', headerDbOverride);
          result['roles_permissions.json'] = JSON.stringify(roles || defaultRolesPermissions, null, 2);

          // 7. Presets de Cronômetro
          const timerPresets = await getGenericFromDb('timer_presets', headerDbOverride);
          result['timer_presets.json'] = JSON.stringify(timerPresets || defaultTimerPresets, null, 2);

          // 8. Tarefas de Usuário
          const userTasks = await getGenericFromDb('user_tasks', headerDbOverride);
          result['user_tasks.json'] = JSON.stringify(userTasks || defaultUserTasks, null, 2);

          // 9. Versionamento
          const versionamento = await getGenericFromDb('versionamento', headerDbOverride);
          result['versionamento.json'] = JSON.stringify(versionamento || defaultVersionamento, null, 2);

          // 10. Lock Status
          const lockStatus = await getGenericFromDb('lock_status', headerDbOverride);
          result['lock_status.json'] = JSON.stringify(lockStatus || defaultLockStatus, null, 2);

          // 11. Usuários
          const usuarios = await getUsuariosFromDb(headerDbOverride);
          result['usuarios.json'] = JSON.stringify(
            usuarios && usuarios.length > 0 ? usuarios : defaultUsuarios,
            null, 2
          );

          return sendJson(200, result);
        } catch (dbSyncErr) {
          console.warn('[Vercel Serverless /api/sync] Leitura Neon:', dbSyncErr);
        }
      }

      // Fallback sem banco: retorna todos os defaults estáticos stringificados
      const defaultSnapshot: Record<string, string> = {
        'periods.json': JSON.stringify(defaultPeriods, null, 2),
        'atividades_072026.json': JSON.stringify(defaultAtividades072026, null, 2),
        'datas_avisos.json': JSON.stringify(defaultDatasAvisos, null, 2),
        'usuarios.json': JSON.stringify(defaultUsuarios, null, 2),
        'roles_permissions.json': JSON.stringify(defaultRolesPermissions, null, 2),
        'parameters.json': JSON.stringify(defaultParameters, null, 2),
        'planning.json': JSON.stringify(defaultPlanning, null, 2),
        'refinement.json': JSON.stringify(defaultRefinement, null, 2),
        'timer_presets.json': JSON.stringify(defaultTimerPresets, null, 2),
        'user_tasks.json': JSON.stringify(defaultUserTasks, null, 2),
        'versionamento.json': JSON.stringify(defaultVersionamento, null, 2),
        'lock_status.json': JSON.stringify(defaultLockStatus, null, 2),
      };
      return sendJson(200, defaultSnapshot);
    }

    // 7. Status do GitHub (/api/github/config/status)
    if (normalizedPath === 'github/config/status' && req.method === 'GET') {
      try {
        let ghConfig: any = null;
        if (isDbConfigured) {
          ghConfig = await getGenericFromDb('github_config', headerDbOverride);
        }
        if (!ghConfig) {
          ghConfig = defaultGitHubConfig;
        }
        const token = process.env.GITHUB_TOKEN || ghConfig?.token || '';
        const maskedToken = token ? `${token.substring(0, 4)}...${token.substring(token.length - 4)}` : '';
        return sendJson(200, {
          configured: !!token,
          enabled: ghConfig?.enabled !== false,
          owner: ghConfig?.owner || '',
          repo: ghConfig?.repo || '',
          branch: ghConfig?.branch || 'main',
          hasToken: !!token,
          maskedToken
        });
      } catch (err: any) {
        return sendJson(500, { error: err.message });
      }
    }

    // 8. Teste do GitHub (/api/github/test)
    if (normalizedPath === 'github/test' && req.method === 'POST') {
      try {
        const { token: reqToken, owner, repo } = req.body || {};
        let token = reqToken || process.env.GITHUB_TOKEN;
        if (!token) {
          token = defaultGitHubConfig?.token;
        }
        if (!token || !owner || !repo) {
          return sendJson(400, { error: "Token, Dono e Repositório são obrigatórios para o teste." });
        }
        const url = `https://api.github.com/repos/${owner}/${repo}`;
        const ghRes = await fetch(url, {
          headers: {
            'Authorization': getAuthHeader(token),
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'Doc24-Board-Team-BR-Server'
          }
        });
        if (ghRes.ok) {
          return sendJson(200, { success: true, message: "Conexão com o GitHub efetuada com sucesso!" });
        }
        const errText = await ghRes.text();
        return sendJson(ghRes.status, { error: `Erro ${ghRes.status} retornado pelo GitHub: ${errText}` });
      } catch (err: any) {
        return sendJson(500, { error: err.message });
      }
    }

    // 9. Fallback amigável
    return sendJson(200, {
      message: `Rota /api/${normalizedPath} processada com sucesso no ambiente Serverless.`,
      path: normalizedPath,
      method: req.method
    });
  } catch (err: any) {
    console.error("[Vercel Serverless] Erro fatal:", err);
    return res.status(500).json({
      error: "Erro interno no servidor Serverless",
      message: err.message || String(err)
    });
  }
}
