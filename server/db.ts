import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

// Configure WebSocket constructor for Neon serverless in Node.js / Vercel Serverless environment
if (typeof neonConfig !== 'undefined') {
  try {
    neonConfig.webSocketConstructor = ws;
    neonConfig.useSecureWebSocket = true;
  } catch (_) {}
}

const PgPool: any = (pg as any)?.Pool || (pg as any)?.default?.Pool || (pg as any);

let pool: any = null;
let isInitialized = false;
let isMigrated = false;

// Antonio Batista - SEG_002 - Normaliza e higieniza a string de conexão para compatibilidade total com Neon
export function normalizeDbUrl(raw: string): string {
  let url = (raw || '').trim();
  if (url.startsWith('postgres://')) {
    url = url.replace('postgres://', 'postgresql://');
  }
  if (!url.includes('sslmode=') && !url.includes('ssl=false')) {
    url += (url.includes('?') ? '&' : '?') + 'sslmode=require';
  }
  return url;
}

// Antonio Batista - SEG_002 - Cria uma nova instância de Pool otimizada para Neon Serverless e Vercel
export function createPoolInstance(connectionString: string, maxConnections: number = 4): any {
  const cleanUrl = normalizeDbUrl(connectionString);
  try {
    const isNeonHost = cleanUrl.includes('neon.tech');
    if (isNeonHost || typeof NeonPool === 'function') {
      const p = new NeonPool({
        connectionString: cleanUrl,
        max: maxConnections,
        connectionTimeoutMillis: 8000,
        idleTimeoutMillis: 20000,
      });
      if (typeof p.on === 'function') {
        p.on('error', (err: any) => {
          console.warn('[Neon Serverless Pool] Aviso em conexão ociosa:', err?.message || err);
        });
      }
      return p;
    }
  } catch (err: any) {
    console.warn('[Neon DB] Fallback para pg.Pool:', err?.message || err);
  }

  // Fallback para pg standard
  try {
    const p = new PgPool({
      connectionString: cleanUrl,
      ssl: { rejectUnauthorized: false },
      max: maxConnections,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 20000,
    });
    if (typeof p.on === 'function') {
      p.on('error', (err: any) => {
        console.warn('[Pg DB Pool] Aviso em conexão ociosa:', err?.message || err);
      });
    }
    return p;
  } catch (err: any) {
    console.error('[Pg DB] Erro crítico ao criar pool:', err);
    return null;
  }
}

// Antonio Batista - SEG_002 - Retorna ou inicializa o pool de conexões com o banco Neon PostgreSQL.
export function getDbPool(): any {
  const dbUrl = process.env.DATABASE_URL ||
                process.env.POSTGRES_URL ||
                process.env.POSTGRES_PRISMA_URL ||
                process.env.POSTGRES_URL_NON_POOLING ||
                process.env.NEON_DATABASE_URL ||
                process.env.VITE_DATABASE_URL;
  if (!dbUrl || !dbUrl.trim()) {
    return null;
  }
  if (!pool) {
    pool = createPoolInstance(dbUrl.trim(), 6);
    if (pool) {
      console.log('[Neon DB] Conexão com o banco Neon inicializada com sucesso.');
    }
  }
  return pool;
}

let isEnsuringSchema = false;
export async function ensureSchema(): Promise<boolean> {
  if (isInitialized) return true;
  if (isEnsuringSchema) return false;
  isEnsuringSchema = true;
  try {
    const ok = await initSchema();
    if (ok && !isMigrated) {
      await seedDatabaseFromJson(false).catch(() => {});
    }
    return ok;
  } catch (err: any) {
    console.error('[Neon DB] Erro ao garantir esquema:', err.message);
    return false;
  } finally {
    isEnsuringSchema = false;
  }
}

