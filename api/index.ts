import { createApp } from "../server/app";

let cachedApp: any = null;

export default async function handler(req: any, res: any) {
  if (!cachedApp) {
    cachedApp = createApp();
  }
  return cachedApp(req, res);
}
