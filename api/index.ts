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
      if (req.body && typeof req.body === 'object') {
        overrideUrl = req.body.connectionString;
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
              if (items && items.length > 0) return sendJson(200, items);
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
            } else if (filename === 'datas_avisos.json' && Array.isArray(bodyContent)) {
              savedToDb = await saveDatasAvisosToDb(bodyContent);
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

    // 5. Rota de fallback através do Express App
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
