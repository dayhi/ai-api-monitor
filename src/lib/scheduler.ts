import { getDb } from "./db";

// Vercel Serverless 环境：无常驻进程，调度由 Vercel Cron Jobs 触发
// scheduler.ts 只提供状态读写工具函数

async function setMeta(key: string, value: string) {
  const sql = getDb();
  await sql`
    INSERT INTO scheduler_meta (key, value) VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;
}

async function getMeta(key: string): Promise<string | null> {
  const sql = getDb();
  const rows = await sql`SELECT value FROM scheduler_meta WHERE key = ${key}`;
  return (rows[0] as { value: string } | undefined)?.value ?? null;
}

export async function recordCheckStart() {
  await setMeta("is_checking", "true");
  await setMeta("scheduler_running", "true");
}

export async function recordCheckDone() {
  await setMeta("is_checking", "false");
  await setMeta("last_check_time", new Date().toISOString());
}

export async function getSchedulerStatus() {
  try {
    return {
      running: true,
      lastCheckTime: await getMeta("last_check_time"),
      isChecking: (await getMeta("is_checking")) === "true",
    };
  } catch {
    return { running: false, lastCheckTime: null, isChecking: false };
  }
}
