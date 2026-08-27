import fs from "fs";
import path from "path";

// Antonio Batista - SEG_002 - Retorna o cabeçalho de autorização correto de acordo com o tipo de Personal Access Token do GitHub.
function getAuthHeader(token: string): string {
  const trimmed = token ? token.trim() : "";
  if (trimmed.startsWith('github_pat_')) {
    return `Bearer ${trimmed}`;
  }
  return `token ${trimmed}`;
}

// Antonio Batista - SEG_002 - Executa requisição HTTP com mecanismo de retry.
async function fetchWithRetry(url: string, options?: RequestInit, maxRetries = 3): Promise<Response> {
  let attempt = 0;
  let lastError: any = null;
  while (attempt < maxRetries) {
    attempt++;
    try {
      const response = await fetch(url, options);
      return response;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Vercel Fetch Retry] Attempt ${attempt}/${maxRetries} failed for ${url}: ${err.message || err}`);
      if (attempt >= maxRetries) {
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, 250 * attempt));
    }
  }
  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} attempts`);
}

// Antonio Batista - SEG_002 - Carrega as configurações de integração com o GitHub salvas localmente no disco ou nas variáveis de ambiente na Vercel.
function getGitHubConfig() {
  try {
    let diskConfig: any = {};
    const possiblePaths = [
      path.join(process.cwd(), 'src', 'data', 'github_config.json'),
      path.join(__dirname, '..', 'src', 'data', 'github_config.json'),
      path.join(__dirname, 'src', 'data', 'github_config.json')
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        try {
          diskConfig = JSON.parse(fs.readFileSync(p, 'utf-8'));
          break;
        } catch (_) {}
      }
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
    console.warn("[Vercel] Failed to read github_config.json:", err.message);
  }
  return null;
}

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

function resolveToken(providedToken?: string): string {
  const config = getGitHubConfig();
  const trimmed = (providedToken || "").trim();
  if (!trimmed || isMaskedToken(trimmed)) {
    return config?.token || "";
  }
  return trimmed;
}

