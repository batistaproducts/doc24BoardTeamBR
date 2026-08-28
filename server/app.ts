import express from "express";
import path from "path";
import fs from "fs";
import { Pool } from "pg";

// Antonio Batista - SEG_002 - Retorna o Pool de Conexão com o Banco de Dados Neon PostgreSQL
function getDbPool(customConnectionString?: string): Pool {
  const connectionString = customConnectionString || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não configurada nas variáveis de ambiente.");
  }
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
  });

  pool.on('error', (err) => {
    console.error('[Neon DB Pool Error]', err);
  });

  return pool;
}

// Global handlers to prevent unexpected crash on idle client disconnection
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]', reason);
});

// Antonio Batista - SEG_002 - Garante que app_storage exista no Neon
async function ensureAllTables(client: any) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_storage (
      key VARCHAR(100) PRIMARY KEY,
      content TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed usuarios
  const usersCheck = await client.query('SELECT count(*) FROM app_storage WHERE key = $1;', ['usuarios.json']);
  if (parseInt(usersCheck.rows[0].count) === 0) {
    const fpath = path.join(process.cwd(), 'src', 'data', 'usuarios.json');
    if (fs.existsSync(fpath)) {
        const content = fs.readFileSync(fpath, 'utf-8');
        await client.query(
            'INSERT INTO app_storage (key, content, updated_at) VALUES ($1, $2, NOW());',
            ['usuarios.json', content]
        );
    }
  }
}

// Antonio Batista - SEG_002 - Retorna o cabeçalho de autorização correto de acordo com o tipo de Personal Access Token do GitHub.
function getAuthHeader(token: string): string {
  const trimmed = token ? token.trim() : "";
  if (trimmed.startsWith('github_pat_')) {
    return `Bearer ${trimmed}`;
  }
  return `token ${trimmed}`;
}

