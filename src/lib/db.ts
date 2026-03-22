import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "monitor.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initDb(db);
  }
  return db;
}

function initDb(db: Database.Database) {
  db.exec(`
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
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS check_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint_id TEXT NOT NULL,
      status TEXT NOT NULL,
      response_time_ms INTEGER DEFAULT 0,
      ttft_ms INTEGER DEFAULT 0,
      tokens_per_sec REAL DEFAULT 0,
      error_message TEXT DEFAULT '',
      checked_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (endpoint_id) REFERENCES api_endpoints(id)
    );

    CREATE INDEX IF NOT EXISTS idx_check_results_endpoint 
      ON check_results(endpoint_id, checked_at DESC);
  `);

  // 迁移：为旧表补充新列（如果不存在）
  const cols = db.prepare("PRAGMA table_info(check_results)").all() as { name: string }[];
  const colNames = cols.map((c) => c.name);
  if (!colNames.includes("ttft_ms")) {
    db.exec("ALTER TABLE check_results ADD COLUMN ttft_ms INTEGER DEFAULT 0");
  }
  if (!colNames.includes("tokens_per_sec")) {
    db.exec("ALTER TABLE check_results ADD COLUMN tokens_per_sec REAL DEFAULT 0");
  }
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
