import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

function getAuthHeader(token: string): string {
  const trimmed = token ? token.trim() : "";
  // Classic personal access tokens (usually start with ghp_ or similar) require 'token <token>'.
  // Fine-grained personal access tokens (start with github_pat_) require 'Bearer <token>'.
  // We dynamically select the schema for maximum compatibility.
  if (trimmed.startsWith('github_pat_')) {
    return `Bearer ${trimmed}`;
  }
  return `token ${trimmed}`;
}

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
      const { token, owner, repo, branch } = req.body;
      if (!token || !owner || !repo) {
        return res.status(400).json({ error: "Parâmetros insuficientes para o teste." });
      }

      const url = `https://api.github.com/repos/${owner}/${repo}`;
      const response = await fetch(url, {
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

  // Helper to load GitHub config from server disk if available
  function loadDiskGitHubConfig() {
    try {
      const configPath = path.join(process.cwd(), 'src', 'data', 'github_config.json');
      if (fs.existsSync(configPath)) {
        const diskConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return {
          token: diskConfig.token || "",
          owner: diskConfig.owner || "",
          repo: diskConfig.repo || "",
          branch: diskConfig.branch || "main",
          enabled: diskConfig.enabled !== false
        };
      }
    } catch (err: any) {
      console.warn("Failed to read github_config.json from server disk:", err.message);
    }
    return null;
  }

  const handlePushRequest = async (req: express.Request, res: express.Response) => {
    try {
      const diskConfig = loadDiskGitHubConfig();
      const token = req.body.token || diskConfig?.token;
      const owner = req.body.owner || diskConfig?.owner;
      const repo = req.body.repo || diskConfig?.repo;
      const branch = req.body.branch || diskConfig?.branch || "main";
      const { fileName, content } = req.body;

      if (!token || !owner || !repo || !fileName || !content) {
        return res.status(400).json({ error: "Parâmetros insuficientes para o push. Configure o GitHub primeiro." });
      }

      const filePath = `src/data/${fileName}`;
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

      // 1. Get current file's SHA
      let sha: string | undefined = undefined;
      const getRes = await fetch(`${url}?ref=${branch}&_t=${Date.now()}`, {
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
      } else if (getRes.status !== 404) {
        // Genuine error (e.g. 401, 403, etc.)
        const getErrText = await getRes.text();
        let parsedMsg = getErrText;
        try {
          const parsed = JSON.parse(getErrText);
          parsedMsg = parsed.message || getErrText;
        } catch (_) {}

        let customMsg = `Erro ${getRes.status} ao obter informações do arquivo '${filePath}' no repositório: ${parsedMsg}`;
        if (getRes.status === 403) {
          customMsg = `Erro 403 (Proibido) ao buscar arquivo do GitHub: ${parsedMsg}. Verifique se o seu Token (PAT) tem as permissões corretas (ex: permissão de 'Contents' com 'Read and write' para Fine-grained PAT, ou escopo 'repo' para Classic PAT).`;
        } else if (getRes.status === 401) {
          customMsg = `Erro 401 (Não Autorizado) ao buscar arquivo do GitHub: ${parsedMsg}. O Token de Acesso Pessoal (PAT) fornecido é inválido ou expirou.`;
        }
        return res.status(getRes.status).json({ error: customMsg });
      }

      // 2. Base64 encode
      const b64Content = Buffer.from(content, 'utf-8').toString('base64');

      // 3. Commit
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
        res.json({ success: true });
      } else {
        const text = await putRes.text();
        let rawMsg = text;
        try {
          const parsed = JSON.parse(text);
          rawMsg = parsed.message || text;
        } catch (_) {}

        let errorMsg = `Erro ${putRes.status} ao realizar o commit: ${rawMsg}.`;
        if (putRes.status === 403) {
          errorMsg = `Erro 403 (Proibido) retornado pelo GitHub: ${rawMsg}. O token (PAT) não tem permissão para gravar na branch '${branch}', ou o token não possui escopo de escrita de conteúdo ('Contents: Read and Write'). Verifique também se a branch '${branch}' está protegida contra commits diretos.`;
        } else if (putRes.status === 404) {
          errorMsg = `Erro 404 (Não Encontrado) retornado pelo GitHub: ${rawMsg}. A branch '${branch}' ou o repositório não foram encontrados.`;
        }

        res.status(putRes.status).json({ error: errorMsg });
      }
    } catch (error: any) {
      console.error("Error pushing to GitHub:", error);
      res.status(500).json({ error: error.message });
    }
  };

  const handlePullRequest = async (req: express.Request, res: express.Response) => {
    try {
      const diskConfig = loadDiskGitHubConfig();
      const token = req.body.token || diskConfig?.token;
      const owner = req.body.owner || diskConfig?.owner;
      const repo = req.body.repo || diskConfig?.repo;
      const branch = req.body.branch || diskConfig?.branch || "main";

      if (!token || !owner || !repo) {
        return res.status(400).json({ error: "Parâmetros insuficientes para o pull. Configure o GitHub primeiro." });
      }

      const url = `https://api.github.com/repos/${owner}/${repo}/contents/src/data`;
      const listUrl = `${url}?ref=${branch}&_t=${Date.now()}`;
      console.log(`[GitHub Pull] Listing src/data contents from GitHub: ${listUrl}`);
      
      const response = await fetch(listUrl, {
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
        if (item.type === 'file' && item.name.endsWith('.json')) {
          const separator = item.url.includes('?') ? '&' : '?';
          const fileUrl = `${item.url}${separator}ref=${branch}&_t=${Date.now()}`;
          console.log(`[GitHub Pull] Downloading file content for: ${item.name} from URL: ${fileUrl}`);
          
          const fileRes = await fetch(fileUrl, {
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
        }
      }

      console.log(`[GitHub Pull] Finished pulling from GitHub. Saved ${Object.keys(filesResult).length} files.`);
      res.json({ success: true, files: filesResult });
    } catch (error: any) {
      console.error("Error pulling from GitHub:", error);
      res.status(500).json({ error: error.message });
    }
  };

  // Mount original routes
  app.post("/api/github/push", handlePushRequest);
  app.post("/api/github/pull", handlePullRequest);

  // Mount WAF-safe, token-free alias routes
  app.post("/api/sync/publish", handlePushRequest);
  app.post("/api/sync/pull", handlePullRequest);

  // Get all JSON files from /src/data to populate localStorage initially or on demand
  app.get("/api/sync", (req, res) => {
    try {
      const dataDir = path.join(process.cwd(), 'src', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const files = fs.readdirSync(dataDir);
      const result: Record<string, string> = {};
      for (const file of files) {
        if (file.endsWith('.json')) {
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

  // Save/Overwrite a JSON file to /src/data
  app.post("/api/files/:filename", (req, res) => {
    try {
      const { filename } = req.params;
      // Basic sanitization to prevent directory traversal
      if (!/^[a-zA-Z0-9_\-\.]+\.json$/.test(filename)) {
        return res.status(400).json({ error: 'Nome de arquivo inválido.' });
      }
      const { content } = req.body;
      if (typeof content !== 'string') {
        return res.status(400).json({ error: 'O conteúdo deve ser uma string.' });
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
