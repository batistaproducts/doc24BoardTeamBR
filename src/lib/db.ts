import { Pool } from "pg";
import fs from "fs";
import path from "path";

export function getDbPool(customConnectionString?: string): Pool {
  const connectionString = customConnectionString || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não configurada nas variáveis de ambiente.");
  }
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
  });

  pool.on('error', (err) => {
    console.error('[Neon DB Pool Error]', err);
  });

  return pool;
}

export async function ensureAllTables(client: any) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_storage (
      key VARCHAR(100) PRIMARY KEY,
      content TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed usuarios
  const usersCheck = await client.query('SELECT count(*) FROM app_storage WHERE key = $1;', ['usuarios.json']);
  if (parseInt(usersCheck.rows[0].count) === 0) {
    const fpath = path.join(process.cwd(), 'src', 'data', 'usuarios.json');
    if (fs.existsSync(fpath)) {
        const content = fs.readFileSync(fpath, 'utf-8');
        await client.query(
            'INSERT INTO app_storage (key, content, updated_at) VALUES ($1, $2, NOW());',
            ['usuarios.json', content]
        );
    }
  }
}
