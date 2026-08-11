import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

// Antonio Batista - SEG_002 - Retorna o cabeçalho de autorização correto (Bearer ou token) de acordo com o tipo de Personal Access Token do GitHub (Classic ou Fine-grained).
function getAuthHeader(token: string): string {
  const trimmed = token ? token.trim() : "";
  if (trimmed.startsWith('github_pat_')) {
    return `Bearer ${trimmed}`;
  }
  return `token ${trimmed}`;
}

// Antonio Batista - SEG_002 - Executa requisição HTTP utilizando a API fetch nativa do Node.js com mecanismo de suporte a tentativas (retry) para conexões de rede com oscilação de socket.
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

// Antonio Batista - SEG_002 - Carrega as configurações de integração com o GitHub salvas localmente no disco (github_config.json) do servidor, priorizando o GITHUB_TOKEN de variáveis de ambiente.
function loadDiskGitHubConfig() {
  try {
    const configPath = path.join(process.cwd(), 'src', 'data', 'github_config.json');
    let diskConfig: any = {};
    if (fs.existsSync(configPath)) {
      diskConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    
    // Antonio Batista - [PROJETO] - 2026-08-10 - Prioriza o token da variável de ambiente
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

// Antonio Batista - SEG_002 - Verifica se uma string de token está mascarada (ex: ghp_...3gH, ****, ••••, etc.).
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

// Antonio Batista - SEG_002 - Resolve o token real do GitHub priorizando um novo token não mascarado fornecido na requisição ou o token gravado no disco (github_config.json).
function resolveToken(providedToken?: string): string {
  const diskConfig = loadDiskGitHubConfig();
  const trimmed = (providedToken || "").trim();
  if (!trimmed || isMaskedToken(trimmed)) {
    return diskConfig?.token || "";
  }
  return trimmed;
}

// Antonio Batista - SEG_002 - Inicializa o servidor HTTP Express, registra os middlewares, endpoints da API REST de dados/sync e configura o ambiente Vite ou estático.
async function startServer() {
  const app = express();
  const PORT = 3000;

  // Setup JSON parsing body limit
  app.use(express.json({ limit: '10mb' }));

  // API endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Proxy GitHub Connection Test to bypass client-side CORS/iframe restrictions
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
          errorMsg = `Erro 403 (Proibido) retornado pelo GitHub: ${rawMsg}. Verifique se o seu Token (PAT) tem as permissões corretas (ex: escopo 'repo' para classic, ou 'Metadata: Read-Only' e 'Contents: Read & Write' para fine-grained).`;
        } else if (response.status === 404) {
          errorMsg = `Erro 404 (Não Encontrado) retornado pelo GitHub: ${rawMsg}. Verifique se o Dono e o Nome do repositório estão corretos ou se o repositório é privado e o token não tem acesso.`;
        } else if (response.status === 401) {
          errorMsg = `Erro 401 (Não Autorizado) retornado pelo GitHub: ${rawMsg}. O token fornecido é inválido ou expirou.`;
        }

        res.status(response.status).json({ error: errorMsg });
      }
    } catch (error: any) {
      console.error("Error in /api/github/test:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Diagnostic Endpoint for deep connection, permissions, files, rate limit, and local disk checks
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

      // SECURITY: Mask the token if it's being sent back in any detailed response
      // or at least ensure we don't return it to the client in the success response.
      
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

      // 1. Repo general connection check
      const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
      const repoResponse = await fetchWithRetry(repoUrl, {
        headers: {
          'Authorization': getAuthHeader(token),
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Doc24-Board-Team-BR-Server'
        }
      });

      const scopesHeader = repoResponse.headers.get('x-oauth-scopes') || "Não disponível (PAT fine-grained ou sem cabeçalho)";
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
          error: `Falha na conexão com o repositório (Código HTTP ${repoResponse.status}): ${rawMsg}`,
          connection: {
            success: false,
            status: repoResponse.status,
            message: rawMsg
          },
          rateLimit: {
            limit: rateLimitLimit ? parseInt(rateLimitLimit, 10) : null,
            remaining: rateLimitRemaining ? parseInt(rateLimitRemaining, 10) : null,
            resetTime: rateLimitReset ? new Date(parseInt(rateLimitReset, 10) * 1000).toISOString() : null
          },
          serverDisk: {
            configExists: serverDiskConfigExists,
            enabled: serverDiskConfigEnabled
          }
        });
      }

      const repoData = await repoResponse.json();
      const permissions = repoData.permissions || { admin: false, push: false, pull: false };
      const isPrivate = repoData.private;
      const defaultBranch = repoData.default_branch;

      // 2. Check if specific branch exists
      let branchExists = false;
      let branchError = null;
      try {
        const branchUrl = `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`;
        const branchResponse = await fetchWithRetry(branchUrl, {
          headers: {
            'Authorization': getAuthHeader(token),
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'Doc24-Board-Team-BR-Server'
          }
        });
        branchExists = branchResponse.ok;
        if (!branchResponse.ok) {
          const bText = await branchResponse.text();
          branchError = `HTTP ${branchResponse.status} - ${bText}`;
        }
      } catch (be: any) {
        branchError = be.message;
      }

      // 3. Check if core files exist on the remote branch
      let usuariosJsonExists = false;
      let remoteFilesError = null;
      try {
        const usuariosUrl = `https://api.github.com/repos/${owner}/${repo}/contents/src/data/usuarios.json?ref=${branch}`;
        const usuariosResponse = await fetchWithRetry(usuariosUrl, {
          headers: {
            'Authorization': getAuthHeader(token),
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'Doc24-Board-Team-BR-Server'
          }
        });
        usuariosJsonExists = usuariosResponse.ok;
        if (!usuariosResponse.ok) {
          const uText = await usuariosResponse.text();
          remoteFilesError = `HTTP ${usuariosResponse.status} - ${uText}`;
        }
      } catch (fe: any) {
        remoteFilesError = fe.message;
      }

      res.json({
        success: true,
        connection: {
          success: true,
          status: 200,
          message: "Conectado com sucesso"
        },
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
        repoState: {
          isPrivate,
          defaultBranch,
          branchExists,
          branchError,
          usuariosJsonExists,
          remoteFilesError
        },
        serverDisk: {
          configExists: serverDiskConfigExists,
          enabled: serverDiskConfigEnabled
        }
      });

    } catch (error: any) {
      console.error("Error in /api/github/diagnostic:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API endpoint to get GitHub configuration status WITHOUT the token
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
        hasToken: hasToken,
        maskedToken: maskedToken
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Queue map to serialize push requests per file name, avoiding concurrent 409 Conflicts on GitHub
  const filePushQueues = new Map<string, Promise<any>>();

  // Antonio Batista - SEG_002 - Enfileira e serializa requisições de push para o mesmo arquivo para evitar condições de corrida (409 Conflict) na API do GitHub.
  function enqueueFilePush(fileName: string, pushTask: () => Promise<any>): Promise<any> {
    const previous = filePushQueues.get(fileName) || Promise.resolve();
    const current = previous.catch(() => {}).then(() => pushTask());
    filePushQueues.set(fileName, current);
    return current;
  }

  // Antonio Batista - SEG_002 - Manipula as requisições de upload/commit (push) de arquivos JSON diretamente para o repositório remoto no GitHub.
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

      // Enqueue push operation per file to prevent concurrent GitHub API race conditions
      await enqueueFilePush(fileName, async () => {
        const filePath = `src/data/${fileName}`;
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

        let attempts = 0;
        const maxAttempts = 10;
        let lastPutStatus = 0;
        let lastPutErrorText = "";
        let overrideSha: string | undefined = undefined;

        while (attempts < maxAttempts) {
          attempts++;
          console.log(`[GitHub Push] Attempt ${attempts}/${maxAttempts} for file: ${fileName}...`);

          let sha: string | undefined = overrideSha;
          overrideSha = undefined; // reset for next round if this one fails too

          if (sha) {
            console.log(`[GitHub Push] Using override SHA from previous 409 Conflict: ${sha}`);
          } else {
            // 1. Get current file's SHA with cache-busting and explicit cache: 'no-store'
            const cacheBuster = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
            const getRes = await fetch(`${url}?ref=${branch}&_cb=${cacheBuster}`, {
              cache: 'no-store', // Disable internal engine/network fetch caching
              headers: {
                'Authorization': getAuthHeader(token),
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'Doc24-Board-Team-BR-Server',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            });

            if (getRes.status === 200) {
              const getData: any = await getRes.json();
              sha = getData.sha;
              console.log(`[GitHub Push] Retrieved current SHA for ${fileName} on attempt ${attempts}: ${sha}`);
            } else if (getRes.status === 404) {
              console.log(`[GitHub Push] File ${fileName} not found on GitHub on attempt ${attempts}. Creating new file.`);
            } else {
              // Genuine error fetching SHA (e.g. 401, 403, etc.)
              const getErrText = await getRes.text();
              let parsedMsg = getErrText;
              try {
                const parsed = JSON.parse(getErrText);
                parsedMsg = parsed.message || getErrText;
              } catch (_) {}

              if (attempts === maxAttempts) {
                let customMsg = `Erro ${getRes.status} ao obter informações do arquivo '${filePath}' no repositório: ${parsedMsg}`;
                if (getRes.status === 403) {
                  customMsg = `Erro 403 (Proibido) ao buscar arquivo do GitHub: ${parsedMsg}. Verifique se o seu Token (PAT) tem as permissões corretas (ex: permissão de 'Contents' com 'Read and write' para Fine-grained PAT, ou escopo 'repo' para Classic PAT).`;
                } else if (getRes.status === 401) {
                  customMsg = `Erro 401 (Não Autorizado) ao buscar arquivo do GitHub: ${parsedMsg}. O Token de Acesso Pessoal (PAT) fornecido é inválido ou expirou.`;
                }
                res.status(getRes.status).json({ error: customMsg });
                return;
              }

              // Retry
              const waitTime = 600 * attempts;
              console.log(`[GitHub Push] Fetch SHA failed with status ${getRes.status}. Retrying in ${waitTime}ms...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
          }

          // 2. Base64 encode
          const b64Content = Buffer.from(content, 'utf-8').toString('base64');

          // 3. Commit (PUT)
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
              sha: sha,
              branch: branch
            })
          });

          if (putRes.ok) {
            console.log(`[GitHub Push] Successfully committed ${fileName} to GitHub on attempt ${attempts}`);
            res.json({ success: true });
            return;
          }

          lastPutStatus = putRes.status;
          lastPutErrorText = await putRes.text();
          console.log(`[GitHub Push] Commit attempt ${attempts} returned status ${lastPutStatus}. Response: ${lastPutErrorText}`);

          if (lastPutStatus === 409) {
            // Only override SHA if GitHub explicitly says "is at <ACTUAL_SHA>".
            // Do NOT extract hash if message is "does not match <STALE_SHA>", because that hash is the stale SHA!
            try {
              const parsed = JSON.parse(lastPutErrorText);
              const msg = parsed.message || "";
              const isAtMatch = msg.match(/is at ([a-f0-9]{40})/i);
              if (isAtMatch && isAtMatch[1]) {
                overrideSha = isAtMatch[1];
                console.log(`[GitHub Push] Extracted current SHA from 409 Conflict "is at" response: ${overrideSha}.`);
              } else {
                overrideSha = undefined; // Force fresh GET in next iteration
              }
            } catch (_) {
              overrideSha = undefined;
            }

            const jitter = Math.floor(Math.random() * 300);
            const waitTime = overrideSha ? 250 + jitter : 600 * attempts + jitter;
            console.log(`[GitHub Push] 409 Conflict detected for ${fileName}. Retrying attempt ${attempts + 1}/${maxAttempts} in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          } else {
            // If we have an authentication error, branch restriction error, or not found error, retrying won't fix it.
            if (lastPutStatus === 401 || lastPutStatus === 403 || lastPutStatus === 404) {
              break;
            }
            // Retry for other errors
            const waitTime = 800 * attempts;
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }

        // All attempts failed
        let rawMsg = lastPutErrorText;
        try {
          const parsed = JSON.parse(lastPutErrorText);
          rawMsg = parsed.message || lastPutErrorText;
        } catch (_) {}

        let errorMsg = `Erro ${lastPutStatus} ao realizar o commit: ${rawMsg}.`;
        if (lastPutStatus === 403) {
          errorMsg = `Erro 403 (Proibido) retornado pelo GitHub: ${rawMsg}. O token (PAT) não tem permissão para gravar na branch '${branch}', ou o token não possui escopo de escrita de conteúdo ('Contents: Read and Write'). Verifique também se a branch '${branch}' está protegida contra commits diretos.`;
        } else if (lastPutStatus === 404) {
          errorMsg = `Erro 404 (Não Encontrado) retornado pelo GitHub: ${rawMsg}. A branch '${branch}' ou o repositório não foram encontrados.`;
        } else if (lastPutStatus === 409) {
          errorMsg = `Erro de Conflito 409 (Conflict) persistente no GitHub: ${rawMsg}. Isso indica que o arquivo foi modificado em paralelo por outro processo e não pôde ser resolvido automaticamente após ${maxAttempts} tentativas.`;
        }

        res.status(lastPutStatus).json({ error: errorMsg });
      });
    } catch (error: any) {
      console.error("Error pushing to GitHub:", error);
      res.status(500).json({ error: error.message });
    }
  };

  // Antonio Batista - SEG_002 - Realiza o download (pull) de todos os arquivos JSON do repositório remoto no GitHub e os salva localmente no disco.
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

      const url = `https://api.github.com/repos/${owner}/${repo}/contents/src/data`;
      const listUrl = `${url}?ref=${branch}&_t=${Date.now()}`;
      console.log(`[GitHub Pull] Listing src/data contents from GitHub: ${listUrl}`);
      
      const response = await fetchWithRetry(listUrl, {
        cache: 'no-store',
        headers: {
          'Authorization': getAuthHeader(token),
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Doc24-Board-Team-BR-Server',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (response.status === 404) {
        return res.json({ success: true, message: "Pasta src/data não encontrada no repositório GitHub. Nada para importar.", files: {} });
      }

      if (!response.ok) {
        const text = await response.text();
        let rawMsg = text;
        try {
          const parsed = JSON.parse(text);
          rawMsg = parsed.message || text;
        } catch (_) {}
        return res.status(response.status).json({ error: `Erro ${response.status} ao listar pasta no GitHub: ${rawMsg}` });
      }

      const contents = await response.json();
      if (!Array.isArray(contents)) {
        return res.status(500).json({ error: "Retorno da API do GitHub para src/data não é um diretório válido." });
      }

      const dataDir = path.join(process.cwd(), 'src', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const filesResult: Record<string, string> = {};

      for (const item of contents) {
        if (item.type === 'file' && item.name.endsWith('.json') && item.name !== 'lock_status.json' && item.name !== 'github_config.json') {
          const separator = item.url.includes('?') ? '&' : '?';
          const fileUrl = `${item.url}${separator}ref=${branch}&_t=${Date.now()}`;
          console.log(`[GitHub Pull] Downloading file content for: ${item.name} from URL: ${fileUrl}`);
          
          try {
            const fileRes = await fetchWithRetry(fileUrl, {
              cache: 'no-store',
              headers: {
                'Authorization': getAuthHeader(token),
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'Doc24-Board-Team-BR-Server',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            });

            if (fileRes.ok) {
              const fileData: any = await fileRes.json();
              const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
              
              // Validate that it is valid JSON before writing
              try {
                JSON.parse(content);
                const filePath = path.join(dataDir, item.name);
                fs.writeFileSync(filePath, content, 'utf-8');
                filesResult[item.name] = content;
              } catch (err: any) {
                console.error(`[GitHub Pull] Invalid JSON in file ${item.name} from GitHub:`, err.message);
              }
            } else {
              console.error(`[GitHub Pull] Failed to download content for ${item.name}: Status ${fileRes.status}`);
            }
          } catch (fileErr: any) {
            console.error(`[GitHub Pull] Network exception downloading ${item.name}:`, fileErr.message || fileErr);
          }
        }
      }

      console.log(`[GitHub Pull] Finished pulling from GitHub. Saved ${Object.keys(filesResult).length} files.`);
      res.json({ success: true, files: filesResult });
    } catch (error: any) {
      console.error("Error pulling from GitHub:", error);
      res.status(500).json({ error: error.message });
    }
  };

  // Antonio Batista - SEG_002 - Obtém e sincroniza o estado do arquivo de trava de edição (lock_status.json) a partir do repositório no GitHub.
  const handlePullLockRequest = async (req: express.Request, res: express.Response) => {
    try {
      const diskConfig = loadDiskGitHubConfig();
      if (!diskConfig || !diskConfig.enabled) {
        return res.status(400).json({ error: "GitHub não está habilitado ou configurado no servidor." });
      }
      const { token, owner, repo, branch = "main" } = diskConfig;
      if (!token || !owner || !repo) {
        return res.status(400).json({ error: "GitHub não está totalmente configurado no servidor." });
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
          // Save it physically locally too to sync!
          const dataDir = path.join(process.cwd(), 'src', 'data');
          const filePath = path.join(dataDir, 'lock_status.json');
          fs.writeFileSync(filePath, content, 'utf-8');
          
          return res.json({ success: true, lockStatus: parsed });
        } catch (err: any) {
          return res.status(500).json({ error: "O lock_status.json no GitHub tem formato JSON inválido." });
        }
      } else if (fileRes.status === 404) {
        // Not found on GitHub, return default lock status
        return res.json({ success: true, lockStatus: { locked: false, lockedBy: null, lockedAt: null, expiresAt: null } });
      } else {
        const errText = await fileRes.text();
        return res.status(fileRes.status).json({ error: `Erro HTTP ${fileRes.status}: ${errText}` });
      }
    } catch (error: any) {
      console.error("Error pulling lock from GitHub:", error);
      res.status(500).json({ error: error.message });
    }
  };

  // Mount original routes
  app.post("/api/github/push", handlePushRequest);
  app.post("/api/github/pull", handlePullRequest);

  // Mount WAF-safe, token-free alias routes
  app.post("/api/sync/publish", handlePushRequest);
  app.post("/api/sync/pull", handlePullRequest);
  app.post("/api/sync/pull_lock", handlePullLockRequest);

  // Get all JSON files from /src/data to populate localStorage initially or on demand
  app.get("/api/sync", (req, res) => {
    try {
      const dataDir = path.join(process.cwd(), 'src', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const files = fs.readdirSync(dataDir);
      const result: Record<string, string> = {};
      
      // SENSITIVE FILES - Should never be exposed via public sync
      const sensitiveFiles = ['github_config.json', 'usuarios.json'];
      
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

  // Get list of all JSON files in /src/data
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

  // Save/Overwrite a JSON file to /src/data
  app.post("/api/files/:filename", (req, res) => {
    try {
      const { filename } = req.params;
      
      const { content } = req.body;
      if (typeof content !== 'string') {
        return res.status(400).json({ error: 'O conteúdo deve ser uma string.' });
      }
      
      // SPECIAL HANDLING FOR GITHUB CONFIG - Prevent overwriting real token with masked one
      if (filename === 'github_config.json') {
        try {
          const newConfig = JSON.parse(content);
          const currentConfig = loadDiskGitHubConfig();
          if (currentConfig && currentConfig.token && (isMaskedToken(newConfig.token) || !newConfig.token?.trim())) {
            newConfig.token = currentConfig.token;
          }
          const sanitizedContent = JSON.stringify(newConfig, null, 2);
          const configPath = path.join(process.cwd(), 'src', 'data', 'github_config.json');
          fs.writeFileSync(configPath, sanitizedContent, 'utf-8');
          return res.json({ success: true });
        } catch (e) {
          return res.status(400).json({ error: 'Configuração do GitHub inválida.' });
        }
      }

      // Basic sanitization to prevent directory traversal
      if (!/^[a-zA-Z0-9_\-\.]+\.json$/.test(filename)) {
        return res.status(400).json({ error: 'Nome de arquivo inválido.' });
      }
      
      // Validate that content is valid JSON before writing
      JSON.parse(content);

      const dataDir = path.join(process.cwd(), 'src', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const filePath = path.join(dataDir, filename);
      fs.writeFileSync(filePath, content, 'utf-8');
      
      console.log(`[File System] Successfully wrote physical file: ${filename}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`Error saving file ${req.params.filename}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete a JSON file from /src/data
  app.delete("/api/files/:filename", (req, res) => {
    try {
      const { filename } = req.params;

      // Block deletion of sensitive system files
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
        fs.unlinkSync(filePath);
        console.log(`[File System] Deleted physical file: ${filename}`);
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error(`Error deleting file ${req.params.filename}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware setup for Development vs Production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Serving static production files from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