// Antonio Batista - SEG_002 - Testa a conectividade com o banco Neon e retorna informações de saúde e contagem de registros.
export async function testDbConnection(overrideUrl?: string): Promise<{ success: boolean; message: string; tables?: Record<string, number>; diagnostics?: any }> {
  let matchedEnv = '';
  let dbUrl = '';

  if (overrideUrl && overrideUrl.trim()) {
    dbUrl = overrideUrl.trim();
    matchedEnv = 'CUSTOM_INPUT';
  } else if (process.env.DATABASE_URL) {
    dbUrl = process.env.DATABASE_URL.trim();
    matchedEnv = 'DATABASE_URL';
  } else if (process.env.POSTGRES_URL) {
    dbUrl = process.env.POSTGRES_URL.trim();
    matchedEnv = 'POSTGRES_URL';
  } else if (process.env.POSTGRES_PRISMA_URL) {
    dbUrl = process.env.POSTGRES_PRISMA_URL.trim();
    matchedEnv = 'POSTGRES_PRISMA_URL';
  } else if (process.env.POSTGRES_URL_NON_POOLING) {
    dbUrl = process.env.POSTGRES_URL_NON_POOLING.trim();
    matchedEnv = 'POSTGRES_URL_NON_POOLING';
  } else if (process.env.NEON_DATABASE_URL) {
    dbUrl = process.env.NEON_DATABASE_URL.trim();
    matchedEnv = 'NEON_DATABASE_URL';
  } else if (process.env.VITE_DATABASE_URL) {
    dbUrl = process.env.VITE_DATABASE_URL.trim();
    matchedEnv = 'VITE_DATABASE_URL';
  }

  if (!dbUrl) {
    return {
      success: false,
      message: 'A variável DATABASE_URL (ou POSTGRES_URL) não foi detectada no ambiente da Vercel. Por favor, adicione DATABASE_URL no painel da Vercel em Project Settings > Environment Variables com a connection string do Neon e realize um novo Deploy.',
      diagnostics: {
        envDetected: false,
        availableEnvKeys: Object.keys(process.env).filter(k => k.includes('URL') || k.includes('DB') || k.includes('POSTGRES') || k.includes('NEON'))
      }
    };
  }

  // Mask sensitive password for diagnostics
  let maskedUrl = dbUrl;
  let host = 'unknown';
  try {
    const parsed = new URL(dbUrl.replace(/^postgres:/, 'postgresql:'));
    host = parsed.host;
    if (parsed.password) {
      maskedUrl = dbUrl.replace(parsed.password, '******');
    }
  } catch (_) {
    maskedUrl = dbUrl.substring(0, 15) + '...';
  }

  let testPool: any = null;
  let shouldClosePool = false;

  if (overrideUrl) {
    testPool = createPoolInstance(dbUrl, 2);
    shouldClosePool = true;
  } else {
    testPool = getDbPool();
  }

  if (!testPool) {
    return {
      success: false,
      message: 'Não foi possível inicializar o driver PostgreSQL com a URL informada.',
      diagnostics: { matchedEnv, maskedUrl, host }
    };
  }

  try {
    const client = await testPool.connect();
    try {
      const res = await client.query('SELECT NOW() as now, current_database() as db_name, version() as version');
      
      // Contar registros das tabelas principais caso existam
      const tablesCount: Record<string, number> = {};
      try {
        const counts = await client.query(`
          SELECT 'atividades' as tbl, COUNT(*) as cnt FROM atividades
          UNION ALL
          SELECT 'datas_avisos' as tbl, COUNT(*) as cnt FROM datas_avisos
          UNION ALL
          SELECT 'periods' as tbl, COUNT(*) as cnt FROM periods
          UNION ALL
          SELECT 'usuarios' as tbl, COUNT(*) as cnt FROM usuarios
          UNION ALL
          SELECT 'planning' as tbl, COUNT(*) as cnt FROM planning
          UNION ALL
          SELECT 'refinement' as tbl, COUNT(*) as cnt FROM refinement
        `);
        for (const row of counts.rows) {
          tablesCount[row.tbl] = parseInt(row.cnt, 10);
        }
      } catch (_) {}

      return {
        success: true,
        message: `Conectado ao Neon com sucesso! Banco: ${res.rows[0]?.db_name || 'default'}, Horário do Servidor: ${res.rows[0]?.now}`,
        tables: tablesCount,
        diagnostics: {
          matchedEnv,
          maskedUrl,
          host,
          serverTime: res.rows[0]?.now,
          dbName: res.rows[0]?.db_name,
          isPooled: host.includes('pooler')
        }
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Falha ao conectar ao Neon PostgreSQL: ${err.message}`,
      diagnostics: {
        matchedEnv,
        maskedUrl,
        host,
        errorName: err.name,
        errorCode: err.code || 'UNKNOWN',
        isPooled: host.includes('pooler')
      }
    };
  } finally {
    if (shouldClosePool && testPool) {
      testPool.end().catch(() => {});
    }
  }
}

// Antonio Batista - SEG_002 - Cria a estrutura de tabelas unificadas no Neon PostgreSQL caso não existam.
export async function initSchema(): Promise<boolean> {
  if (isInitialized) return true;
  const db = getDbPool();
  if (!db) return false;

  let client: any = null;
  try {
    client = await db.connect();
    await client.query('BEGIN');

    // 1. Tabela de Períodos
    await client.query(`
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
    `);

    // 2. Tabela ÚNICA de Atividades do Board (com period_id como chave de agrupamento)
    await client.query(`
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
      CREATE INDEX IF NOT EXISTS idx_atividades_period_id ON atividades(period_id);
      CREATE INDEX IF NOT EXISTS idx_atividades_versao ON atividades(versao);
    `);

    // 3. Tabela ÚNICA de Datas e Avisos (com campo 'tipo' para ferias_day_off, ausencia_temporaria e deploy)
    await client.query(`
      CREATE TABLE IF NOT EXISTS datas_avisos (
        id VARCHAR(100) PRIMARY KEY,
        tipo VARCHAR(50) NOT NULL, -- 'ferias_day_off', 'ausencia_temporaria', 'deploy'
        colaborador VARCHAR(150),
        subtipo VARCHAR(50), -- 'Férias', 'DayOff', etc.
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
      CREATE INDEX IF NOT EXISTS idx_datas_avisos_tipo ON datas_avisos(tipo);
      CREATE INDEX IF NOT EXISTS idx_datas_avisos_versao ON datas_avisos(versao);
    `);

    // 4. Tabela de Usuários
    await client.query(`
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
    `);

    // 5. Tabela de Permissões e Papéis
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles_permissions (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
        roles JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 6. Tabela de Planning
    await client.query(`
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
      CREATE INDEX IF NOT EXISTS idx_planning_period_id ON planning(period_id);
    `);

    // 7. Tabela de Refinamento
    await client.query(`
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
      CREATE INDEX IF NOT EXISTS idx_refinement_period_id ON refinement(period_id);
    `);

    // 8. Tabela de Parâmetros Globais
    await client.query(`
      CREATE TABLE IF NOT EXISTS parameters (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'global',
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 9. Tabela de Presets de Cronômetro / Timer
    await client.query(`
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
    `);

    // 10. Tabela de Tarefas Pessoais dos Usuários
    await client.query(`
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
      CREATE INDEX IF NOT EXISTS idx_user_tasks_owner ON user_tasks(owner_username);
    `);

    // 11. Tabela de Versionamento da Aplicação
    await client.query(`
      CREATE TABLE IF NOT EXISTS versionamento (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 12. Tabela de Trava de Concorrência (Lock Status)
    await client.query(`
      CREATE TABLE IF NOT EXISTS lock_status (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
        locked BOOLEAN DEFAULT false,
        locked_by VARCHAR(150),
        locked_at VARCHAR(100),
        expires_at VARCHAR(100),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 13. Tabela de Configuração do GitHub
    await client.query(`
      CREATE TABLE IF NOT EXISTS github_config (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
        config JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    isInitialized = true;
    console.log('[Neon DB] Estrutura de tabelas verificada/criada com sucesso no Neon.');
    return true;
  } catch (err: any) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
    }
    console.warn('[Neon DB] Aviso ao inicializar esquema no banco (operando em modo fallback):', err?.message || err);
    return false;
  } finally {
    if (client) {
      try { client.release(); } catch (_) {}
    }
  }
}

// Antonio Batista - SEG_002 - Localiza o diretório de dados em diferentes ambientes (local, container, Vercel Serverless)
function resolveDataDir(): string | null {
  const candidatePaths = [
    path.join(process.cwd(), 'src', 'data'),
    path.join(__dirname, '..', 'src', 'data'),
    path.join(__dirname, 'src', 'data'),
    path.resolve('src/data')
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

// Antonio Batista - SEG_002 - Migra automaticamente dados dos arquivos JSON locais para o banco Neon caso as tabelas estejam vazias.
export async function seedDatabaseFromJson(force: boolean = false): Promise<{ success: boolean; message: string; details?: any; timestamp?: string; totalRecords?: number; executionTimeMs?: number }> {
  const startTime = Date.now();
  const db = getDbPool();
  if (!db) {
    return {
      success: false,
      message: 'DATABASE_URL não configurada ou inacessível no momento. Verifique as variáveis de ambiente.',
      timestamp: new Date().toISOString(),
      executionTimeMs: Date.now() - startTime
    };
  }

  const ok = await initSchema();
  if (!ok) {
    return {
      success: false,
      message: 'Não foi possível conectar ao banco para inicializar as tabelas. Verifique as credenciais do Neon.',
      timestamp: new Date().toISOString(),
      executionTimeMs: Date.now() - startTime
    };
  }

  let client: any = null;
  try {
    client = await db.connect();
    const dataDir = resolveDataDir();
    if (!dataDir) {
      return {
        success: false,
        message: 'Diretório de dados (src/data) não encontrado no servidor.',
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime
      };
    }

    const summary: Record<string, number> = {};

    // 1. Periods
    const periodsCountRes = await client.query('SELECT COUNT(*) FROM periods');
    if (force || parseInt(periodsCountRes.rows[0].count, 10) === 0) {
      const periodsPath = path.join(dataDir, 'periods.json');
      if (fs.existsSync(periodsPath)) {
        const periods = JSON.parse(fs.readFileSync(periodsPath, 'utf-8'));
        if (Array.isArray(periods)) {
          for (const p of periods) {
            await client.query(`
              INSERT INTO periods (id, label, start_date, end_date, is_active, is_locked, raw_data, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
              ON CONFLICT (id) DO UPDATE SET
                label = EXCLUDED.label,
                raw_data = EXCLUDED.raw_data,
                updated_at = NOW()
            `, [p.id, p.label, p.startDate || null, p.endDate || null, p.isActive !== false, !!p.isLocked, JSON.stringify(p)]);
          }
          summary['periods'] = periods.length;
        }
      }
    }

    // 2. Atividades (Unificação de todos os arquivos atividades_*.json para a tabela única 'atividades')
    const atividadesCountRes = await client.query('SELECT COUNT(*) FROM atividades');
    if (force || parseInt(atividadesCountRes.rows[0].count, 10) === 0) {
      const files = fs.readdirSync(dataDir).filter(f => f.startsWith('atividades_') && f.endsWith('.json'));
      let totalAtividades = 0;

      for (const file of files) {
        const periodIdMatch = file.match(/atividades_([a-zA-Z0-9]+)\.json/);
        const periodId = periodIdMatch ? periodIdMatch[1] : '';
        const filePath = path.join(dataDir, file);
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (Array.isArray(content)) {
            for (let idx = 0; idx < content.length; idx++) {
              const item = content[idx];
              const pId = item.periodId || item.period_id || periodId;
              const actId = item.id || `act_${pId}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
              await client.query(`
                INSERT INTO atividades (
                  id, period_id, name, type, owner, notes, jira_ticket, movidesk, service_request,
                  pr_link, doc_link, componente, versao, status, category, start_date, end_date,
                  description, order_index, subtasks, tags, raw_data, updated_at
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW()
                )
                ON CONFLICT (id) DO UPDATE SET
                  period_id = EXCLUDED.period_id,
                  name = EXCLUDED.name,
                  type = EXCLUDED.type,
                  owner = EXCLUDED.owner,
                  notes = EXCLUDED.notes,
                  jira_ticket = EXCLUDED.jira_ticket,
                  movidesk = EXCLUDED.movidesk,
                  service_request = EXCLUDED.service_request,
                  pr_link = EXCLUDED.pr_link,
                  doc_link = EXCLUDED.doc_link,
                  componente = EXCLUDED.componente,
                  versao = EXCLUDED.versao,
                  status = EXCLUDED.status,
                  category = EXCLUDED.category,
                  start_date = EXCLUDED.start_date,
                  end_date = EXCLUDED.end_date,
                  description = EXCLUDED.description,
                  order_index = EXCLUDED.order_index,
                  subtasks = EXCLUDED.subtasks,
                  tags = EXCLUDED.tags,
                  raw_data = EXCLUDED.raw_data,
                  updated_at = NOW()
              `, [
                actId,
                pId,
                item.name || 'Sem título',
                item.type || '',
                item.owner || '',
                item.notes || '',
                item.jiraOrMovidesk || item.jiraTicket || item.jira_ticket || '',
                item.Movidesk || item.movidesk || '',
                item.serviceRequest || '',
                item.prLink || '',
                item.docLink || '',
                item.componente || '',
                item.versao || '',
                item.status || 'Backlog',
                item.category || '',
                item.startDate || '',
                item.endDate || '',
                item.description || '',
                idx,
                JSON.stringify(item.subtasks || []),
                JSON.stringify(item.tags || []),
                JSON.stringify({ ...item, id: actId })
              ]);
              totalAtividades++;
            }
          }
        } catch (e: any) {
          console.error(`[Neon Seed] Erro ao importar ${file}:`, e.message);
        }
      }
      summary['atividades'] = totalAtividades;
    }

    // 3. Datas e Avisos (Unificação de ferias, ausencias e deploys na tabela única 'datas_avisos')
    const datasCountRes = await client.query('SELECT COUNT(*) FROM datas_avisos');
    if (force || parseInt(datasCountRes.rows[0].count, 10) === 0) {
      const datasPath = path.join(dataDir, 'datas_avisos.json');
      if (fs.existsSync(datasPath)) {
        const datas = JSON.parse(fs.readFileSync(datasPath, 'utf-8'));
        let totalDatas = 0;

        // Férias e DayOffs
        if (Array.isArray(datas.feriasDayOffs)) {
          for (const f of datas.feriasDayOffs) {
            const fId = f.id || `fdo_${Math.random().toString(36).substring(2, 9)}`;
            await client.query(`
              INSERT INTO datas_avisos (
                id, tipo, colaborador, subtipo, data_inicio, data_fim, status, observacao, raw_data, updated_at
              ) VALUES ($1, 'ferias_day_off', $2, $3, $4, $5, $6, $7, $8, NOW())
              ON CONFLICT (id) DO UPDATE SET
                colaborador = EXCLUDED.colaborador,
                subtipo = EXCLUDED.subtipo,
                data_inicio = EXCLUDED.data_inicio,
                data_fim = EXCLUDED.data_fim,
                status = EXCLUDED.status,
                observacao = EXCLUDED.observacao,
                raw_data = EXCLUDED.raw_data,
                updated_at = NOW()
            `, [
              fId,
              f.colaborador || '',
              f.tipo || 'Férias',
              f.dataInicio || '',
              f.dataFim || '',
              f.status || 'Previsto',
              f.observacao || '',
              JSON.stringify({ ...f, id: fId })
            ]);
            totalDatas++;
          }
        }

        // Ausências Temporárias
        if (Array.isArray(datas.ausenciasTemporarias)) {
          for (const a of datas.ausenciasTemporarias) {
            const aId = a.id || `aus_${Math.random().toString(36).substring(2, 9)}`;
            await client.query(`
              INSERT INTO datas_avisos (
                id, tipo, colaborador, data, hora_inicio, hora_fim, motivo, raw_data, updated_at
              ) VALUES ($1, 'ausencia_temporaria', $2, $3, $4, $5, $6, $7, NOW())
              ON CONFLICT (id) DO UPDATE SET
                colaborador = EXCLUDED.colaborador,
                data = EXCLUDED.data,
                hora_inicio = EXCLUDED.hora_inicio,
                hora_fim = EXCLUDED.hora_fim,
                motivo = EXCLUDED.motivo,
                raw_data = EXCLUDED.raw_data,
                updated_at = NOW()
            `, [
              aId,
              a.colaborador || '',
              a.data || '',
              a.horaInicio || '',
              a.horaFim || '',
              a.motivo || '',
              JSON.stringify({ ...a, id: aId })
            ]);
            totalDatas++;
          }
        }

        // Deploys
        if (Array.isArray(datas.deploys)) {
          for (const d of datas.deploys) {
            const dId = d.id || `dep_${Math.random().toString(36).substring(2, 9)}`;
            await client.query(`
              INSERT INTO datas_avisos (
                id, tipo, data, versao, componente, link, related_tasks, raw_data, updated_at
              ) VALUES ($1, 'deploy', $2, $3, $4, $5, $6, $7, NOW())
              ON CONFLICT (id) DO UPDATE SET
                data = EXCLUDED.data,
                versao = EXCLUDED.versao,
                componente = EXCLUDED.componente,
                link = EXCLUDED.link,
                related_tasks = EXCLUDED.related_tasks,
                raw_data = EXCLUDED.raw_data,
                updated_at = NOW()
            `, [
              dId,
              d.data || '',
              d.versao || '',
              d.componente || '',
              d.link || '',
              JSON.stringify(d.relatedTasks || []),
              JSON.stringify({ ...d, id: dId })
            ]);
            totalDatas++;
          }
        }

        summary['datas_avisos'] = totalDatas;
      }
    }

    // 4. Usuários
    const usuariosCountRes = await client.query('SELECT COUNT(*) FROM usuarios');
    if (force || parseInt(usuariosCountRes.rows[0].count, 10) === 0) {
      const usuariosPath = path.join(dataDir, 'usuarios.json');
      if (fs.existsSync(usuariosPath)) {
        const usuarios = JSON.parse(fs.readFileSync(usuariosPath, 'utf-8'));
        if (Array.isArray(usuarios)) {
          for (const u of usuarios) {
            const userId = u.id || u.username || u.email || `user_${Math.random().toString(36).substring(2, 9)}`;
            const usernameVal = u.username || u.email?.split('@')[0] || u.name?.toLowerCase().replace(/\s+/g, '') || userId;
            await client.query(`
              INSERT INTO usuarios (id, name, email, username, password, role, avatar, preferences, raw_data, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                email = EXCLUDED.email,
                username = EXCLUDED.username,
                password = EXCLUDED.password,
                role = EXCLUDED.role,
                avatar = EXCLUDED.avatar,
                preferences = EXCLUDED.preferences,
                raw_data = EXCLUDED.raw_data,
                updated_at = NOW()
            `, [
              userId,
              u.name || 'Sem Nome',
              u.email || '',
              usernameVal,
              u.password || '',
              u.role || 'Analista',
              u.avatar || '',
              JSON.stringify(u.preferences || {}),
              JSON.stringify({ ...u, id: userId, username: usernameVal })
            ]);
          }
          summary['usuarios'] = usuarios.length;
        }
      }
    }

    // 5. Planning
    const planningPath = path.join(dataDir, 'planning.json');
    if (fs.existsSync(planningPath)) {
      const planning = JSON.parse(fs.readFileSync(planningPath, 'utf-8'));
      if (Array.isArray(planning)) {
        for (const item of planning) {
          const planId = item.id || `plan_${Math.random().toString(36).substring(2, 9)}`;
          await client.query(`
            INSERT INTO planning (id, period_id, atividade, responsavel, estado, versao, componente, story_point, jira_ticket, descricao, raw_data, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
            ON CONFLICT (id) DO UPDATE SET
              period_id = EXCLUDED.period_id,
              atividade = EXCLUDED.atividade,
              responsavel = EXCLUDED.responsavel,
              estado = EXCLUDED.estado,
              versao = EXCLUDED.versao,
              componente = EXCLUDED.componente,
              story_point = EXCLUDED.story_point,
              jira_ticket = EXCLUDED.jira_ticket,
              descricao = EXCLUDED.descricao,
              raw_data = EXCLUDED.raw_data,
              updated_at = NOW()
          `, [
            planId,
            item.periodId || '',
            item.atividade || '',
            item.responsavel || '',
            item.estado || '',
            item.versao || '',
            item.componente || '',
            String(item.storyPoint || ''),
            item.jiraTicket || '',
            item.descricao || '',
            JSON.stringify({ ...item, id: planId })
          ]);
        }
        summary['planning'] = planning.length;
      }
    }

    // 6. Refinement
    const refinementPath = path.join(dataDir, 'refinement.json');
    if (fs.existsSync(refinementPath)) {
      const refinement = JSON.parse(fs.readFileSync(refinementPath, 'utf-8'));
      if (Array.isArray(refinement)) {
        for (const item of refinement) {
          const refId = item.id || `ref_${Math.random().toString(36).substring(2, 9)}`;
          await client.query(`
            INSERT INTO refinement (id, period_id, atividade, responsavel, estado, versao, componente, story_point, jira_ticket, descricao, raw_data, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
            ON CONFLICT (id) DO UPDATE SET
              period_id = EXCLUDED.period_id,
              atividade = EXCLUDED.atividade,
              responsavel = EXCLUDED.responsavel,
              estado = EXCLUDED.estado,
              versao = EXCLUDED.versao,
              componente = EXCLUDED.componente,
              story_point = EXCLUDED.story_point,
              jira_ticket = EXCLUDED.jira_ticket,
              descricao = EXCLUDED.descricao,
              raw_data = EXCLUDED.raw_data,
              updated_at = NOW()
          `, [
            refId,
            item.periodId || '',
            item.atividade || '',
            item.responsavel || '',
            item.estado || '',
            item.versao || '',
            item.componente || '',
            String(item.storyPoint || ''),
            item.jiraTicket || '',
            item.descricao || '',
            JSON.stringify({ ...item, id: refId })
          ]);
        }
        summary['refinement'] = refinement.length;
      }
    }

    // 7. Parâmetros
    const parametersPath = path.join(dataDir, 'parameters.json');
    if (fs.existsSync(parametersPath)) {
      const params = JSON.parse(fs.readFileSync(parametersPath, 'utf-8'));
      await client.query(`
        INSERT INTO parameters (id, data, updated_at)
        VALUES ('global', $1, NOW())
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `, [JSON.stringify(params)]);
      summary['parameters'] = 1;
    }

    // 8. Roles & Permissions
    const rolesPath = path.join(dataDir, 'roles_permissions.json');
    if (fs.existsSync(rolesPath)) {
      const roles = JSON.parse(fs.readFileSync(rolesPath, 'utf-8'));
      await client.query(`
        INSERT INTO roles_permissions (id, roles, updated_at)
        VALUES ('default', $1, NOW())
        ON CONFLICT (id) DO UPDATE SET roles = EXCLUDED.roles, updated_at = NOW()
      `, [JSON.stringify(roles)]);
      summary['roles_permissions'] = 1;
    }

    // 9. Timer Presets
    const timerPath = path.join(dataDir, 'timer_presets.json');
    if (fs.existsSync(timerPath)) {
      const presets = JSON.parse(fs.readFileSync(timerPath, 'utf-8'));
      if (Array.isArray(presets)) {
        for (const tp of presets) {
          const tpId = tp.id || `tp_${Math.random().toString(36).substring(2, 9)}`;
          await client.query(`
            INSERT INTO timer_presets (id, name, duration_minutes, category, description, sound_alert, color, raw_data, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              duration_minutes = EXCLUDED.duration_minutes,
              category = EXCLUDED.category,
              description = EXCLUDED.description,
              sound_alert = EXCLUDED.sound_alert,
              color = EXCLUDED.color,
              raw_data = EXCLUDED.raw_data,
              updated_at = NOW()
          `, [
            tpId,
            tp.name,
            tp.durationMinutes || 15,
            tp.category || '',
            tp.description || '',
            tp.soundAlert !== false,
            tp.color || '',
            JSON.stringify({ ...tp, id: tpId })
          ]);
        }
        summary['timer_presets'] = presets.length;
      }
    }

    // 10. User Tasks
    const userTasksPath = path.join(dataDir, 'user_tasks.json');
    if (fs.existsSync(userTasksPath)) {
      const tasks = JSON.parse(fs.readFileSync(userTasksPath, 'utf-8'));
      if (Array.isArray(tasks)) {
        for (const t of tasks) {
          const tId = t.id || `task_${Math.random().toString(36).substring(2, 9)}`;
          await client.query(`
            INSERT INTO user_tasks (id, owner_username, title, description, status, priority, raw_data, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (id) DO UPDATE SET
              owner_username = EXCLUDED.owner_username,
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              status = EXCLUDED.status,
              priority = EXCLUDED.priority,
              raw_data = EXCLUDED.raw_data,
              updated_at = NOW()
          `, [
            tId,
            t.ownerUsername || 'admin',
            t.title || 'Sem título',
            t.description || '',
            t.status || 'Pendente',
            t.priority || 'P2',
            JSON.stringify({ ...t, id: tId })
          ]);
        }
        summary['user_tasks'] = tasks.length;
      }
    }

    // 11. Versionamento
    const versPath = path.join(dataDir, 'versionamento.json');
    if (fs.existsSync(versPath)) {
      const vers = JSON.parse(fs.readFileSync(versPath, 'utf-8'));
      await client.query(`
        INSERT INTO versionamento (id, data, updated_at)
        VALUES ('current', $1, NOW())
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `, [JSON.stringify(vers)]);
      summary['versionamento'] = 1;
    }

    // 12. GitHub Config
    const ghPath = path.join(dataDir, 'github_config.json');
    if (fs.existsSync(ghPath)) {
      const gh = JSON.parse(fs.readFileSync(ghPath, 'utf-8'));
      await client.query(`
        INSERT INTO github_config (id, config, updated_at)
        VALUES ('current', $1, NOW())
        ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()
      `, [JSON.stringify(gh)]);
      summary['github_config'] = 1;
    }

    isMigrated = true;
    const totalRecords = Object.values(summary).reduce((acc, count) => acc + (typeof count === 'number' ? count : 0), 0);
    const executionTimeMs = Date.now() - startTime;
    console.log('[Neon Seed] Migração dos arquivos JSON para o Neon concluída com sucesso:', { totalRecords, executionTimeMs, summary });
    return {
      success: true,
      message: `Migração concluída com êxito! ${totalRecords} registros importados para as tabelas do Neon em ${executionTimeMs}ms.`,
      details: summary,
      totalRecords,
      executionTimeMs,
      timestamp: new Date().toISOString()
    };
  } catch (err: any) {
    console.error('[Neon Seed] Erro ao popular banco Neon a partir dos JSONs:', err);
    return {
      success: false,
      message: `Erro na migração: ${err.message}`,
      details: { error: err.message, code: err.code },
      timestamp: new Date().toISOString(),
      executionTimeMs: Date.now() - startTime
    };
  } finally {
    client.release();
  }
}

// =========================================================================
// MÉTODOS DE ACESSO A DADOS (DATA ACCESS LAYER - DAL)
// =========================================================================

// Antonio Batista - SEG_002 - Obtém as atividades de um período ou de todos os períodos diretamente do Neon.
export async function getAtividadesFromDb(periodId?: string): Promise<any[]> {
  await ensureSchema().catch(() => {});
  const db = getDbPool();
  if (!db) return [];
  let client: any = null;
  try {
    client = await db.connect();
    let query = 'SELECT * FROM atividades';
    const params: any[] = [];
    if (periodId) {
      query += ' WHERE period_id = $1 ORDER BY order_index ASC, id ASC';
      params.push(periodId);
    } else {
      query += ' ORDER BY period_id DESC, order_index ASC, id ASC';
    }
    const res = await client.query(query, params);
    return res.rows.map((row: any) => {
      const base = row.raw_data || {};
      return {
        ...base,
        id: row.id,
        periodId: row.period_id,
        name: row.name,
        type: row.type || base.type,
        owner: row.owner || base.owner,
        notes: row.notes || base.notes,
        jiraOrMovidesk: row.jira_ticket || base.jiraOrMovidesk || base.jiraTicket,
        Movidesk: row.movidesk || base.Movidesk || base.movidesk,
        serviceRequest: row.service_request || base.serviceRequest,
        prLink: row.pr_link || base.prLink,
        docLink: row.doc_link || base.docLink,
        componente: row.componente || base.componente,
        versao: row.versao || base.versao,
        status: row.status || base.status,
        category: row.category || base.category,
        startDate: row.start_date || base.startDate,
        endDate: row.end_date || base.endDate,
        description: row.description || base.description,
        subtasks: row.subtasks || base.subtasks || [],
        tags: row.tags || base.tags || []
      };
    });
  } catch (err: any) {
    console.warn('[Neon DB] Falha em getAtividadesFromDb:', err?.message || err);
    return [];
  } finally {
    if (client) {
      try { client.release(); } catch (_) {}
    }
  }
}

// Antonio Batista - SEG_002 - Salva ou atualiza a lista de atividades de um período na tabela única 'atividades' do Neon.
export async function saveAtividadesToDb(periodId: string, atividades: any[]): Promise<boolean> {
  await ensureSchema().catch(() => {});
  const db = getDbPool();
  if (!db) return false;
  let client: any = null;
  try {
    client = await db.connect();
    await client.query('BEGIN');
    
    // Obter IDs existentes deste período
    const existingRes = await client.query('SELECT id FROM atividades WHERE period_id = $1', [periodId]);
    const existingIds = new Set(existingRes.rows.map((r: any) => r.id));
    const newIds = new Set(atividades.map((a: any) => a.id));

    // Deletar atividades removidas
    for (const oldId of existingIds) {
      if (!newIds.has(oldId)) {
        await client.query('DELETE FROM atividades WHERE id = $1', [oldId]);
      }
    }

    // Inserir ou atualizar atividades recebidas
    for (let idx = 0; idx < atividades.length; idx++) {
      const item = atividades[idx];
      await client.query(`
        INSERT INTO atividades (
          id, period_id, name, type, owner, notes, jira_ticket, movidesk, service_request,
          pr_link, doc_link, componente, versao, status, category, start_date, end_date,
          description, order_index, subtasks, tags, raw_data, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          period_id = EXCLUDED.period_id,
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          owner = EXCLUDED.owner,
          notes = EXCLUDED.notes,
          jira_ticket = EXCLUDED.jira_ticket,
          movidesk = EXCLUDED.movidesk,
          service_request = EXCLUDED.service_request,
          pr_link = EXCLUDED.pr_link,
          doc_link = EXCLUDED.doc_link,
          componente = EXCLUDED.componente,
          versao = EXCLUDED.versao,
          status = EXCLUDED.status,
          category = EXCLUDED.category,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          description = EXCLUDED.description,
          order_index = EXCLUDED.order_index,
          subtasks = EXCLUDED.subtasks,
          tags = EXCLUDED.tags,
          raw_data = EXCLUDED.raw_data,
          updated_at = NOW()
      `, [
        item.id,
        periodId,
        item.name || 'Sem título',
        item.type || '',
        item.owner || '',
        item.notes || '',
        item.jiraOrMovidesk || item.jiraTicket || item.jira_ticket || '',
        item.Movidesk || item.movidesk || '',
        item.serviceRequest || '',
        item.prLink || '',
        item.docLink || '',
        item.componente || '',
        item.versao || '',
        item.status || 'Backlog',
        item.category || '',
        item.startDate || '',
        item.endDate || '',
        item.description || '',
        idx,
        JSON.stringify(item.subtasks || []),
        JSON.stringify(item.tags || []),
        JSON.stringify(item)
      ]);
    }

    await client.query('COMMIT');
    return true;
  } catch (err: any) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
    }
    console.error(`[Neon DB] Erro ao salvar atividades do período ${periodId}:`, err?.message || err);
    return false;
  } finally {
    if (client) {
      try { client.release(); } catch (_) {}
    }
  }
}

// Antonio Batista - SEG_002 - Recupera todos os registros da tabela unificada 'datas_avisos' formatados para o contrato esperado pelo frontend.
export async function getDatasAvisosFromDb(): Promise<{ feriasDayOffs: any[]; ausenciasTemporarias: any[]; deploys: any[] }> {
  await ensureSchema().catch(() => {});
  const db = getDbPool();
  if (!db) return { feriasDayOffs: [], ausenciasTemporarias: [], deploys: [] };
  let client: any = null;
  try {
    client = await db.connect();
    const res = await client.query('SELECT * FROM datas_avisos ORDER BY updated_at DESC');
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
  } catch (err: any) {
    console.warn('[Neon DB] Falha em getDatasAvisosFromDb:', err?.message || err);
    return { feriasDayOffs: [], ausenciasTemporarias: [], deploys: [] };
  } finally {
    if (client) {
      try { client.release(); } catch (_) {}
    }
  }
}

// Antonio Batista - SEG_002 - Salva o conjunto de dados na tabela única 'datas_avisos' do Neon.
export async function saveDatasAvisosToDb(payload: { feriasDayOffs?: any[]; ausenciasTemporarias?: any[]; deploys?: any[] }): Promise<boolean> {
  await ensureSchema().catch(() => {});
  const db = getDbPool();
  if (!db) return false;
  let client: any = null;
  try {
    client = await db.connect();
    await client.query('BEGIN');

    // Se foram enviados feriasDayOffs, sincronizar este grupo
    if (payload.feriasDayOffs) {
      const existing = await client.query("SELECT id FROM datas_avisos WHERE tipo = 'ferias_day_off'");
      const existingIds = new Set(existing.rows.map((r: any) => r.id));
      const newIds = new Set(payload.feriasDayOffs.map((f: any) => f.id));

      for (const oldId of existingIds) {
        if (!newIds.has(oldId)) {
          await client.query('DELETE FROM datas_avisos WHERE id = $1', [oldId]);
        }
      }

      for (const f of payload.feriasDayOffs) {
        await client.query(`
          INSERT INTO datas_avisos (id, tipo, colaborador, subtipo, data_inicio, data_fim, status, observacao, raw_data, updated_at)
          VALUES ($1, 'ferias_day_off', $2, $3, $4, $5, $6, $7, $8, NOW())
          ON CONFLICT (id) DO UPDATE SET
            colaborador = EXCLUDED.colaborador,
            subtipo = EXCLUDED.subtipo,
            data_inicio = EXCLUDED.data_inicio,
            data_fim = EXCLUDED.data_fim,
            status = EXCLUDED.status,
            observacao = EXCLUDED.observacao,
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW()
        `, [
          f.id,
          f.colaborador || '',
          f.tipo || 'Férias',
          f.dataInicio || '',
          f.dataFim || '',
          f.status || 'Previsto',
          f.observacao || '',
          JSON.stringify(f)
        ]);
      }
    }

    // Se foram enviadas ausências temporárias
    if (payload.ausenciasTemporarias) {
      const existing = await client.query("SELECT id FROM datas_avisos WHERE tipo = 'ausencia_temporaria'");
      const existingIds = new Set(existing.rows.map((r: any) => r.id));
      const newIds = new Set(payload.ausenciasTemporarias.map((a: any) => a.id));

      for (const oldId of existingIds) {
        if (!newIds.has(oldId)) {
          await client.query('DELETE FROM datas_avisos WHERE id = $1', [oldId]);
        }
      }

      for (const a of payload.ausenciasTemporarias) {
        await client.query(`
          INSERT INTO datas_avisos (id, tipo, colaborador, data, hora_inicio, hora_fim, motivo, raw_data, updated_at)
          VALUES ($1, 'ausencia_temporaria', $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (id) DO UPDATE SET
            colaborador = EXCLUDED.colaborador,
            data = EXCLUDED.data,
            hora_inicio = EXCLUDED.hora_inicio,
            hora_fim = EXCLUDED.hora_fim,
            motivo = EXCLUDED.motivo,
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW()
        `, [
          a.id,
          a.colaborador || '',
          a.data || '',
          a.horaInicio || '',
          a.horaFim || '',
          a.motivo || '',
          JSON.stringify(a)
        ]);
      }
    }

    // Se foram enviados deploys
    if (payload.deploys) {
      const existing = await client.query("SELECT id FROM datas_avisos WHERE tipo = 'deploy'");
      const existingIds = new Set(existing.rows.map((r: any) => r.id));
      const newIds = new Set(payload.deploys.map((d: any) => d.id));

      for (const oldId of existingIds) {
        if (!newIds.has(oldId)) {
          await client.query('DELETE FROM datas_avisos WHERE id = $1', [oldId]);
        }
      }

      for (const d of payload.deploys) {
        await client.query(`
          INSERT INTO datas_avisos (id, tipo, data, versao, componente, link, related_tasks, raw_data, updated_at)
          VALUES ($1, 'deploy', $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (id) DO UPDATE SET
            data = EXCLUDED.data,
            versao = EXCLUDED.versao,
            componente = EXCLUDED.componente,
            link = EXCLUDED.link,
            related_tasks = EXCLUDED.related_tasks,
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW()
        `, [
          d.id,
          d.data || '',
          d.versao || '',
          d.componente || '',
          d.link || '',
          JSON.stringify(d.relatedTasks || []),
          JSON.stringify(d)
        ]);
      }
    }

    await client.query('COMMIT');
    return true;
  } catch (err: any) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
    }
    console.error('[Neon DB] Erro ao salvar datas_avisos:', err?.message || err);
    return false;
  } finally {
    if (client) {
      try { client.release(); } catch (_) {}
    }
  }
}

