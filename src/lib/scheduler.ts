import cron from "node-cron";
import { checkAllEndpoints } from "./checker";
import { getDb } from "./db";

let task: cron.ScheduledTask | null = null;
let isChecking = false;

function ensureMetaTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS scheduler_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

function setMeta(key: string, value: string) {
  const db = getDb();
  db.prepare("INSERT OR REPLACE INTO scheduler_meta (key, value) VALUES (?, ?)").run(key, value);
}

function getMeta(key: string): string | null {
  const db = getDb();
  const row = db.prepare("SELECT value FROM scheduler_meta WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function startScheduler() {
  ensureMetaTable();

  // 如果 task 已经存在（内存态），只更新 meta
  if (task) {
    setMeta("scheduler_running", "true");
    return;
  }

  setMeta("scheduler_running", "true");
  console.log("[Monitor] Starting scheduler - checking every 1 minute");

  // Run immediately on start
  runCheck();

  // Then every minute
  task = cron.schedule("* * * * *", () => {
    runCheck();
  });
}

async function runCheck() {
  if (isChecking) return;
  isChecking = true;
  setMeta("is_checking", "true");
  try {
    console.log(`[Monitor] Running health checks at ${new Date().toISOString()}`);
    await checkAllEndpoints();
    setMeta("last_check_time", new Date().toISOString());
  } catch (err) {
    console.error("[Monitor] Check failed:", err);
  } finally {
    isChecking = false;
    setMeta("is_checking", "false");
  }
}

export function stopScheduler() {
  if (task) {
    task.stop();
    task = null;
    setMeta("scheduler_running", "false");
  }
}

export function getSchedulerStatus() {
  try {
    ensureMetaTable();
    return {
      running: getMeta("scheduler_running") === "true",
      lastCheckTime: getMeta("last_check_time"),
      isChecking: getMeta("is_checking") === "true",
    };
  } catch {
    return { running: false, lastCheckTime: null, isChecking: false };
  }
}