// Helper to find data directory on Vercel
function findDataDir(): string {
  const candidates = [
    path.join(process.cwd(), 'src', 'data'),
    path.join(__dirname, '..', 'src', 'data'),
    path.join(__dirname, 'src', 'data')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(process.cwd(), 'src', 'data');
}

// Antonio Batista - SEG_002 - Handler Vercel Serverless para gerenciamento e sincronização direta com JSON e GitHub
export default async function handler(req: any, res: any) {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse Body if string
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (_) {}
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

  const sendJson = (statusCode: number, data: any) => {
    res.setHeader('Content-Type', 'application/json');
    return res.status(statusCode).json(data);
  };

  try {
    // 1. Health check
    if (normalizedPath === '' || normalizedPath === 'health') {
      return sendJson(200, { status: "ok", server: "doc24-vercel-serverless", time: new Date().toISOString() });
    }

    // 2. GitHub Config Status
    if (normalizedPath === 'github/config/status' && req.method === 'GET') {
      const config = getGitHubConfig();
      if (!config) {
        return sendJson(200, { configured: false });
      }
      const hasToken = !!config.token;
      const maskedToken = hasToken ? `${config.token.substring(0, 4)}...${config.token.substring(config.token.length - 4)}` : "";
      return sendJson(200, {
        configured: true,
        enabled: config.enabled,
        owner: config.owner,
        repo: config.repo,
        branch: config.branch,
        hasToken,
        maskedToken
      });
    }

    // 3. GitHub Test Connection
    if (normalizedPath === 'github/test' && req.method === 'POST') {
      const config = getGitHubConfig();
      const token = resolveToken(body?.token);
      const owner = (body?.owner || config?.owner || "").trim();
      const repo = (body?.repo || config?.repo || "").trim();

      if (!token || !owner || !repo) {
        return sendJson(400, { error: "Parâmetros insuficientes. Token, Dono ou Repositório não configurados." });
      }

      const url = `https://api.github.com/repos/${owner}/${repo}`;
      const response = await fetchWithRetry(url, {
        headers: {
          'Authorization': getAuthHeader(token),
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Doc24-Board-Team-BR-Vercel'
        }
      });

      if (response.ok) {
        return sendJson(200, { success: true, message: "Conexão com o GitHub efetuada com sucesso!" });
      } else {
        const text = await response.text();
        return sendJson(response.status, { error: `Erro ${response.status} de autenticação com o GitHub: ${text}` });
      }
    }

    // 4. GitHub Diagnostic
    if (normalizedPath === 'github/diagnostic' && req.method === 'POST') {
      const config = getGitHubConfig();
      const token = resolveToken(body?.token);
      const owner = (body?.owner || config?.owner || "").trim();
      const repo = (body?.repo || config?.repo || "").trim();

      if (!token || !owner || !repo) {
        return sendJson(200, {
          success: false,
          error: "Parâmetros insuficientes para diagnóstico. Certifique-se de preencher Token, Dono e Repositório.",
          serverDisk: { configExists: !!config, enabled: config?.enabled || false }
        });
      }

      const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
      const repoResponse = await fetchWithRetry(repoUrl, {
        headers: {
          'Authorization': getAuthHeader(token),
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Doc24-Board-Team-BR-Vercel'
        }
      });

      const scopesHeader = repoResponse.headers.get('x-oauth-scopes') || "Não disponível";
      const rateLimitLimit = repoResponse.headers.get('x-ratelimit-limit');
      const rateLimitRemaining = repoResponse.headers.get('x-ratelimit-remaining');
      const rateLimitReset = repoResponse.headers.get('x-ratelimit-reset');

      if (!repoResponse.ok) {
        const text = await repoResponse.text();
        return sendJson(200, {
          success: false,
          error: `Falha na conexão (${repoResponse.status}): ${text}`,
          connection: { success: false, status: repoResponse.status, message: text },
          rateLimit: {
            limit: rateLimitLimit ? parseInt(rateLimitLimit, 10) : null,
            remaining: rateLimitRemaining ? parseInt(rateLimitRemaining, 10) : null,
            resetTime: rateLimitReset ? new Date(parseInt(rateLimitReset, 10) * 1000).toISOString() : null
          },
          serverDisk: { configExists: !!config, enabled: config?.enabled || false }
        });
      }

      const repoData = await repoResponse.json();
      const permissions = repoData.permissions || { admin: false, push: false, pull: false };

      return sendJson(200, {
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
        repoState: { isPrivate: repoData.private, defaultBranch: repoData.default_branch },
        serverDisk: { configExists: !!config, enabled: config?.enabled || false }
      });
    }

    // 5. GitHub Push / Sync Publish
    if ((normalizedPath === 'github/push' || normalizedPath === 'sync/publish') && req.method === 'POST') {
      const config = getGitHubConfig();
      const token = resolveToken(body?.token);
      const owner = body?.owner || config?.owner;
      const repo = body?.repo || config?.repo;
      const branch = body?.branch || config?.branch || "main";
      const fileName = body?.fileName;
      const content = body?.content;

      if (!token || !owner || !repo || !fileName || !content) {
        return sendJson(400, { error: "Parâmetros insuficientes para o push. Configure o GitHub primeiro." });
      }

      const filePath = `src/data/${fileName}`;
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

      let attempts = 0;
      const maxAttempts = 6;
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
              'User-Agent': 'Doc24-Board-Team-BR-Vercel',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });

          if (getRes.status === 200) {
            const getData: any = await getRes.json();
            sha = getData.sha;
          } else if (getRes.status !== 404) {
            const getErrText = await getRes.text();
            if (attempts === maxAttempts) {
              return sendJson(getRes.status, { error: `Erro ${getRes.status} ao consultar arquivo no GitHub: ${getErrText}` });
            }
            await new Promise(resolve => setTimeout(resolve, 300 * attempts));
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
            'User-Agent': 'Doc24-Board-Team-BR-Vercel',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `Update ${fileName} via Doc24 Vercel Serverless`,
            content: b64Content,
            sha,
            branch
          })
        });

        if (putRes.ok) {
          console.log(`[Vercel GitHub Push] Successfully committed ${fileName} to GitHub on attempt ${attempts}`);
          return sendJson(200, { success: true });
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
          await new Promise(resolve => setTimeout(resolve, 300 * attempts));
        } else {
          if (lastPutStatus === 401 || lastPutStatus === 403 || lastPutStatus === 404) {
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 500 * attempts));
        }
      }

      return sendJson(lastPutStatus || 500, { error: `Erro ${lastPutStatus} ao realizar commit: ${lastPutErrorText}` });
    }

    // 6. GitHub Pull / Sync Pull
    if ((normalizedPath === 'github/pull' || normalizedPath === 'sync/pull') && req.method === 'POST') {
      const config = getGitHubConfig();
      const token = resolveToken(body?.token);
      const owner = body?.owner || config?.owner;
      const repo = body?.repo || config?.repo;
      const branch = body?.branch || config?.branch || "main";

      if (!token || !owner || !repo) {
        return sendJson(400, { error: "Parâmetros insuficientes para o pull. Configure o GitHub primeiro." });
      }

      const url = `https://api.github.com/repos/${owner}/${repo}/contents/src/data?ref=${branch}&_t=${Date.now()}`;
      const response = await fetchWithRetry(url, {
        cache: 'no-store',
        headers: {
          'Authorization': getAuthHeader(token),
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Doc24-Board-Team-BR-Vercel'
        }
      });

      if (response.status === 404) {
        return sendJson(200, { success: true, message: "Pasta src/data não encontrada no repositório GitHub.", files: {} });
      }

      if (!response.ok) {
        const text = await response.text();
        return sendJson(response.status, { error: `Erro ${response.status} ao listar dados no GitHub: ${text}` });
      }

      const contents = await response.json();
      if (!Array.isArray(contents)) {
        return sendJson(500, { error: "Retorno da API do GitHub para src/data não é um diretório válido." });
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
                'User-Agent': 'Doc24-Board-Team-BR-Vercel'
              }
            });

            if (fileRes.ok) {
              const fileData: any = await fileRes.json();
              const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
              try {
                JSON.parse(content);
                filesResult[item.name] = content;
              } catch (_) {}
            }
          } catch (_) {}
        }
      }

      return sendJson(200, { success: true, files: filesResult });
    }

    // 7. Pull Lock Status
    if (normalizedPath === 'sync/pull_lock' && req.method === 'POST') {
      const config = getGitHubConfig();
      if (!config || !config.enabled || !config.token || !config.owner || !config.repo) {
        return sendJson(400, { error: "GitHub não está habilitado ou configurado." });
      }
      const { token, owner, repo, branch = "main" } = config;
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/src/data/lock_status.json?ref=${branch}&_t=${Date.now()}`;
      const fileRes = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Authorization': getAuthHeader(token),
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Doc24-Board-Team-BR-Vercel'
        }
      });

      if (fileRes.ok) {
        const fileData: any = await fileRes.json();
        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        try {
          const parsed = JSON.parse(content);
          return sendJson(200, { success: true, lockStatus: parsed });
        } catch (_) {
          return sendJson(500, { error: "lock_status.json tem formato inválido." });
        }
      } else if (fileRes.status === 404) {
        return sendJson(200, { success: true, lockStatus: { locked: false, lockedBy: null, lockedAt: null, expiresAt: null } });
      } else {
        const errText = await fileRes.text();
        return sendJson(fileRes.status, { error: `Erro HTTP ${fileRes.status}: ${errText}` });
      }
    }

    // 8. Rota de sincronização completa (/api/sync)
    if (normalizedPath === 'sync' && req.method === 'GET') {
      const config = getGitHubConfig();
      
      // Se o GitHub estiver habilitado e com credenciais, busca direto do repositório
      if (config && config.enabled && config.token && config.owner && config.repo) {
        try {
          const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/src/data?ref=${config.branch || 'main'}&_t=${Date.now()}`;
          const response = await fetchWithRetry(url, {
            cache: 'no-store',
            headers: {
              'Authorization': getAuthHeader(config.token),
              'Accept': 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
              'User-Agent': 'Doc24-Board-Team-BR-Vercel'
            }
          });

          if (response.ok) {
            const contents = await response.json();
            if (Array.isArray(contents) && contents.length > 0) {
              const filesResult: Record<string, string> = {};
              for (const item of contents) {
                if (item.type === 'file' && item.name.endsWith('.json') && item.name !== 'github_config.json') {
                  const fileUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${item.path}?ref=${config.branch || 'main'}&_t=${Date.now()}`;
                  try {
                    const fileRes = await fetchWithRetry(fileUrl, {
                      cache: 'no-store',
                      headers: {
                        'Authorization': getAuthHeader(config.token),
                        'Accept': 'application/vnd.github+json',
                        'User-Agent': 'Doc24-Board-Team-BR-Vercel'
                      }
                    });
                    if (fileRes.ok) {
                      const fileData: any = await fileRes.json();
                      const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
                      try {
                        JSON.parse(content);
                        filesResult[item.name] = content;
                      } catch (_) {}
                    }
                  } catch (_) {}
                }
              }

              if (Object.keys(filesResult).length > 0) {
                return sendJson(200, filesResult);
              }
            }
          }
        } catch (gitErr) {
          console.warn("[Vercel /api/sync] Aviso sincronização GitHub, caindo para arquivos locais:", gitErr);
        }
      }

      // Fallback para arquivos locais empacotados
      const dataDir = findDataDir();
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

    // 9. List Files (/api/files)
    if (normalizedPath === 'files' && req.method === 'GET') {
      const dataDir = findDataDir();
      if (!fs.existsSync(dataDir)) {
        return sendJson(200, []);
      }
      const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
      return sendJson(200, files);
    }

    // 10. Save file (/api/files/:filename)
    if (normalizedPath.startsWith('files/') && req.method === 'POST') {
      const filename = normalizedPath.replace(/^files\//, '').trim();
      const content = body?.content;
      if (typeof content !== 'string') {
        return sendJson(400, { error: 'O conteúdo deve ser uma string.' });
      }

      if (filename === 'github_config.json') {
        try {
          const newConfig = JSON.parse(content);
          const currentConfig = getGitHubConfig();
          if (currentConfig && currentConfig.token && (isMaskedToken(newConfig.token) || !newConfig.token?.trim())) {
            newConfig.token = currentConfig.token;
          }
          const sanitizedContent = JSON.stringify(newConfig, null, 2);
          const dataDir = findDataDir();
          const configPath = path.join(dataDir, 'github_config.json');
          if (fs.existsSync(path.dirname(configPath))) {
            try { fs.writeFileSync(configPath, sanitizedContent, 'utf-8'); } catch (_) {}
          }
          return sendJson(200, { success: true });
        } catch (e) {
          return sendJson(400, { error: 'Configuração do GitHub inválida.' });
        }
      }

      if (!/^[a-zA-Z0-9_\-\.]+\.json$/.test(filename)) {
        return sendJson(400, { error: 'Nome de arquivo inválido.' });
      }

      // Try local write (might be read-only in Vercel lambda, which is normal)
      try {
        const dataDir = findDataDir();
        if (fs.existsSync(dataDir)) {
          fs.writeFileSync(path.join(dataDir, filename), content, 'utf-8');
        }
      } catch (_) {}

      // Push to GitHub if configured
      const config = getGitHubConfig();
      if (config && config.enabled && config.token && config.owner && config.repo) {
        try {
          const filePath = `src/data/${filename}`;
          const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${filePath}`;
          const b64Content = Buffer.from(content, 'utf-8').toString('base64');
          
          let sha: string | undefined;
          const getRes = await fetch(`${url}?ref=${config.branch || 'main'}&_t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
              'Authorization': getAuthHeader(config.token),
              'Accept': 'application/vnd.github+json',
              'User-Agent': 'Doc24-Board-Team-BR-Vercel'
            }
          });
          if (getRes.status === 200) {
            const getData: any = await getRes.json();
            sha = getData.sha;
          }
          
          await fetch(url, {
            method: 'PUT',
            headers: {
              'Authorization': getAuthHeader(config.token),
              'Accept': 'application/vnd.github+json',
              'Content-Type': 'application/json',
              'User-Agent': 'Doc24-Board-Team-BR-Vercel'
            },
            body: JSON.stringify({
              message: `Update ${filename} via Doc24 Vercel Serverless`,
              content: b64Content,
              sha,
              branch: config.branch || 'main'
            })
          });
        } catch (gitErr) {
          console.warn(`[Vercel GitHub Auto-Push] Erro ao gravar ${filename}:`, gitErr);
        }
      }

      return sendJson(200, { success: true });
    }

    // 11. Rotas diretas de dados (/api/data/:filename)
    if (normalizedPath.startsWith('data/')) {
      const filename = normalizedPath.replace(/^data\//, '').trim();
      if (!filename || filename.includes('..') || filename.includes('/')) {
        return sendJson(400, { error: "Nome de arquivo inválido" });
      }

      if (req.method === 'GET') {
        const dataDir = findDataDir();
        const filePath = path.join(dataDir, filename);
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          try {
            return sendJson(200, JSON.parse(fileContent));
          } catch (_) {
            return res.status(200).send(fileContent);
          }
        }
        return sendJson(404, { error: `Arquivo ${filename} não encontrado` });
      }

      if (req.method === 'POST') {
        const dataDir = findDataDir();
        const filePath = path.join(dataDir, filename);
        const fileContent = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
        try {
          fs.writeFileSync(filePath, fileContent, 'utf-8');
        } catch (_) {}
        return sendJson(200, { success: true, message: `Dados gravados com sucesso (${filename})` });
      }
    }

    return sendJson(404, { error: `Rota da API não encontrada: ${req.method} ${normalizedPath}` });

  } catch (err: any) {
    console.error('[Vercel Serverless Handler Critical Error]', err);
    return sendJson(500, {
      success: false,
      error: err?.message || 'Internal Server Error',
      stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined
    });
  }
}