// Antonio Batista - SEG_002 - Recupera períodos salvos no Neon.
export async function getPeriodsFromDb(): Promise<any[]> {
  await ensureSchema().catch(() => {});
  const db = getDbPool();
  if (!db) return [];
  let client: any = null;
  try {
    client = await db.connect();
    const res = await client.query('SELECT * FROM periods ORDER BY id DESC');
    return res.rows.map((r: any) => ({
      ...(r.raw_data || {}),
      id: r.id,
      label: r.label,
      startDate: r.start_date,
      endDate: r.end_date,
      isActive: r.is_active,
      isLocked: r.is_locked
    }));
  } catch (err: any) {
    console.warn('[Neon DB] Falha em getPeriodsFromDb:', err?.message || err);
    return [];
  } finally {
    if (client) {
      try { client.release(); } catch (_) {}
    }
  }
}

// Antonio Batista - SEG_002 - Salva lista de períodos no Neon.
export async function savePeriodsToDb(periods: any[]): Promise<boolean> {
  await ensureSchema().catch(() => {});
  const db = getDbPool();
  if (!db) return false;
  let client: any = null;
  try {
    client = await db.connect();
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM periods');
    const existingIds = new Set(existing.rows.map((r: any) => r.id));
    const newIds = new Set(periods.map((p: any) => p.id));

    for (const oldId of existingIds) {
      if (!newIds.has(oldId)) {
        await client.query('DELETE FROM periods WHERE id = $1', [oldId]);
      }
    }

    for (const p of periods) {
      await client.query(`
        INSERT INTO periods (id, label, start_date, end_date, is_active, is_locked, raw_data, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (id) DO UPDATE SET
          label = EXCLUDED.label,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          is_active = EXCLUDED.is_active,
          is_locked = EXCLUDED.is_locked,
          raw_data = EXCLUDED.raw_data,
          updated_at = NOW()
      `, [p.id, p.label, p.startDate || null, p.endDate || null, p.isActive !== false, !!p.isLocked, JSON.stringify(p)]);
    }
    await client.query('COMMIT');
    return true;
  } catch (e: any) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
    }
    console.error('[Neon DB] Erro ao salvar periods:', e?.message || e);
    return false;
  } finally {
    if (client) {
      try { client.release(); } catch (_) {}
    }
  }
}

