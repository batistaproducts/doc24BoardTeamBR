import express from "express";
import path from "path";
import fs from "fs";
import {
  getDbPool,
  initSchema,
  seedDatabaseFromJson,
  testDbConnection,
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
} from "./db";

// Antonio Batista - SEG_002 - Retorna o cabeçalho de autorização correto de acordo com o tipo de Personal Access Token do GitHub.
function getAuthHeader(token: string): string {
  const trimmed = token ? token.trim() : "";
  if (trimmed.startsWith('github_pat_')) {
    return `Bearer ${trimmed}`;
  }
  return `token ${trimmed}`;
}

// Antonio Batista - SEG_002 - Executa requisição HTTP com mecanismo de retry.
async function fetchWithRetry(url: string, options?: RequestInit, maxRetries = 4): Promise<Response> {
  let attempt = 0;
  let lastError: any = null;
  while (attempt < maxRetries) {
    attempt++;
    try {
      const response = await fetch(url, options);
      return response;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Fetch Retry] Attempt ${attempt}/${maxRetries} failed for ${url}: ${err.message || err}`);
      if (attempt >= maxRetries) {
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, 300 * attempt));
    }
  }
  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} attempts`);
}

// Antonio Batista - SEG_002 - Carrega as configurações de integração com o GitHub salvas localmente no disco.
function loadDiskGitHubConfig() {
  try {
    const configPath = path.join(process.cwd(), 'src', 'data', 'github_config.json');
    let diskConfig: any = {};
    if (fs.existsSync(configPath)) {
      diskConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    
    const envToken = process.env.GITHUB_TOKEN;

    return {
      token: (envToken && envToken.trim()) || diskConfig.token || "",
      owner: diskConfig.owner || "",
      repo: diskConfig.repo || "",
      branch: diskConfig.branch || "main",
      enabled: diskConfig.enabled !== false
    };
  } catch (err: any) {
    console.warn("Failed to read github_config.json or GITHUB_TOKEN:", err.message);
  }
  return null;
}

// Antonio Batista - SEG_002 - Verifica se uma string de token está mascarada.
function isMaskedToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const trimmed = token.trim();
  if (!trimmed) return false;
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

// Antonio Batista - SEG_002 - Resolve o token real do GitHub.
function resolveToken(providedToken?: string): string {
  const diskConfig = loadDiskGitHubConfig();
  const trimmed = (providedToken || "").trim();
  if (!trimmed || isMaskedToken(trimmed)) {
    return diskConfig?.token || "";
  }
  return trimmed;
}

const filePushQueues = new Map<string, Promise<any>>();

function enqueueFilePush(fileName: string, pushTask: () => Promise<any>): Promise<any> {
  const previous = filePushQueues.get(fileName) || Promise.resolve();
  const current = previous.catch(() => {}).then(() => pushTask());
  filePushQueues.set(fileName, current);
  return current;
}

export function createApp(): express.Express {
  const app = express();

  // Setup JSON parsing body limit
  app.use(express.json({ limit: '10mb' }));

  // CORS headers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Endpoint de status e diagnóstico da conexão com o Neon
  app.get("/api/db/status", async (req, res) => {
    try {
      const status = await testDbConnection();
      res.json(status);
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // Endpoint de migração manual/forçada dos arquivos JSON locais para o Neon
  app.post("/api/db/migrate", async (req, res) => {
    try {
      const force = req.body?.force === true;
      const result = await seedDatabaseFromJson(force);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // Proxy GitHub Connection Test
  app.post("/api/github/test", async (req, res) => {
    try {
      const diskConfig = loadDiskGitHubConfig();
      const token = resolveToken(req.body.token);
      const owner = (req.body.owner || diskConfig?.owner || "").trim();
      const repo = (req.body.repo || diskConfig?.repo || "").trim();
      const branch = (req.body.branch || diskConfig?.branch || "main").trim();

      if (!token || !owner || !repo) {
        return res.status(400).json({ error: "Parâmetros insuficientes para o teste. Token, Dono ou Repositório não configurados." });
      }

      const url = `https://api.github.com/repos/${owner}/${repo}`;
      const response = await fetchWithRetry(url, {
        headers: {
          'Authorization': getAuthHeader(token),
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Doc24-Board-Team-BR-Server'
        }
      });

      if (response.ok) {
        res.json({ success: true, message: "Conexão com o GitHub efetuada com sucesso pelo servidor!" });
      } else {
        const text = await response.text();
        let rawMsg = text;
        try {
          const parsed = JSON.parse(text);
          rawMsg = parsed.message || text;
        } catch (_) {}

        let errorMsg = `Erro ${response.status} de autenticação com o GitHub: ${rawMsg}.`;
        if (response.status === 403) {
          errorMsg = `Erro 403 (Proibido) retornado pelo GitHub: ${rawMsg}. Verifique as permissões do seu Token.`;
        } else if (response.status === 404) {
          errorMsg = `Erro 404 (Não Encontrado) retornado pelo GitHub: ${rawMsg}. Verifique Dono e Repositório.`;
        } else if (response.status === 401) {
          errorMsg = `Erro 401 (Não Autorizado) retornado pelo GitHub: ${rawMsg}. Token inválido ou expirado.`;
        }

        res.status(response.status).json({ error: errorMsg });
      }
    } catch (error: any) {
      console.error("Error in /api/github/test:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Diagnostic Endpoint
  app.post("/api/github/diagnostic", async (req, res) => {
    try {
      const diskConfig = loadDiskGitHubConfig();
      const token = resolveToken(req.body.token);
      const owner = (req.body.owner || diskConfig?.owner || "").trim();
      const repo = (req.body.repo || diskConfig?.repo || "").trim();
      const branch = (req.body.branch || diskConfig?.branch || "main").trim();

      const serverDiskConfigPath = path.join(process.cwd(), 'src', 'data', 'github_config.json');
      const serverDiskConfigExists = fs.existsSync(serverDiskConfigPath);
      let serverDiskConfigEnabled = false;
      if (serverDiskConfigExists && diskConfig) {
        serverDiskConfigEnabled = diskConfig.enabled;
      }

      if (!token || !owner || !repo) {
        return res.json({
          success: false,
          error: "Parâmetros insuficientes para diagnóstico. Certifique-se de preencher Token, Dono e Repositório.",
          serverDisk: {
            configExists: serverDiskConfigExists,
            enabled: serverDiskConfigEnabled
          }
        });
      }

      const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
      const repoResponse = await fetchWithRetry(repoUrl, {
        headers: {
          'Authorization': getAuthHeader(token),
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Doc24-Board-Team-BR-Server'
        }
      });

      const scopesHeader = repoResponse.headers.get('x-oauth-scopes') || "Não disponível";
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

        return res.json({
          success: false,
          error: `Falha na conexão com o repositório (${repoResponse.status}): ${rawMsg}`,
          connection: { success: false, status: repoResponse.status, message: rawMsg },
          rateLimit: {
            limit: rateLimitLimit ? parseInt(rateLimitLimit, 10) : null,
            remaining: rateLimitRemaining ? parseInt(rateLimitRemaining, 10) : null,
            resetTime: rateLimitReset ? new Date(parseInt(rateLimitReset, 10) * 1000).toISOString() : null
          },
          serverDisk: { configExists: serverDiskConfigExists, enabled: serverDiskConfigEnabled }
        });
      }

      const repoData = await repoResponse.json();
      const permissions = repoData.permissions || { admin: false, push: false, pull: false };
      const isPrivate = repoData.private;
      const defaultBranch = repoData.default_branch;

      res.json({
        success: true,
        connection: { success: true, status: 200, message: "Conectado com sucesso" },
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
        repoState: { isPrivate, defaultBranch },
        serverDisk: { configExists: serverDiskConfigExists, enabled: serverDiskConfigEnabled }
      });
    } catch (error: any) {
      console.error("Error in /api/github/diagnostic:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Config status
  app.get("/api/github/config/status", (req, res) => {
    try {
      const diskConfig = loadDiskGitHubConfig();
      if (!diskConfig) {
        return res.json({ configured: false });
      }
      const hasToken = !!diskConfig.token;
      const maskedToken = hasToken ? `${diskConfig.token.substring(0, 4)}...${diskConfig.token.substring(diskConfig.token.length - 4)}` : "";
      res.json({
        configured: true,
        enabled: diskConfig.enabled,
        owner: diskConfig.owner,
        repo: diskConfig.repo,
        branch: diskConfig.branch,
        hasToken,
        maskedToken
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Handler for GitHub Push
  const handlePushRequest = async (req: express.Request, res: express.Response) => {
    try {
      const diskConfig = loadDiskGitHubConfig();
      const token = resolveToken(req.body.token);
      const owner = req.body.owner || diskConfig?.owner;
      const repo = req.body.repo || diskConfig?.repo;
      const branch = req.body.branch || diskConfig?.branch || "main";
      const { fileName, content } = req.body;

      if (!token || !owner || !repo || !fileName || !content) {
        return res.status(400).json({ error: "Parâmetros insuficientes para o push. Configure o GitHub primeiro." });
      }

      await enqueueFilePush(fileName, async () => {
        const filePath = `src/data/${fileName}`;
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

        let attempts = 0;
        const maxAttempts = 8;
        let lastPutStatus = 0;
        let lastPutErrorText = "";
        let overrideSha: string | undefined = undefined;

        while (attempts < maxAttempts) {
          attempts++;
          let sha: string | undefined = overrideSha;
          overrideSha = undefined;

          if (!sha) {
            const cacheBuster = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
            const getRes = await fetch(`${url}?ref=${branch}&_cb=${cacheBuster}`, {
              cache: 'no-store',
              headers: {
                'Authorization': getAuthHeader(token),
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'Doc24-Board-Team-BR-Server',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
              }
            });

            if (getRes.status === 200) {
              const getData: any = await getRes.json();
              sha = getData.sha;
            } else if (getRes.status !== 404) {
              const getErrText = await getRes.text();
              if (attempts === maxAttempts) {
                res.status(getRes.status).json({ error: `Erro ${getRes.status} ao consultar arquivo no GitHub: ${getErrText}` });
                return;
              }
              await new Promise(resolve => setTimeout(resolve, 500 * attempts));
              continue;
            }
          }

          const b64Content = Buffer.from(content, 'utf-8').toString('base64');
          const putRes = await fetch(url, {
            method: 'PUT',
            headers: {
              'Authorization': getAuthHeader(token),
              'Accept': 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
              'User-Agent': 'Doc24-Board-Team-BR-Server',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: `Update ${fileName} via Doc24 Board Server`,
              content: b64Content,
              sha,
              branch
            })
          });

          if (putRes.ok) {
            console.log(`[GitHub Push] Successfully committed ${fileName} to GitHub on attempt ${attempts}`);
            res.json({ success: true });
            return;
          }

          lastPutStatus = putRes.status;
          lastPutErrorText = await putRes.text();

          if (lastPutStatus === 409) {
            try {
              const parsed = JSON.parse(lastPutErrorText);
              const msg = parsed.message || "";
              const isAtMatch = msg.match(/is at ([a-f0-9]{40})/i);
              if (isAtMatch && isAtMatch[1]) {
                overrideSha = isAtMatch[1];
              }
            } catch (_) {
              overrideSha = undefined;
            }
            await new Promise(resolve => setTimeout(resolve, 400 * attempts));
          } else {
            if (lastPutStatus === 401 || lastPutStatus === 403 || lastPutStatus === 404) {
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 600 * attempts));
          }
        }

        res.status(lastPutStatus || 500).json({ error: `Erro ${lastPutStatus} ao realizar commit: ${lastPutErrorText}` });
      });
    } catch (error: any) {
      console.error("Error pushing to GitHub:", error);
      res.status(500).json({ error: error.message });
    }
  };

  // Handler for GitHub Pull
  const handlePullRequest = async (req: express.Request, res: express.Response) => {
    try {
      const diskConfig = loadDiskGitHubConfig();
      const token = resolveToken(req.body.token);
      const owner = req.body.owner || diskConfig?.owner;
      const repo = req.body.repo || diskConfig?.repo;
      const branch = req.body.branch || diskConfig?.branch || "main";

      if (!token || !owner || !repo) {
        return res.status(400).json({ error: "Parâmetros insuficientes para o pull. Configure o GitHub primeiro." });
      }

      const url = `https://api.github.com/repos/${owner}/${repo}/contents/src/data?ref=${branch}&_t=${Date.now()}`;
      const response = await fetchWithRetry(url, {
        cache: 'no-store',
        headers: {
          'Authorization': getAuthHeader(token),
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Doc24-Board-Team-BR-Server'
        }
      });

      if (response.status === 404) {
        return res.json({ success: true, message: "Pasta src/data não encontrada no repositório GitHub.", files: {} });
      }

      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({ error: `Erro ${response.status} ao listar dados no GitHub: ${text}` });
      }

      const contents = await response.json();
      if (!Array.isArray(contents)) {
        return res.status(500).json({ error: "Retorno da API do GitHub para src/data não é um diretório válido." });
      }

      const dataDir = path.join(process.cwd(), 'src', 'data');
      if (!fs.existsSync(dataDir)) {
        try { fs.mkdirSync(dataDir, { recursive: true }); } catch (_) {}
      }

      const filesResult: Record<string, string> = {};

      for (const item of contents) {
        if (item.type === 'file' && item.name.endsWith('.json') && item.name !== 'lock_status.json' && item.name !== 'github_config.json') {
          const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${item.path}?ref=${branch}&_t=${Date.now()}`;
          try {
            const fileRes = await fetchWithRetry(fileUrl, {
              cache: 'no-store',
              headers: {
                'Authorization': getAuthHeader(token),
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'Doc24-Board-Team-BR-Server'
              }
            });

            if (fileRes.ok) {
              const fileData: any = await fileRes.json();
              const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
              try {
                JSON.parse(content);
                const filePath = path.join(dataDir, item.name);
                try { fs.writeFileSync(filePath, content, 'utf-8'); } catch (_) {}
                filesResult[item.name] = content;
              } catch (_) {}
            }
          } catch (_) {}
        }
      }

      res.json({ success: true, files: filesResult });
    } catch (error: any) {
      console.error("Error pulling from GitHub:", error);
      res.status(500).json({ error: error.message });
    }
  };

  const handlePullLockRequest = async (req: express.Request, res: express.Response) => {
    try {
      const diskConfig = loadDiskGitHubConfig();
      if (!diskConfig || !diskConfig.enabled) {
        return res.status(400).json({ error: "GitHub não está habilitado ou configurado." });
      }
      const { token, owner, repo, branch = "main" } = diskConfig;
      if (!token || !owner || !repo) {
        return res.status(400).json({ error: "GitHub não está totalmente configurado." });
      }
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/src/data/lock_status.json?ref=${branch}&_t=${Date.now()}`;
      const fileRes = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Authorization': getAuthHeader(token),
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Doc24-Board-Team-BR-Server'
        }
      });

      if (fileRes.ok) {
        const fileData: any = await fileRes.json();
        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        try {
          const parsed = JSON.parse(content);
          return res.json({ success: true, lockStatus: parsed });
        } catch (_) {
          return res.status(500).json({ error: "lock_status.json tem formato inválido." });
        }
      } else if (fileRes.status === 404) {
        return res.json({ success: true, lockStatus: { locked: false, lockedBy: null, lockedAt: null, expiresAt: null } });
      } else {
        const errText = await fileRes.text();
        return res.status(fileRes.status).json({ error: `Erro HTTP ${fileRes.status}: ${errText}` });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  app.post("/api/github/push", handlePushRequest);
  app.post("/api/github/pull", handlePullRequest);
  app.post("/api/sync/publish", handlePushRequest);
  app.post("/api/sync/pull", handlePullRequest);
  app.post("/api/sync/pull_lock", handlePullLockRequest);

  // Sync endpoint - Reads all tables from Neon DB or fallback to disk
  app.get("/api/sync", async (req, res) => {
    try {
      const db = getDbPool();
      if (db) {
        const result: Record<string, string> = {};
        
        // 1. Periods
        const periods = await getPeriodsFromDb();
        result['periods.json'] = JSON.stringify(periods, null, 2);

        // 2. Atividades do board agrupadas por period_id
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

        // 3. Datas e Avisos
        const datasAvisos = await getDatasAvisosFromDb();
        result['datas_avisos.json'] = JSON.stringify(datasAvisos, null, 2);

        // 4. Planning & Refinement
        const planning = await getGenericFromDb('planning');
        if (planning) result['planning.json'] = JSON.stringify(planning, null, 2);

        const refinement = await getGenericFromDb('refinement');
        if (refinement) result['refinement.json'] = JSON.stringify(refinement, null, 2);

        // 5. Parâmetros
        const parameters = await getGenericFromDb('parameters');
        if (parameters) result['parameters.json'] = JSON.stringify(parameters, null, 2);

        // 6. Roles & Permissions
        const roles = await getGenericFromDb('roles_permissions');
        if (roles) result['roles_permissions.json'] = JSON.stringify(roles, null, 2);

        // 7. Presets de Cronômetro
        const timerPresets = await getGenericFromDb('timer_presets');
        if (timerPresets) result['timer_presets.json'] = JSON.stringify(timerPresets, null, 2);

        // 8. Tarefas de Usuário
        const userTasks = await getGenericFromDb('user_tasks');
        if (userTasks) result['user_tasks.json'] = JSON.stringify(userTasks, null, 2);

        // 9. Versionamento
        const versionamento = await getGenericFromDb('versionamento');
        if (versionamento) result['versionamento.json'] = JSON.stringify(versionamento, null, 2);

        // 10. Lock Status
        const lockStatus = await getGenericFromDb('lock_status');
        if (lockStatus) result['lock_status.json'] = JSON.stringify(lockStatus, null, 2);

        // 11. Usuários
        const usuarios = await getUsuariosFromDb();
        if (usuarios && usuarios.length > 0) {
          result['usuarios.json'] = JSON.stringify(usuarios, null, 2);
        }

        return res.json(result);
      }

      // Fallback para arquivos locais em disco
      const dataDir = path.join(process.cwd(), 'src', 'data');
      if (!fs.existsSync(dataDir)) {
        try { fs.mkdirSync(dataDir, { recursive: true }); } catch (_) {}
      }
      const files = fs.existsSync(dataDir) ? fs.readdirSync(dataDir) : [];
      const result: Record<string, string> = {};
      const sensitiveFiles = ['github_config.json'];
      
      for (const file of files) {
        if (file.endsWith('.json') && !sensitiveFiles.includes(file)) {
          const filePath = path.join(dataDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          result[file] = content;
        }
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error in /api/sync:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get list of all JSON files
  app.get("/api/files", async (req, res) => {
    try {
      const db = getDbPool();
      if (db) {
        const periods = await getPeriodsFromDb();
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
        periods.forEach(p => fileNames.push(`atividades_${p.id}.json`));
        return res.json(fileNames);
      }

      const dataDir = path.join(process.cwd(), 'src', 'data');
      if (!fs.existsSync(dataDir)) {
        return res.json([]);
      }
      const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
      res.json(files);
    } catch (error: any) {
      console.error("Error listing JSON files:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Save/Overwrite a JSON file to Neon Database
  app.post("/api/files/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const { content } = req.body;
      if (typeof content !== 'string') {
        return res.status(400).json({ error: 'O conteúdo deve ser uma string.' });
      }

      if (filename === 'github_config.json') {
        try {
          const newConfig = JSON.parse(content);
          const currentConfig = loadDiskGitHubConfig();
          if (currentConfig && currentConfig.token && (isMaskedToken(newConfig.token) || !newConfig.token?.trim())) {
            newConfig.token = currentConfig.token;
          }
          const sanitizedContent = JSON.stringify(newConfig, null, 2);
          const configPath = path.join(process.cwd(), 'src', 'data', 'github_config.json');
          if (fs.existsSync(path.dirname(configPath))) {
            try { fs.writeFileSync(configPath, sanitizedContent, 'utf-8'); } catch (_) {}
          }
          await saveGenericToDb('github_config', newConfig).catch(() => {});
          return res.json({ success: true });
        } catch (e) {
          return res.status(400).json({ error: 'Configuração do GitHub inválida.' });
        }
      }

      if (!/^[a-zA-Z0-9_\-\.]+\.json$/.test(filename)) {
        return res.status(400).json({ error: 'Nome de arquivo inválido.' });
      }
      
      const parsedData = JSON.parse(content);

      // Persistir no Neon DB prioritariamente
      const db = getDbPool();
      let dbSaved = false;
      if (db) {
        const atvMatch = filename.match(/^atividades_([a-zA-Z0-9]+)\.json$/);
        if (atvMatch) {
          const periodId = atvMatch[1];
          if (Array.isArray(parsedData)) {
            dbSaved = await saveAtividadesToDb(periodId, parsedData);
          }
        } else if (filename === 'datas_avisos.json') {
          dbSaved = await saveDatasAvisosToDb(parsedData);
        } else if (filename === 'periods.json') {
          if (Array.isArray(parsedData)) dbSaved = await savePeriodsToDb(parsedData);
        } else if (filename === 'usuarios.json') {
          if (Array.isArray(parsedData)) dbSaved = await saveUsuariosToDb(parsedData);
        } else if (filename === 'planning.json') {
          dbSaved = await saveGenericToDb('planning', parsedData);
        } else if (filename === 'refinement.json') {
          dbSaved = await saveGenericToDb('refinement', parsedData);
        } else if (filename === 'parameters.json') {
          dbSaved = await saveGenericToDb('parameters', parsedData);
        } else if (filename === 'roles_permissions.json') {
          dbSaved = await saveGenericToDb('roles_permissions', parsedData);
        } else if (filename === 'timer_presets.json') {
          dbSaved = await saveGenericToDb('timer_presets', parsedData);
        } else if (filename === 'user_tasks.json') {
          dbSaved = await saveGenericToDb('user_tasks', parsedData);
        } else if (filename === 'versionamento.json') {
          dbSaved = await saveGenericToDb('versionamento', parsedData);
        } else if (filename === 'lock_status.json') {
          dbSaved = await saveGenericToDb('lock_status', parsedData);
        }

        if (!dbSaved) {
          console.warn(`[Neon DB] Falha ao gravar no banco para ${filename}.`);
        }
      }

      // Réplica em disco se filesystem for gravável
      try {
        const dataDir = path.join(process.cwd(), 'src', 'data');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        const filePath = path.join(dataDir, filename);
        fs.writeFileSync(filePath, content, 'utf-8');
      } catch (_) {}
      
      console.log(`[Data Store] Sucesso ao persistir ${filename} (DB: ${dbSaved})`);
      res.json({ success: true, dbSaved });
    } catch (error: any) {
      console.error(`Error saving file ${req.params.filename}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete a JSON file
  app.delete("/api/files/:filename", (req, res) => {
    try {
      const { filename } = req.params;
      const sensitiveFiles = ['github_config.json', 'usuarios.json', 'roles_permissions.json', 'versionamento.json'];
      if (sensitiveFiles.includes(filename)) {
        return res.status(403).json({ error: 'Acesso negado. Arquivos de sistema não podem ser excluídos.' });
      }

      if (!/^[a-zA-Z0-9_\-\.]+\.json$/.test(filename)) {
        return res.status(400).json({ error: 'Nome de arquivo inválido.' });
      }
      const dataDir = path.join(process.cwd(), 'src', 'data');
      const filePath = path.join(dataDir, filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (_) {}
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return app;
}
