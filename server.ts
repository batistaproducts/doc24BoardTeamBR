import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createApp } from "./server/app";

// Global process safety handlers for transient socket / network resets
process.on('uncaughtException', (err: any) => {
  if (err?.code === 'ECONNRESET' || err?.code === 'EPIPE' || err?.message?.includes('ECONNRESET')) {
    console.warn('[Process Warning] Conexão TCP redefinida (ECONNRESET):', err?.message || err);
    return;
  }
  console.error('[Process Uncaught Exception]', err);
});

process.on('unhandledRejection', (reason: any) => {
  console.warn('[Process Unhandled Rejection]', reason?.message || reason);
});

async function startServer() {
  const app = createApp();
  const PORT = 3000;

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
