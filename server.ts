import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createApp } from "./server/app";
import { ensureSchema } from "./server/db";

async function startServer() {
  const app = createApp();
  const PORT = 3000;

  // Auto-inicializar tabelas no Neon se credenciais estiverem configuradas
  try {
    const hasDb = !!(
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.NEON_DATABASE_URL ||
      process.env.VITE_DATABASE_URL
    );
    if (hasDb) {
      console.log("[Neon DB] Detectadas variáveis de banco de dados. Verificando esquema...");
      await ensureSchema();
    } else {
      console.log("[Neon DB] Variável DATABASE_URL não informada. Operando em modo de arquivos locais / GitHub.");
    }
  } catch (err: any) {
    console.error("[Neon DB] Erro durante inicialização:", err.message);
  }

  // Vite middleware para Desenvolvimento vs Produção
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