// Antonio Batista - SEG_002 - Recupera usuários salvos no Neon.
export async function getUsuariosFromDb(): Promise<any[]> {
  await ensureSchema().catch(() => {});
  const db = getDbPool();
  if (!db) return [];
  let client: any = null;
  try {
    client = await db.connect();
    const res = await client.query('SELECT * FROM usuarios ORDER BY name ASC');
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
  } catch (err: any) {
    console.warn('[Neon DB] Falha em getUsuariosFromDb:', err?.message || err);
    return [];
  } finally {
    if (client) {
      try { client.release(); } catch (_) {}
    }
  }
}

// Antonio Batista - SEG_002 - Salva lista de usuários no Neon.
export async function saveUsuariosToDb(usuarios: any[]): Promise<boolean> {
  await ensureSchema().catch(() => {});
  const db = getDbPool();
  if (!db) return false;
  let client: any = null;
  try {
    client = await db.connect();
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM usuarios');
    const existingIds = new Set(existing.rows.map((r: any) => r.id));
    const newIds = new Set(usuarios.map((u: any) => u.id || u.username || u.email));

    for (const oldId of existingIds) {
      if (!newIds.has(oldId)) {
        await client.query('DELETE FROM usuarios WHERE id = $1', [oldId]);
      }
    }

    for (const u of usuarios) {
      const userId = u.id || u.username || u.email || `user_${Math.random().toString(36).substring(2, 9)}`;
      const usernameVal = u.username || u.email?.split('@')[0] || u.name?.toLowerCase().replace(/\s+/g, '') || userId;
      await client.query(`
        INSERT INTO usuarios (id, name, email, username, password, role, avatar, preferences, raw_data, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          username = EXCLUDED.username,
          password = EXCLUDED.password,
          role = EXCLUDED.role,
          avatar = EXCLUDED.avatar,
          preferences = EXCLUDED.preferences,
          raw_data = EXCLUDED.raw_data,
          updated_at = NOW()
      `, [
        userId,
        u.name || 'Sem Nome',
        u.email || '',
        usernameVal,
        u.password || '',
        u.role || 'Analista',
        u.avatar || '',
        JSON.stringify(u.preferences || {}),
        JSON.stringify({ ...u, id: userId, username: usernameVal })
      ]);
    }
    await client.query('COMMIT');
    return true;
  } catch (e: any) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
    }
    console.error('[Neon DB] Erro ao salvar usuarios:', e?.message || e);
    return false;
  } finally {
    if (client) {
      try { client.release(); } catch (_) {}
    }
  }
}

