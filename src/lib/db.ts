import { neon } from "@neondatabase/serverless";
import { createHash } from "crypto";

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL environment variable is not set");
  return neon(url);
}

export async function initDb() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS login_attempts (
      ip TEXT PRIMARY KEY,
      fail_count INTEGER DEFAULT 0,
      last_fail_at TIMESTAMPTZ,
      banned BOOLEAN DEFAULT FALSE
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS api_endpoints (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      base_url TEXT NOT NULL,
      model TEXT NOT NULL,
      api_key TEXT DEFAULT '',
      check_mode TEXT DEFAULT 'chat',
      api_path TEXT DEFAULT '',
      enabled INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS check_results (
      id SERIAL PRIMARY KEY,
      endpoint_id TEXT NOT NULL,
      status TEXT NOT NULL,
      response_time_ms INTEGER DEFAULT 0,
      ttft_ms INTEGER DEFAULT 0,
      tokens_per_sec REAL DEFAULT 0,
      error_message TEXT DEFAULT '',
      checked_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_check_results_endpoint
      ON check_results(endpoint_id, checked_at DESC)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS scheduler_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `;

  // 初始化默认管理员账号 root/root
  const hash = createHash("sha256").update("root").digest("hex");
  await sql`
    INSERT INTO users (username, password_hash)
    VALUES ('root', ${hash})
    ON CONFLICT (username) DO NOTHING
  `;
}

export type Provider = "claude" | "openai" | "openai-compatible";
export type CheckMode = "chat" | "models" | "responses";

export interface ApiEndpoint {
  id: string;
  name: string;
  provider: Provider;
  base_url: string;
  model: string;
  api_key: string;
  check_mode: CheckMode;
  api_path: string;
  enabled: number;
  created_at: string;
}

export interface CheckResult {
  id: number;
  endpoint_id: string;
  status: "up" | "down" | "timeout" | "error";
  response_time_ms: number;
  ttft_ms: number;
  tokens_per_sec: number;
  error_message: string;
  checked_at: string;
}