// Antonio Batista - SEG_002 - Executa requisição HTTP com mecanismo de retry robusto.
async function fetchWithRetry(url: string, options?: RequestInit, maxRetries = 6): Promise<Response> {
  let attempt = 0;
  let lastError: any = null;
  while (attempt < maxRetries) {
    attempt++;
    try {
      const response = await fetch(url, options);
      if (response && (response.ok || response.status === 404)) {
        return response;
      }
      if (attempt >= maxRetries) {
        return response;
      }
    } catch (err: any) {
      lastError = err;
      if (attempt >= maxRetries) {
        console.warn(`[Fetch Retry] All ${maxRetries} attempts failed for ${url}: ${err.message || err}`);
        throw err;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 400 * attempt));
  }
  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} attempts`);
}

// Antonio Batista - SEG_002 - Carrega as configurações de integração com o GitHub salvas localmente no disco ou via variáveis de ambiente.
export function loadDiskGitHubConfig() {
  try {
    const configPath = path.join(process.cwd(), 'src', 'data', 'github_config.json');
    let diskConfig: any = {};
    if (fs.existsSync(configPath)) {
      diskConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    
    const envToken = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN;
    const envOwner = process.env.GITHUB_OWNER || process.env.VITE_GITHUB_OWNER;
    const envRepo = process.env.GITHUB_REPO || process.env.VITE_GITHUB_REPO;
    const envBranch = process.env.GITHUB_BRANCH || process.env.VITE_GITHUB_BRANCH;

    return {
      token: (envToken && envToken.trim()) || diskConfig.token || "",
      owner: (envOwner && envOwner.trim()) || diskConfig.owner || "",
      repo: (envRepo && envRepo.trim()) || diskConfig.repo || "",
      branch: (envBranch && envBranch.trim()) || diskConfig.branch || "main",
      enabled: diskConfig.enabled !== false
    };
  } catch (err: any) {
    console.warn("Failed to read github_config.json or GITHUB_TOKEN:", err.message);
  }
  return null;
}

// Antonio Batista - SEG_002 - Verifica se uma string de token está mascarada.
export function isMaskedToken(token: string | undefined | null): boolean {
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
export function resolveToken(providedToken?: string): string {
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

  // Setup JSON parsing body limit with serverless pre-parsed body safety
  app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      return next();
    }
    express.json({ limit: '10mb' })(req, res, next);
  });

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
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Diagnostic Endpoint for keys
  app.get(["/api/db/debug/keys", "/db/debug/keys"], async (req, res) => {
    try {
      const pool = getDbPool();
      const client = await pool.connect();
      const resKeys = await client.query('SELECT key FROM app_storage;');
      client.release();
      await pool.end();
      res.json(resKeys.rows.map(r => r.key));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Endpoint to sync files from src/data to app_storage
  app.post(["/api/db/sync_files_to_db", "/db/sync_files_to_db", "api/db/sync_files_to_db", "db/sync_files_to_db"], async (req, res) => {
    let pool: Pool | null = null;
    try {
      const dataDir = path.join(process.cwd(), 'src', 'data');
      if (!fs.existsSync(dataDir)) {
        return res.status(404).json({ error: "Diretório src/data não encontrado" });
      }

      const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
      pool = getDbPool();
      const client = await pool.connect();
      
      const updatedKeys: string[] = [];
      for (const fname of files) {
        const content = fs.readFileSync(path.join(dataDir, fname), 'utf-8');
        await client.query(
          'INSERT INTO app_storage (key, content, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET content = $2, updated_at = NOW();',
          [fname, content]
        );
        updatedKeys.push(fname);
      }
      
      client.release();
      await pool.end();
      
      return res.json({ success: true, updated: updatedKeys });
    } catch (err: any) {
      if (pool) {
        try { await pool.end(); } catch (_) {}
      }
      return res.status(500).json({ error: err.message });
    }
  });

  // Proxy GitHub Connection Test

  app.post("/api/github/test", async (req, res) => {
    try {
      const diskConfig = loadDiskGitHubConfig();
      const token = resolveToken(req.body.token);
      const owner = (req.body.owner || diskConfig?.owner || "").trim();
      const repo = (req.body.repo || diskConfig?.repo || "").trim();

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
            // Also write to local disk if possible
            try {
              const dataDir = path.join(process.cwd(), 'src', 'data');
              if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
              fs.writeFileSync(path.join(dataDir, fileName), content, 'utf-8');
            } catch (_) {}
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

  // Sync endpoint - Reads all JSON files from disk
  app.get("/api/sync", async (req, res) => {
    try {
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
  app.get("/api/files", (req, res) => {
    try {
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

  // Save/Overwrite a JSON file to disk and optionally push to GitHub
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
          return res.json({ success: true });
        } catch (e) {
          return res.status(400).json({ error: 'Configuração do GitHub inválida.' });
        }
      }

      if (!/^[a-zA-Z0-9_\-\.]+\.json$/.test(filename)) {
        return res.status(400).json({ error: 'Nome de arquivo inválido.' });
      }

      // Write to disk
      try {
        const dataDir = path.join(process.cwd(), 'src', 'data');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        const filePath = path.join(dataDir, filename);
        fs.writeFileSync(filePath, content, 'utf-8');
      } catch (err: any) {
        console.warn(`[Data Store] Aviso gravação em disco para ${filename}:`, err?.message || err);
      }

      // If GitHub is enabled, push in background/async
      const diskConfig = loadDiskGitHubConfig();
      if (diskConfig && diskConfig.enabled && diskConfig.token && diskConfig.owner && diskConfig.repo) {
        enqueueFilePush(filename, async () => {
          try {
            const filePath = `src/data/${filename}`;
            const url = `https://api.github.com/repos/${diskConfig.owner}/${diskConfig.repo}/contents/${filePath}`;
            const b64Content = Buffer.from(content, 'utf-8').toString('base64');
            
            // Get SHA
            let sha: string | undefined;
            const getRes = await fetch(`${url}?ref=${diskConfig.branch || 'main'}&_t=${Date.now()}`, {
              cache: 'no-store',
              headers: {
                'Authorization': getAuthHeader(diskConfig.token),
                'Accept': 'application/vnd.github+json',
                'User-Agent': 'Doc24-Board-Team-BR-Server'
              }
            });
            if (getRes.status === 200) {
              const getData: any = await getRes.json();
              sha = getData.sha;
            }
            
            await fetch(url, {
              method: 'PUT',
              headers: {
                'Authorization': getAuthHeader(diskConfig.token),
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Doc24-Board-Team-BR-Server'
              },
              body: JSON.stringify({
                message: `Update ${filename} via Doc24 Board Server`,
                content: b64Content,
                sha,
                branch: diskConfig.branch || 'main'
              })
            });
          } catch (gitErr) {
            console.warn(`[GitHub Push Background] Error pushing ${filename}:`, gitErr);
          }
        });
      }
      
      console.log(`[Data Store] Sucesso ao persistir ${filename}`);
      res.json({ success: true });
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

  // Direct data routes
  app.get("/api/data/:filename", (req, res) => {
    try {
      const { filename } = req.params;
      if (!filename || filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({ error: "Nome de arquivo inválido" });
      }
      const filePath = path.join(process.cwd(), 'src', 'data', filename);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        try {
          return res.json(JSON.parse(content));
        } catch (_) {
          return res.send(content);
        }
      }
      return res.status(404).json({ error: `Arquivo ${filename} não encontrado` });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/data/:filename", (req, res) => {
    try {
      const { filename } = req.params;
      if (!filename || filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({ error: "Nome de arquivo inválido" });
      }
      const dataDir = path.join(process.cwd(), 'src', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const filePath = path.join(dataDir, filename);
      const content = typeof req.body === 'string' ? req.body : JSON.stringify(req.body, null, 2);
      fs.writeFileSync(filePath, content, 'utf-8');
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Neon Database API Endpoints
  app.get(["/api/db/inspect_tables", "/db/inspect_tables"], async (req, res) => {
    let pool: Pool | null = null;
    try {
      pool = getDbPool();
      const client = await pool.connect();
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public';
      `);
      
      const tables = tablesResult.rows.map(r => r.table_name);
      const tableDetails: Record<string, any[]> = {};

      for (const t of tables) {
        try {
          const colResult = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = $1;
          `, [t]);
          tableDetails[t] = colResult.rows;
        } catch (e) {
          tableDetails[t] = [];
        }
      }

      client.release();
      await pool.end();
      return res.json({ success: true, tables, tableDetails });
    } catch (err: any) {
      if (pool) {
        try { await pool.end(); } catch (_) {}
      }
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post(["/api/db/test", "/db/test"], async (req, res) => {
    let pool: Pool | null = null;
    try {
      const connStr = req.body.connectionString;
      pool = getDbPool(connStr);
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as now, version() as version;');
      client.release();
      await pool.end();
      return res.json({
        success: true,
        message: `Conexão com Neon PostgreSQL bem-sucedida! Hora do banco: ${result.rows[0].now}`,
        version: result.rows[0].version
      });
    } catch (err: any) {
      if (pool) {
        try { await pool.end(); } catch (_) {}
      }
      return res.status(500).json({
        success: false,
        error: err.message || 'Erro ao conectar ao banco de dados Neon.'
      });
    }
  });

  // Helper to load all tables from DB into files dictionary
  async function loadAllFilesFromDb(client: any): Promise<Record<string, string>> {
    await ensureAllTables(client);
    const files: Record<string, string> = {};

    const getLocalJson = (fname: string) => {
      const fpath = path.join(process.cwd(), 'src', 'data', fname);
      if (fs.existsSync(fpath)) {
        return fs.readFileSync(fpath, 'utf-8');
      }
      return '[]';
    };

    // 1. usuarios
    const usersRes = await client.query('SELECT * FROM usuarios;');
    if (usersRes.rows.length > 0) {
      const users = usersRes.rows.map((r: any) => r.raw_data ? JSON.parse(r.raw_data) : {
        username: r.username,
        name: r.name,
        email: r.email,
        role: r.role,
        password: r.password,
        avatar: r.avatar,
        preferences: r.preferences
      });
      files['usuarios.json'] = JSON.stringify(users, null, 2);
    } else {
      files['usuarios.json'] = getLocalJson('usuarios.json');
    }

    // 2. periods
    const periodsRes = await client.query('SELECT * FROM periods;');
    if (periodsRes.rows.length > 0) {
      const periods = periodsRes.rows.map((r: any) => r.raw_data ? JSON.parse(r.raw_data) : {
        id: r.id,
        label: r.label,
        startDate: r.start_date,
        endDate: r.end_date,
        isActive: r.is_active,
        isLocked: r.is_locked
      });
      files['periods.json'] = JSON.stringify(periods, null, 2);
    } else {
      files['periods.json'] = getLocalJson('periods.json');
    }

    // 3. atividades per period
    const ativRes = await client.query('SELECT * FROM atividades;');
    if (ativRes.rows.length > 0) {
      const ativByPeriod: Record<string, any[]> = {};
      for (const r of ativRes.rows) {
        const pid = r.period_id || '072026';
        if (!ativByPeriod[pid]) ativByPeriod[pid] = [];
        ativByPeriod[pid].push(r.raw_data ? JSON.parse(r.raw_data) : {
          id: r.id,
          name: r.name,
          jiraOrMovidesk: r.jira_ticket || r.movidesk || '',
          movidesk: r.movidesk,
          owner: r.owner,
          status: r.status,
          category: r.category,
          componente: r.componente,
          versao: r.versao,
          startDate: r.start_date,
          endDate: r.end_date,
          description: r.description,
          notes: r.notes,
          priority: r.type || 'P1',
          subtasks: r.subtasks,
          tags: r.tags
        });
      }
      for (const [pid, list] of Object.entries(ativByPeriod)) {
        files[`atividades_${pid}.json`] = JSON.stringify(list, null, 2);
      }
    } else {
      const dataDir = path.join(process.cwd(), 'src', 'data');
      if (fs.existsSync(dataDir)) {
        const ativFiles = fs.readdirSync(dataDir).filter(f => f.startsWith('atividades_') && f.endsWith('.json'));
        for (const af of ativFiles) {
          files[af] = fs.readFileSync(path.join(dataDir, af), 'utf-8');
        }
      }
    }

    // 4. roles_permissions
    const rolesRes = await client.query('SELECT * FROM roles_permissions;');
    if (rolesRes.rows.length > 0 && rolesRes.rows[0].roles) {
      const rRoles = rolesRes.rows[0].roles;
      files['roles_permissions.json'] = JSON.stringify({ roles: typeof rRoles === 'string' ? JSON.parse(rRoles) : rRoles }, null, 2);
    } else {
      files['roles_permissions.json'] = getLocalJson('roles_permissions.json');
    }

    // 5. lock_status
    const lockRes = await client.query('SELECT * FROM lock_status;');
    if (lockRes.rows.length > 0) {
      const l = lockRes.rows[0];
      files['lock_status.json'] = JSON.stringify({
        locked: l.locked,
        lockedBy: l.locked_by,
        lockedAt: l.locked_at,
        expiresAt: l.expires_at
      }, null, 2);
    } else {
      files['lock_status.json'] = getLocalJson('lock_status.json');
    }

    // 6. refinement
    const refRes = await client.query('SELECT * FROM refinement;');
    if (refRes.rows.length > 0) {
      const refinementData = refRes.rows.map((r: any) => r.raw_data ? JSON.parse(r.raw_data) : {
        id: r.id,
        atividade: r.atividade,
        jiraTicket: r.jira_ticket,
        priority: 'P1',
        componente: r.componente,
        estado: r.estado,
        storyPoint: r.story_point,
        periodId: r.period_id,
        owner: r.responsavel,
        versao: r.versao
      });
      files['refinement.json'] = JSON.stringify(refinementData, null, 2);
    } else {
      files['refinement.json'] = getLocalJson('refinement.json');
    }

    // 7. planning
    const planRes = await client.query('SELECT * FROM planning;');
    if (planRes.rows.length > 0) {
      const planningData = planRes.rows.map((r: any) => r.raw_data ? JSON.parse(r.raw_data) : {
        id: r.id,
        atividade: r.atividade,
        jiraTicket: r.jira_ticket,
        priority: 'P1',
        componente: r.componente,
        estado: r.estado,
        storyPoint: r.story_point,
        periodId: r.period_id,
        owner: r.responsavel,
        versao: r.versao
      });
      files['planning.json'] = JSON.stringify(planningData, null, 2);
    } else {
      files['planning.json'] = getLocalJson('planning.json');
    }

    // 8. parameters
    const paramRes = await client.query('SELECT * FROM parameters;');
    if (paramRes.rows.length > 0 && paramRes.rows[0].data) {
      const pData = paramRes.rows[0].data;
      files['parameters.json'] = JSON.stringify(typeof pData === 'string' ? JSON.parse(pData) : pData, null, 2);
    } else {
      files['parameters.json'] = getLocalJson('parameters.json');
    }

    // 9. datas_avisos
    const avisosRes = await client.query('SELECT * FROM datas_avisos;');
    if (avisosRes.rows.length > 0) {
      const feriasDayOffs: any[] = [];
      const ausenciasTemporarias: any[] = [];
      const datasAvisos: any[] = [];
      for (const r of avisosRes.rows) {
        const item = r.raw_data ? JSON.parse(r.raw_data) : {
          id: r.id,
          colaborador: r.colaborador,
          tipo: r.tipo,
          dataInicio: r.data_inicio,
          dataFim: r.data_fim,
          data: r.data,
          observacao: r.observacao,
          motivo: r.motivo,
          status: r.status
        };
        if (r.subtipo === 'ausencia' || r.motivo) {
          ausenciasTemporarias.push(item);
        } else if (r.tipo === 'Férias' || r.tipo === 'DayOff') {
          feriasDayOffs.push(item);
        } else {
          datasAvisos.push(item);
        }
      }
      files['datas_avisos.json'] = JSON.stringify({ feriasDayOffs, ausenciasTemporarias, datasAvisos }, null, 2);
    } else {
      files['datas_avisos.json'] = getLocalJson('datas_avisos.json');
    }

    // 10. timer_presets
    const timerRes = await client.query('SELECT * FROM timer_presets;');
    if (timerRes.rows.length > 0) {
      const timers = timerRes.rows.map((r: any) => r.raw_data ? JSON.parse(r.raw_data) : {
        id: r.id,
        name: r.name,
        durationMinutes: r.duration_minutes,
        category: r.category,
        description: r.description,
        soundAlert: r.sound_alert,
        color: r.color
      });
      files['timer_presets.json'] = JSON.stringify(timers, null, 2);
    } else {
      files['timer_presets.json'] = getLocalJson('timer_presets.json');
    }

    // 11. user_tasks
    const utRes = await client.query('SELECT * FROM user_tasks;');
    if (utRes.rows.length > 0) {
      const tasks = utRes.rows.map((r: any) => r.raw_data ? JSON.parse(r.raw_data) : {
        id: r.id,
        ownerUsername: r.owner_username,
        title: r.title,
        description: r.description,
        status: r.status,
        priority: r.priority
      });
      files['user_tasks.json'] = JSON.stringify(tasks, null, 2);
    } else {
      files['user_tasks.json'] = getLocalJson('user_tasks.json');
    }

    // 12. versionamento
    const versRes = await client.query('SELECT * FROM versionamento;');
    if (versRes.rows.length > 0 && versRes.rows[0].data) {
      const vData = versRes.rows[0].data;
      files['versionamento.json'] = JSON.stringify(typeof vData === 'string' ? JSON.parse(vData) : vData, null, 2);
    } else {
      files['versionamento.json'] = getLocalJson('versionamento.json');
    }

    // 13. github_config
    const ghRes = await client.query('SELECT * FROM github_config;');
    if (ghRes.rows.length > 0 && ghRes.rows[0].config) {
      const gData = ghRes.rows[0].config;
      files['github_config.json'] = JSON.stringify(typeof gData === 'string' ? JSON.parse(gData) : gData, null, 2);
    } else {
      files['github_config.json'] = getLocalJson('github_config.json');
    }

    return files;
  }

  app.get(["/api/db/sync", "/db/sync"], async (req, res) => {
    let pool: Pool | null = null;
    try {
      pool = getDbPool();
      const client = await pool.connect();
      const files = await loadAllFilesFromDb(client);

      for (const [fname, fcontent] of Object.entries(files)) {
        await client.query(
          'INSERT INTO app_storage (key, content, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET content = $2, updated_at = NOW();',
          [fname, fcontent]
        );
      }

      client.release();
      await pool.end();

      return res.json(files);
    } catch (err: any) {
      if (pool) {
        try { await pool.end(); } catch (_) {}
      }
      return res.status(500).json({ error: err.message || 'Erro ao buscar dados do banco de dados Neon.' });
    }
  });

  app.post(["/api/db/files/:filename", "/db/files/:filename"], async (req, res) => {
    let pool: Pool | null = null;
    try {
      const { filename } = req.params;
      if (!filename || filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({ error: "Nome de arquivo inválido" });
      }
      const content = typeof req.body === 'string' ? req.body : JSON.stringify(req.body, null, 2);
      
      pool = getDbPool();
      const client = await pool.connect();
      await ensureAllTables(client);
      
      // 1. Save to app_storage as backup
      await client.query(
        'INSERT INTO app_storage (key, content, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET content = $2, updated_at = NOW();',
        [filename, content]
      );

      // 2. Save to normalized table based on filename
      const parsedData = JSON.parse(content);
      if (filename === 'usuarios.json' && Array.isArray(parsedData)) {
        for (const u of parsedData) {
          await client.query(
            `INSERT INTO usuarios (id, username, name, email, password, role, avatar, preferences, raw_data, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
             ON CONFLICT (username) DO UPDATE SET 
             name = EXCLUDED.name, email = EXCLUDED.email, password = EXCLUDED.password, role = EXCLUDED.role, avatar = EXCLUDED.avatar, preferences = EXCLUDED.preferences, raw_data = EXCLUDED.raw_data, updated_at = NOW();`,
            [u.username || u.id || Math.random().toString(), u.username, u.name, u.email, u.password, u.role, u.avatar, u.preferences ? JSON.stringify(u.preferences) : null, JSON.stringify(u)]
          );
        }
      } else if (filename === 'periods.json' && Array.isArray(parsedData)) {
        for (const p of parsedData) {
          await client.query(
            `INSERT INTO periods (id, label, start_date, end_date, is_active, is_locked, raw_data, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
             ON CONFLICT (id) DO UPDATE SET 
             label = EXCLUDED.label, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, is_active = EXCLUDED.is_active, is_locked = EXCLUDED.is_locked, raw_data = EXCLUDED.raw_data, updated_at = NOW();`,
            [p.id, p.label, p.startDate, p.endDate, p.isActive, p.isLocked, JSON.stringify(p)]
          );
        }
      } else if (filename.startsWith('atividades_') && filename.endsWith('.json') && Array.isArray(parsedData)) {
        const periodId = filename.replace('atividades_', '').replace('.json', '');
        for (const a of parsedData) {
          await client.query(
            `INSERT INTO atividades (id, period_id, name, type, owner, notes, jira_ticket, movidesk, service_request, pr_link, doc_link, componente, versao, status, category, start_date, end_date, description, order_index, subtasks, tags, raw_data, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW())
             ON CONFLICT (id) DO UPDATE SET 
             period_id = EXCLUDED.period_id, name = EXCLUDED.name, type = EXCLUDED.type, owner = EXCLUDED.owner, notes = EXCLUDED.notes, jira_ticket = EXCLUDED.jira_ticket, movidesk = EXCLUDED.movidesk, service_request = EXCLUDED.service_request, pr_link = EXCLUDED.pr_link, doc_link = EXCLUDED.doc_link, componente = EXCLUDED.componente, versao = EXCLUDED.versao, status = EXCLUDED.status, category = EXCLUDED.category, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, description = EXCLUDED.description, order_index = EXCLUDED.order_index, subtasks = EXCLUDED.subtasks, tags = EXCLUDED.tags, raw_data = EXCLUDED.raw_data, updated_at = NOW();`,
            [
              a.id || Math.random().toString(),
              periodId,
              a.name,
              a.priority || a.type,
              a.owner,
              a.notes,
              a.jiraTicket || a.jiraOrMovidesk,
              a.movidesk,
              a.serviceRequest,
              a.prLink,
              a.docLink,
              a.componente,
              a.versao,
              a.status,
              a.category,
              a.startDate,
              a.endDate,
              a.description,
              a.orderIndex || 0,
              a.subtasks ? JSON.stringify(a.subtasks) : null,
              a.tags ? JSON.stringify(a.tags) : null,
              JSON.stringify(a)
            ]
          );
        }
      } else if (filename === 'lock_status.json' && parsedData) {
        await client.query(
          `INSERT INTO lock_status (id, locked, locked_by, locked_at, expires_at, updated_at)
           VALUES ('main', $1, $2, $3, $4, NOW())
           ON CONFLICT (id) DO UPDATE SET 
           locked = EXCLUDED.locked, locked_by = EXCLUDED.locked_by, locked_at = EXCLUDED.locked_at, expires_at = EXCLUDED.expires_at, updated_at = NOW();`,
          [parsedData.locked, parsedData.lockedBy, parsedData.lockedAt, parsedData.expiresAt]
        );
      } else if (filename === 'roles_permissions.json' && parsedData) {
        await client.query(
          `INSERT INTO roles_permissions (id, roles, updated_at)
           VALUES ('main', $1, NOW())
           ON CONFLICT (id) DO UPDATE SET roles = EXCLUDED.roles, updated_at = NOW();`,
          [JSON.stringify(parsedData.roles || parsedData)]
        );
      } else if (filename === 'parameters.json' && parsedData) {
        await client.query(
          `INSERT INTO parameters (id, data, updated_at)
           VALUES ('main', $1, NOW())
           ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`,
          [JSON.stringify(parsedData)]
        );
      } else if (filename === 'versionamento.json' && parsedData) {
        await client.query(
          `INSERT INTO versionamento (id, data, updated_at)
           VALUES ('main', $1, NOW())
           ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`,
          [JSON.stringify(parsedData)]
        );
      } else if (filename === 'github_config.json' && parsedData) {
        await client.query(
          `INSERT INTO github_config (id, config, updated_at)
           VALUES ('main', $1, NOW())
           ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW();`,
          [JSON.stringify(parsedData)]
        );
      } else if (filename === 'timer_presets.json' && Array.isArray(parsedData)) {
        for (const tp of parsedData) {
          await client.query(
            `INSERT INTO timer_presets (id, name, duration_minutes, category, description, sound_alert, color, raw_data, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             ON CONFLICT (id) DO UPDATE SET 
             name = EXCLUDED.name, duration_minutes = EXCLUDED.duration_minutes, category = EXCLUDED.category, description = EXCLUDED.description, sound_alert = EXCLUDED.sound_alert, color = EXCLUDED.color, raw_data = EXCLUDED.raw_data, updated_at = NOW();`,
            [tp.id || Math.random().toString(), tp.name, tp.durationMinutes, tp.category, tp.description, tp.soundAlert, tp.color, JSON.stringify(tp)]
          );
        }
      } else if (filename === 'user_tasks.json' && Array.isArray(parsedData)) {
        for (const ut of parsedData) {
          await client.query(
            `INSERT INTO user_tasks (id, owner_username, title, description, status, priority, raw_data, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
             ON CONFLICT (id) DO UPDATE SET 
             owner_username = EXCLUDED.owner_username, title = EXCLUDED.title, description = EXCLUDED.description, status = EXCLUDED.status, priority = EXCLUDED.priority, raw_data = EXCLUDED.raw_data, updated_at = NOW();`,
            [ut.id || Math.random().toString(), ut.ownerUsername, ut.title, ut.description, ut.status, ut.priority, JSON.stringify(ut)]
          );
        }
      } else if (filename === 'refinement.json' && Array.isArray(parsedData)) {
        for (const ref of parsedData) {
          await client.query(
            `INSERT INTO refinement (id, period_id, atividade, responsavel, estado, versao, componente, story_point, jira_ticket, descricao, raw_data, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
             ON CONFLICT (id) DO UPDATE SET 
             period_id = EXCLUDED.period_id, atividade = EXCLUDED.atividade, responsavel = EXCLUDED.responsavel, estado = EXCLUDED.estado, versao = EXCLUDED.versao, componente = EXCLUDED.componente, story_point = EXCLUDED.story_point, jira_ticket = EXCLUDED.jira_ticket, descricao = EXCLUDED.descricao, raw_data = EXCLUDED.raw_data, updated_at = NOW();`,
            [ref.id || Math.random().toString(), ref.periodId || '072026', ref.atividade, ref.owner || ref.responsavel, ref.estado, ref.versao, ref.componente, ref.storyPoint, ref.jiraTicket, ref.descricao, JSON.stringify(ref)]
          );
        }
      } else if (filename === 'planning.json' && Array.isArray(parsedData)) {
        for (const plan of parsedData) {
          await client.query(
            `INSERT INTO planning (id, period_id, atividade, responsavel, estado, versao, componente, story_point, jira_ticket, descricao, raw_data, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
             ON CONFLICT (id) DO UPDATE SET 
             period_id = EXCLUDED.period_id, atividade = EXCLUDED.atividade, responsavel = EXCLUDED.responsavel, estado = EXCLUDED.estado, versao = EXCLUDED.versao, componente = EXCLUDED.componente, story_point = EXCLUDED.story_point, jira_ticket = EXCLUDED.jira_ticket, descricao = EXCLUDED.descricao, raw_data = EXCLUDED.raw_data, updated_at = NOW();`,
            [plan.id || Math.random().toString(), plan.periodId || '072026', plan.atividade, plan.owner || plan.responsavel, plan.estado, plan.versao, plan.componente, plan.storyPoint, plan.jiraTicket, plan.descricao, JSON.stringify(plan)]
          );
        }
      } else if (filename === 'datas_avisos.json' && parsedData) {
        const items = [...(parsedData.feriasDayOffs || []), ...(parsedData.ausenciasTemporarias || []), ...(parsedData.datasAvisos || [])];
        for (const item of items) {
          await client.query(
            `INSERT INTO datas_avisos (id, tipo, colaborador, subtipo, data_inicio, data_fim, data, hora_inicio, hora_fim, status, observacao, motivo, versao, componente, link, related_tasks, raw_data, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
             ON CONFLICT (id) DO UPDATE SET 
             tipo = EXCLUDED.tipo, colaborador = EXCLUDED.colaborador, subtipo = EXCLUDED.subtipo, data_inicio = EXCLUDED.data_inicio, data_fim = EXCLUDED.data_fim, data = EXCLUDED.data, hora_inicio = EXCLUDED.hora_inicio, hora_fim = EXCLUDED.hora_fim, status = EXCLUDED.status, observacao = EXCLUDED.observacao, motivo = EXCLUDED.motivo, versao = EXCLUDED.versao, componente = EXCLUDED.componente, link = EXCLUDED.link, related_tasks = EXCLUDED.related_tasks, raw_data = EXCLUDED.raw_data, updated_at = NOW();`,
            [
              item.id || Math.random().toString(),
              item.tipo || 'Aviso',
              item.colaborador,
              item.subtipo,
              item.dataInicio,
              item.dataFim,
              item.data,
              item.horaInicio,
              item.horaFim,
              item.status,
              item.observacao,
              item.motivo,
              item.versao,
              item.componente,
              item.link,
              item.relatedTasks ? JSON.stringify(item.relatedTasks) : null,
              JSON.stringify(item)
            ]
          );
        }
      }

      client.release();
      await pool.end();

      return res.json({ success: true });
    } catch (err: any) {
      if (pool) {
        try { await pool.end(); } catch (_) {}
      }
      return res.status(500).json({ error: err.message || 'Erro ao salvar no banco de dados Neon.' });
    }
  });

  app.post(["/api/db/login", "/db/login"], async (req, res) => {
    let pool: Pool | null = null;
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, error: "Usuário e senha são obrigatórios." });
      }

      // 1. Abrir conexão com Neon
      pool = getDbPool();
      const client = await pool.connect();
      await ensureAllTables(client);

      // 2. Validar login
      const storageRes = await client.query('SELECT content FROM app_storage WHERE key = $1;', ['usuarios.json']);
      
      if (storageRes.rows.length === 0) {
        client.release();
        await pool.end();
        return res.status(401).json({ success: false, error: "Usuário não encontrado (storage não configurado)." });
      }

      const users = JSON.parse(storageRes.rows[0].content);
      const foundUser = users.find((u: any) => u.username.toLowerCase() === username.trim().toLowerCase());

      if (!foundUser) {
        client.release();
        await pool.end();
        return res.status(401).json({ success: false, error: "Usuário não encontrado." });
      }

      const salt = "btb_doc24_";
      const salted = salt + password.split('').reverse().join('');
      const hashedPassword = Buffer.from(salted).toString('base64');

      if (foundUser.password === password.trim() || foundUser.password === hashedPassword) {
        client.release();
        await pool.end();

        const { password: _, ...userWithoutPassword } = foundUser;
        // 3. Se válido, avançar para o board de atividades
        return res.json({ success: true, user: userWithoutPassword });
      } else {
        client.release();
        await pool.end();
        // 4. Se não válida, recusar login
        return res.status(401).json({ success: false, error: "Senha incorreta no Banco de Dados Neon." });
      }
    } catch (err: any) {
      if (pool) {
        try { await pool.end(); } catch (_) {}
      }
      return res.status(500).json({ success: false, error: err.message || 'Erro ao processar login no banco de dados Neon.' });
    }
  });

  app.post(["/api/db/seed_from_github", "/db/seed_from_github"], async (req, res) => {
    let pool: Pool | null = null;
    try {
      const dataDir = path.join(process.cwd(), 'src', 'data');
      if (!fs.existsSync(dataDir)) {
        return res.status(404).json({ error: 'Diretório de dados não encontrado.' });
      }
      const filenames = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && f !== 'github_config.json');
      
      pool = getDbPool();
      const client = await pool.connect();
      await ensureAllTables(client);
      
      let count = 0;
      for (const fname of filenames) {
        const fpath = path.join(dataDir, fname);
        const content = fs.readFileSync(fpath, 'utf-8');
        await client.query(
          'INSERT INTO app_storage (key, content, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET content = $2, updated_at = NOW();',
          [fname, content]
        );
        count++;
      }
      client.release();
      await pool.end();

      return res.json({ success: true, message: `${count} arquivos JSON importados com sucesso para o banco de dados Neon!` });
    } catch (err: any) {
      if (pool) {
        try { await pool.end(); } catch (_) {}
      }
      return res.status(500).json({ error: err.message || 'Erro ao importar dados para o banco Neon.' });
    }
  });

  app.post(["/api/db/push_to_github", "/db/push_to_github"], async (req, res) => {
    let pool: Pool | null = null;
    try {
      pool = getDbPool();
      const client = await pool.connect();
      await ensureAllTables(client);
      const result = await client.query('SELECT key, content FROM app_storage;');
      client.release();
      await pool.end();

      const dataDir = path.join(process.cwd(), 'src', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      let count = 0;
      for (const row of result.rows) {
        const fpath = path.join(dataDir, row.key);
        fs.writeFileSync(fpath, row.content, 'utf-8');
        count++;
      }

      return res.json({ success: true, message: `${count} registros do banco Neon salvos com sucesso nos arquivos JSON locais!` });
    } catch (err: any) {
      if (pool) {
        try { await pool.end(); } catch (_) {}
      }
      return res.status(500).json({ error: err.message || 'Erro ao exportar do banco Neon para o GitHub.' });
    }
  });

  // Global API 404 handler
  app.use('/api', (req, res) => {
    if (!res.headersSent) {
      res.status(404).json({
        success: false,
        message: `Rota da API não encontrada: ${req.method} ${req.originalUrl || req.url}`,
        error: 'Not Found'
      });
    }
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Server Unhandled Error]', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: err?.message || 'Erro interno no servidor.',
        error: err?.message || 'Internal Server Error'
      });
    }
  });

  return app;
}
