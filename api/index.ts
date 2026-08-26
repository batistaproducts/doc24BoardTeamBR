import {
  testDbConnection,
  seedDatabaseFromJson,
  getDbPool,
  getAtividadesFromDb,
  saveAtividadesToDb,
  getDatasAvisosFromDb,
  saveDatasAvisosToDb,
  getPeriodsFromDb,
  savePeriodsToDb,
  getUsuariosFromDb,
  saveUsuariosToDb,
  getGenericFromDb,
  saveGenericToDb
} from "../server/db";
import { createApp } from "../server/app";
import fs from "fs";
import path from "path";

let cachedApp: any = null;
function getExpressApp() {
  if (!cachedApp) {
    cachedApp = createApp();
  }
  return cachedApp;
}

// Antonio Batista - SEG_002 - Parser universal e seguro do corpo da requisição para ambientes Vercel Serverless
async function parseRequestBody(req: any): Promise<any> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return req.body;
      }
    }
    return req.body;
  }

  // Se req for uma stream não consumida
  if (typeof req.on === 'function' && req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      const chunks: any[] = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const rawText = Buffer.concat(chunks).toString('utf-8');
      if (!rawText || !rawText.trim()) return {};
      try {
        return JSON.parse(rawText);
      } catch {
        return rawText;
      }
    } catch {
      return {};
    }
  }

  return {};
}