// Antonio Batista - SEG_002 - Salva e recupera genéricos (planning, refinement, parameters, timer_presets, user_tasks, versionamento, lock_status, roles_permissions, github_config)
export async function getGenericFromDb(tableName: string, defaultId: string = 'current'): Promise<any | null> {
  await ensureSchema().catch(() => {});
  const db = getDbPool();
  if (!db) return null;
  let client: any = null;
  try {
    client = await db.connect();
    if (tableName === 'parameters' || tableName === 'versionamento') {
      const res = await client.query(`SELECT data FROM ${tableName} LIMIT 1`);
      return res.rows[0]?.data || null;
    }
    if (tableName === 'roles_permissions') {
      const res = await client.query('SELECT roles FROM roles_permissions LIMIT 1');
      return res.rows[0]?.roles || null;
    }
    if (tableName === 'github_config') {
      const res = await client.query('SELECT config FROM github_config LIMIT 1');
      return res.rows[0]?.config || null;
    }
    if (tableName === 'lock_status') {
      const res = await client.query('SELECT * FROM lock_status LIMIT 1');
      if (res.rows[0]) {
        const r = res.rows[0];
        return { locked: r.locked, lockedBy: r.locked_by, lockedAt: r.locked_at, expiresAt: r.expires_at };
      }
      return null;
    }
    if (tableName === 'planning' || tableName === 'refinement') {
      const res = await client.query(`SELECT * FROM ${tableName} ORDER BY id ASC`);
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
      const res = await client.query('SELECT * FROM timer_presets ORDER BY duration_minutes ASC');
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
      const res = await client.query('SELECT * FROM user_tasks ORDER BY updated_at DESC');
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
  } catch (err: any) {
    console.warn(`[Neon DB] Erro ao ler da tabela ${tableName}:`, err?.message || err);
    return null;
  } finally {
    if (client) {
      try { client.release(); } catch (_) {}
    }
  }
}

export async function saveGenericToDb(tableName: string, data: any): Promise<boolean> {
  await ensureSchema().catch(() => {});
  const db = getDbPool();
  if (!db) return false;
  let client: any = null;
  try {
    client = await db.connect();
    if (tableName === 'parameters') {
      await client.query(`
        INSERT INTO parameters (id, data, updated_at)
        VALUES ('global', $1, NOW())
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `, [JSON.stringify(data)]);
      return true;
    }
    if (tableName === 'versionamento') {
      await client.query(`
        INSERT INTO versionamento (id, data, updated_at)
        VALUES ('current', $1, NOW())
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `, [JSON.stringify(data)]);
      return true;
    }
    if (tableName === 'roles_permissions') {
      await client.query(`
        INSERT INTO roles_permissions (id, roles, updated_at)
        VALUES ('default', $1, NOW())
        ON CONFLICT (id) DO UPDATE SET roles = EXCLUDED.roles, updated_at = NOW()
      `, [JSON.stringify(data)]);
      return true;
    }
    if (tableName === 'github_config') {
      await client.query(`
        INSERT INTO github_config (id, config, updated_at)
        VALUES ('current', $1, NOW())
        ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()
      `, [JSON.stringify(data)]);
      return true;
    }
    if (tableName === 'lock_status') {
      await client.query(`
        INSERT INTO lock_status (id, locked, locked_by, locked_at, expires_at, updated_at)
        VALUES ('current', $1, $2, $3, $4, NOW())
        ON CONFLICT (id) DO UPDATE SET
          locked = EXCLUDED.locked,
          locked_by = EXCLUDED.locked_by,
          locked_at = EXCLUDED.locked_at,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
      `, [!!data.locked, data.lockedBy || null, data.lockedAt || null, data.expiresAt || null]);
      return true;
    }
    if (tableName === 'planning' || tableName === 'refinement') {
      if (Array.isArray(data)) {
        await client.query('BEGIN');
        const existing = await client.query(`SELECT id FROM ${tableName}`);
        const existingIds = new Set(existing.rows.map((r: any) => r.id));
        const newIds = new Set(data.map((d: any) => d.id));

        for (const oldId of existingIds) {
          if (!newIds.has(oldId)) {
            await client.query(`DELETE FROM ${tableName} WHERE id = $1`, [oldId]);
          }
        }

        for (const item of data) {
          await client.query(`
            INSERT INTO ${tableName} (id, period_id, atividade, responsavel, estado, versao, componente, story_point, jira_ticket, descricao, raw_data, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
            ON CONFLICT (id) DO UPDATE SET
              period_id = EXCLUDED.period_id,
              atividade = EXCLUDED.atividade,
              responsavel = EXCLUDED.responsavel,
              estado = EXCLUDED.estado,
              versao = EXCLUDED.versao,
              componente = EXCLUDED.componente,
              story_point = EXCLUDED.story_point,
              jira_ticket = EXCLUDED.jira_ticket,
              descricao = EXCLUDED.descricao,
              raw_data = EXCLUDED.raw_data,
              updated_at = NOW()
          `, [
            item.id,
            item.periodId || '',
            item.atividade || '',
            item.responsavel || '',
            item.estado || '',
            item.versao || '',
            item.componente || '',
            String(item.storyPoint || ''),
            item.jiraTicket || '',
            item.descricao || '',
            JSON.stringify(item)
          ]);
        }
        await client.query('COMMIT');
        return true;
      }
    }
    if (tableName === 'timer_presets') {
      if (Array.isArray(data)) {
        await client.query('BEGIN');
        const existing = await client.query('SELECT id FROM timer_presets');
        const existingIds = new Set(existing.rows.map((r: any) => r.id));
        const newIds = new Set(data.map((d: any) => d.id));

        for (const oldId of existingIds) {
          if (!newIds.has(oldId)) {
            await client.query('DELETE FROM timer_presets WHERE id = $1', [oldId]);
          }
        }

        for (const tp of data) {
          await client.query(`
            INSERT INTO timer_presets (id, name, duration_minutes, category, description, sound_alert, color, raw_data, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              duration_minutes = EXCLUDED.duration_minutes,
              category = EXCLUDED.category,
              description = EXCLUDED.description,
              sound_alert = EXCLUDED.sound_alert,
              color = EXCLUDED.color,
              raw_data = EXCLUDED.raw_data,
              updated_at = NOW()
          `, [
            tp.id,
            tp.name,
            tp.durationMinutes || 15,
            tp.category || '',
            tp.description || '',
            tp.soundAlert !== false,
            tp.color || '',
            JSON.stringify(tp)
          ]);
        }
        await client.query('COMMIT');
        return true;
      }
    }
    if (tableName === 'user_tasks') {
      if (Array.isArray(data)) {
        await client.query('BEGIN');
        const existing = await client.query('SELECT id FROM user_tasks');
        const existingIds = new Set(existing.rows.map((r: any) => r.id));
        const newIds = new Set(data.map((d: any) => d.id));

        for (const oldId of existingIds) {
          if (!newIds.has(oldId)) {
            await client.query('DELETE FROM user_tasks WHERE id = $1', [oldId]);
          }
        }

        for (const t of data) {
          await client.query(`
            INSERT INTO user_tasks (id, owner_username, title, description, status, priority, raw_data, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (id) DO UPDATE SET
              owner_username = EXCLUDED.owner_username,
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              status = EXCLUDED.status,
              priority = EXCLUDED.priority,
              raw_data = EXCLUDED.raw_data,
              updated_at = NOW()
          `, [
            t.id,
            t.ownerUsername || 'admin',
            t.title || 'Sem título',
            t.description || '',
            t.status || 'Pendente',
            t.priority || 'P2',
            JSON.stringify(t)
          ]);
        }
        await client.query('COMMIT');
        return true;
      }
    }
    return false;
  } catch (err: any) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
    }
    console.error(`[Neon DB] Erro ao salvar na tabela ${tableName}:`, err?.message || err);
    return false;
  } finally {
    if (client) {
      try { client.release(); } catch (_) {}
    }
  }
}
