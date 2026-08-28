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
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
}

// Antonio Batista - SEG_002 - Garante que a tabela de armazenamento de arquivos JSON app_storage exista no banco de dados Neon
async function ensureAppStorageTable(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_storage (
      key VARCHAR(100) PRIMARY KEY,
      content TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
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
  app.post("/api/db/test", async (req, res) => {
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

  app.get("/api/db/sync", async (req, res) => {
    let pool: Pool | null = null;
    try {
      pool = getDbPool();
      await ensureAppStorageTable(pool);
      const client = await pool.connect();
      const result = await client.query('SELECT key, content FROM app_storage;');
      client.release();
      await pool.end();

      const files: Record<string, string> = {};
      for (const row of result.rows) {
        files[row.key] = row.content;
      }

      if (Object.keys(files).length === 0) {
        const dataDir = path.join(process.cwd(), 'src', 'data');
        if (fs.existsSync(dataDir)) {
          const filenames = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && f !== 'github_config.json');
          pool = getDbPool();
          await ensureAppStorageTable(pool);
          const seedClient = await pool.connect();
          for (const fname of filenames) {
            const fpath = path.join(dataDir, fname);
            const content = fs.readFileSync(fpath, 'utf-8');
            files[fname] = content;
            await seedClient.query(
              'INSERT INTO app_storage (key, content, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET content = $2, updated_at = NOW();',
              [fname, content]
            );
          }
          seedClient.release();
          await pool.end();
        }
      }

      return res.json(files);
    } catch (err: any) {
      if (pool) {
        try { await pool.end(); } catch (_) {}
      }
      return res.status(500).json({ error: err.message || 'Erro ao buscar dados do banco de dados Neon.' });
    }
  });

  app.post("/api/db/files/:filename", async (req, res) => {
    let pool: Pool | null = null;
    try {
      const { filename } = req.params;
      if (!filename || filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({ error: "Nome de arquivo inválido" });
      }
      const content = typeof req.body === 'string' ? req.body : JSON.stringify(req.body, null, 2);
      
      pool = getDbPool();
      await ensureAppStorageTable(pool);
      const client = await pool.connect();
      await client.query(
        'INSERT INTO app_storage (key, content, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET content = $2, updated_at = NOW();',
        [filename, content]
      );
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

  app.post("/api/db/login", async (req, res) => {
    let pool: Pool | null = null;
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, error: "Usuário e senha são obrigatórios." });
      }

      pool = getDbPool();
      await ensureAppStorageTable(pool);
      const client = await pool.connect();
      const result = await client.query('SELECT content FROM app_storage WHERE key = $1;', ['usuarios.json']);
      client.release();
      await pool.end();

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Tabela de usuários não encontrada no banco de dados Neon." });
      }

      const users = JSON.parse(result.rows[0].content);
      
      const salt = "btb_doc24_";
      const salted = salt + password.split('').reverse().join('');
      const hashedPassword = Buffer.from(salted).toString('base64');

      const foundUser = users.find((u: any) => 
        u.username.toLowerCase() === username.trim().toLowerCase() && 
        (u.password === password.trim() || u.password === hashedPassword)
      );

      if (foundUser) {
        const { password: _, ...userWithoutPassword } = foundUser;
        return res.json({ success: true, user: userWithoutPassword });
      } else {
        return res.status(401).json({ success: false, error: "Usuário ou senha incorretos no Banco de Dados Neon." });
      }
    } catch (err: any) {
      if (pool) {
        try { await pool.end(); } catch (_) {}
      }
      return res.status(500).json({ success: false, error: err.message || 'Erro ao processar login no banco de dados Neon.' });
    }
  });

  app.post("/api/db/seed_from_github", async (req, res) => {
    let pool: Pool | null = null;
    try {
      const dataDir = path.join(process.cwd(), 'src', 'data');
      if (!fs.existsSync(dataDir)) {
        return res.status(404).json({ error: 'Diretório de dados não encontrado.' });
      }
      const filenames = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && f !== 'github_config.json');
      
      pool = getDbPool();
      await ensureAppStorageTable(pool);
      const client = await pool.connect();
      
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

  app.post("/api/db/push_to_github", async (req, res) => {
    let pool: Pool | null = null;
    try {
      pool = getDbPool();
      await ensureAppStorageTable(pool);
      const client = await pool.connect();
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