// Antonio Batista - SEG_002 - Handler Vercel Serverless otimizado com roteamento direto para alta performance e zero travamentos
export default async function handler(req: any, res: any) {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Garante que o corpo da requisição foi parseado
  req.body = await parseRequestBody(req);

  // Normalização de URL e extração do subpath da rota
  const rawUrl = req.url || '';
  const queryRoute = req.query?.path || req.query?.__route;
  let normalizedPath = '';

  if (queryRoute) {
    const subpath = Array.isArray(queryRoute) ? queryRoute.join('/') : String(queryRoute);
    normalizedPath = subpath.split('?')[0].replace(/^\//, '');
  } else if (rawUrl) {
    const cleanUrl = rawUrl.split('?')[0];
    normalizedPath = cleanUrl.replace(/^\/api\/?/, '').replace(/^\//, '');
  }

  // Helper para responder JSON garantindo finalização
  const sendJson = (statusCode: number, data: any) => {
    res.setHeader('Content-Type', 'application/json');
    return res.status(statusCode).json(data);
  };

  try {
    // 1. Health check
    if (normalizedPath === '' || normalizedPath === 'health') {
      return sendJson(200, { status: "ok", server: "doc24-vercel-serverless", time: new Date().toISOString() });
    }

    // 2. Diagnóstico e Status do Banco de Dados Neon
    if (normalizedPath === 'db/status' || normalizedPath === 'db/test') {
      let overrideUrl: string | undefined = undefined;
      if (req.body && typeof req.body === 'object' && req.body.connectionString) {
        overrideUrl = req.body.connectionString;
      } else if (typeof req.body === 'string' && (req.body.startsWith('postgres') || req.body.startsWith('psql'))) {
        overrideUrl = req.body;
      } else if (req.query && req.query.connectionString) {
        overrideUrl = String(req.query.connectionString);
      }
      const statusResult = await testDbConnection(overrideUrl);
      return sendJson(200, statusResult);
    }

    // 3. Migração de dados locais para o Neon
    if (normalizedPath === 'db/migrate' && req.method === 'POST') {
      const force = req.body?.force === true;
      const migrateResult = await seedDatabaseFromJson(force);
      return sendJson(200, migrateResult);
    }

    // 4. Rotas de dados (/api/data/:filename)
    if (normalizedPath.startsWith('data/')) {
      const filename = normalizedPath.replace(/^data\//, '').trim();
      if (!filename || filename.includes('..') || filename.includes('/')) {
        return sendJson(400, { error: "Nome de arquivo inválido" });
      }

      const pool = getDbPool();

      // GET data
      if (req.method === 'GET') {
        if (pool) {
          try {
            if (filename.startsWith('atividades_') && filename.endsWith('.json')) {
              const periodId = filename.replace('atividades_', '').replace('.json', '');
              const items = await getAtividadesFromDb(periodId);
              if (items && items.length > 0) return sendJson(200, items);
            } else if (filename === 'datas_avisos.json') {
              const items = await getDatasAvisosFromDb();
              if (items && (items.feriasDayOffs?.length || items.ausenciasTemporarias?.length || items.deploys?.length)) return sendJson(200, items);
            } else if (filename === 'periods.json') {
              const items = await getPeriodsFromDb();
              if (items && items.length > 0) return sendJson(200, items);
            } else if (filename === 'usuarios.json') {
              const items = await getUsuariosFromDb();
              if (items && items.length > 0) return sendJson(200, items);
            } else {
              const docName = filename.replace(/\.json$/, '');
              const data = await getGenericFromDb(docName);
              if (data) return sendJson(200, data);
            }
          } catch (dbErr) {
            console.warn(`[Vercel Serverless /api/data/${filename}] Aviso leitura Neon:`, dbErr);
          }
        }

        // Fallback para arquivo em disco se incluído
        const filePath = path.join(process.cwd(), 'src', 'data', filename);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          try {
            return sendJson(200, JSON.parse(content));
          } catch (_) {
            return res.status(200).send(content);
          }
        }

        return sendJson(404, { error: `Arquivo ${filename} não encontrado` });
      }

      // POST data
      if (req.method === 'POST') {
        const bodyContent = req.body;
        if (!bodyContent) {
          return sendJson(400, { error: "Conteúdo do body é obrigatório" });
        }

        let savedToDb = false;
        if (pool) {
          try {
            if (filename.startsWith('atividades_') && filename.endsWith('.json') && Array.isArray(bodyContent)) {
              const periodId = filename.replace('atividades_', '').replace('.json', '');
              savedToDb = await saveAtividadesToDb(periodId, bodyContent);
            } else if (filename === 'datas_avisos.json') {
              savedToDb = await saveDatasAvisosToDb(bodyContent as any);
            } else if (filename === 'periods.json' && Array.isArray(bodyContent)) {
              savedToDb = await savePeriodsToDb(bodyContent);
            } else if (filename === 'usuarios.json' && Array.isArray(bodyContent)) {
              savedToDb = await saveUsuariosToDb(bodyContent);
            } else {
              const docName = filename.replace(/\.json$/, '');
              savedToDb = await saveGenericToDb(docName, bodyContent);
            }
          } catch (dbErr) {
            console.warn(`[Vercel Serverless /api/data/${filename}] Falha ao salvar no Neon:`, dbErr);
          }
        }

        return sendJson(200, {
          success: true,
          message: `Dados gravados com sucesso (${filename})`,
          savedToNeon: savedToDb
        });
      }
    }

    // 5. Rota de sincronização completa (/api/sync)
    if (normalizedPath === 'sync' && req.method === 'GET') {
      const pool = getDbPool();
      if (pool) {
        try {
          const result: Record<string, string> = {};

          // Periods
          const periods = await getPeriodsFromDb();
          result['periods.json'] = JSON.stringify(periods, null, 2);

          // Atividades agrupadas por period_id
          const allAtividades = await getAtividadesFromDb();
          const groupedAtividades: Record<string, any[]> = {};
          for (const atv of allAtividades) {
            const pId = atv.periodId || '072026';
            if (!groupedAtividades[pId]) groupedAtividades[pId] = [];
            groupedAtividades[pId].push(atv);
          }
          for (const p of periods) {
            const atvs = groupedAtividades[p.id] || [];
            result[`atividades_${p.id}.json`] = JSON.stringify(atvs, null, 2);
          }
          for (const [pId, atvs] of Object.entries(groupedAtividades)) {
            if (!result[`atividades_${pId}.json`]) {
              result[`atividades_${pId}.json`] = JSON.stringify(atvs, null, 2);
            }
          }

          // Datas e Avisos
          const datasAvisos = await getDatasAvisosFromDb();
          result['datas_avisos.json'] = JSON.stringify(datasAvisos, null, 2);

          // Coleções genéricas
          const genericCollections = [
            'planning',
            'refinement',
            'parameters',
            'roles_permissions',
            'timer_presets',
            'user_tasks',
            'versionamento',
            'lock_status'
          ];
          for (const col of genericCollections) {
            const data = await getGenericFromDb(col);
            if (data) result[`${col}.json`] = JSON.stringify(data, null, 2);
          }

          // Usuários
          const usuarios = await getUsuariosFromDb();
          if (usuarios && usuarios.length > 0) {
            result['usuarios.json'] = JSON.stringify(usuarios, null, 2);
          }

          return sendJson(200, result);
        } catch (syncDbErr) {
          console.warn('[Vercel Serverless /api/sync] Falha na leitura do banco, caindo para arquivos em disco:', syncDbErr);
        }
      }

      // Fallback para disco
      const dataDir = path.join(process.cwd(), 'src', 'data');
      const result: Record<string, string> = {};
      if (fs.existsSync(dataDir)) {
        const files = fs.readdirSync(dataDir);
        for (const file of files) {
          if (file.endsWith('.json') && file !== 'github_config.json') {
            try {
              result[file] = fs.readFileSync(path.join(dataDir, file), 'utf-8');
            } catch (_) {}
          }
        }
      }
      return sendJson(200, result);
    }

    // 6. Rota de fallback através do Express App
    const expressApp = getExpressApp();
    req.url = normalizedPath ? `/api/${normalizedPath}` : '/api';
    return expressApp(req, res);

  } catch (err: any) {
    console.error('[Vercel Serverless Handler Critical Error]', err);
    return sendJson(500, {
      success: false,
      error: err?.message || 'Internal Server Error',
      stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined
    });
  }
}
