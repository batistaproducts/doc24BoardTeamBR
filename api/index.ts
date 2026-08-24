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
    req.url = subpath.startsWith('/api') ? subpath : `/api/${subpath.replace(/^\//, '')}`;
  } else if (typeof xMatched === 'string' && xMatched.startsWith('/api')) {
    req.url = xMatched;
  } else if (rawUrl && !rawUrl.startsWith('/api')) {
    req.url = `/api${rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl}`;
  }

  try {
    const app = getApp();
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Handler Error]', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: err?.message || 'Internal Server Error',
        message: `Erro na função serverless: ${err?.message || err}`
      });
    }
  }
}

