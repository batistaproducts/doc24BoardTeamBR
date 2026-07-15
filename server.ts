import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Setup JSON parsing body limit
  app.use(express.json({ limit: '10mb' }));

  // API endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

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
