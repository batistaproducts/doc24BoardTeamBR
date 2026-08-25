import { createApp } from "../server/app";

let appInstance: any = null;

function getApp() {
  if (!appInstance) {
    appInstance = createApp();
  }
  return appInstance;
}

export default async function handler(req: any, res: any) {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Handle URL normalization for Vercel routing
  const rawUrl = req.url || '';
  const xMatched = req.headers?.['x-matched-path'];
  const queryRoute = req.query?.path || req.query?.__route;

  if (queryRoute) {
    const subpath = Array.isArray(queryRoute) ? queryRoute.join('/') : String(queryRoute);
    const cleanSubpath = subpath.split('?')[0];
    req.url = cleanSubpath.startsWith('/api') ? cleanSubpath : `/api/${cleanSubpath.replace(/^\//, '')}`;
  } else if (typeof xMatched === 'string' && xMatched.startsWith('/api')) {
    req.url = xMatched;
  } else if (rawUrl && !rawUrl.startsWith('/api')) {
    req.url = `/api${rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl}`;
  }

  return new Promise<void>((resolve) => {
    let resolved = false;
    const finish = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    res.on('finish', finish);
    res.on('close', finish);
    res.on('error', (err: any) => {
      console.error('[Vercel Serverless Stream Error]', err);
      finish();
    });

    // Safety timeout to guarantee a response before Vercel kills the function
    const timeout = setTimeout(() => {
      if (!resolved && !res.headersSent) {
        console.warn('[Vercel Serverless] Timeout prevented FUNCTION_INVOCATION_FAILED for:', req.method, req.url);
        res.status(504).json({
          success: false,
          error: 'Gateway Timeout',
          message: 'A operação no servidor demorou mais que o tempo limite permitido.'
        });
        finish();
      }
    }, 8500);

    try {
      const app = getApp();
      app(req, res, (err: any) => {
        clearTimeout(timeout);
        if (err) {
          console.error('[Vercel Serverless Route Error]', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              error: err?.message || 'Server Error',
              message: `Erro na execução da rota: ${err?.message || err}`
            });
          }
        } else if (!res.headersSent) {
          res.status(404).json({
            success: false,
            error: 'Not Found',
            message: `Rota não encontrada: ${req.method} ${req.url}`
          });
        }
        finish();
      });
    } catch (err: any) {
      clearTimeout(timeout);
      console.error('[Vercel Serverless Unhandled Handler Error]', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: err?.message || 'Internal Server Error',
          message: `Erro na função serverless: ${err?.message || err}`
        });
      }
      finish();
    }
  });
}
