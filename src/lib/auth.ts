import { createHash, randomBytes } from "crypto";
import { getDb } from "./db";
import type { NextRequest } from "next/server";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 天
const MAX_FAIL = 3;

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export interface LoginResult {
  ok: boolean;
  token?: string;
  error?: string;
  banned?: boolean;
}

export async function attemptLogin(req: NextRequest, username: string, password: string): Promise<LoginResult> {
  const sql = getDb();
  const ip = getClientIp(req);

  // 检查 IP 黑名单
  const attempts = await sql`SELECT * FROM login_attempts WHERE ip = ${ip}`;
  const attempt = attempts[0] as { ip: string; fail_count: number; banned: boolean } | undefined;

  if (attempt?.banned) {
    return { ok: false, banned: true, error: "IP 已被永久封禁，无法登录" };
  }

  // 验证用户
  const users = await sql`SELECT * FROM users WHERE username = ${username}`;
  const user = users[0] as { username: string; password_hash: string } | undefined;

  const passwordHash = hashPassword(password);
  const valid = user && user.password_hash === passwordHash;

  if (!valid) {
    const failCount = (attempt?.fail_count || 0) + 1;
    const banned = failCount >= MAX_FAIL;
    await sql`
      INSERT INTO login_attempts (ip, fail_count, last_fail_at, banned)
      VALUES (${ip}, ${failCount}, NOW(), ${banned})
      ON CONFLICT (ip) DO UPDATE SET
        fail_count = EXCLUDED.fail_count,
        last_fail_at = EXCLUDED.last_fail_at,
        banned = EXCLUDED.banned
    `;

    if (banned) {
      return { ok: false, banned: true, error: `登录失败 ${MAX_FAIL} 次，IP 已被永久封禁` };
    }
    return { ok: false, error: `用户名或密码错误（剩余 ${MAX_FAIL - failCount} 次机会）` };
  }

  // 登录成功，清除失败记录
  await sql`DELETE FROM login_attempts WHERE ip = ${ip}`;

  // 创建 session
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  await sql`INSERT INTO sessions (token, username, expires_at) VALUES (${token}, ${username}, ${expiresAt})`;

  return { ok: true, token };
}

export async function getSession(req: NextRequest): Promise<{ username: string } | null> {
  const token =
    req.cookies.get("session")?.value ||
    req.headers.get("x-session-token") ||
    null;

  if (!token) return null;

  const sql = getDb();
  const rows = await sql`
    SELECT username FROM sessions WHERE token = ${token} AND expires_at > NOW()
  `;
  const session = rows[0] as { username: string } | undefined;
  return session ? { username: session.username } : null;
}

export async function deleteSession(token: string) {
  const sql = getDb();
  await sql`DELETE FROM sessions WHERE token = ${token}`;
}

export async function changePassword(username: string, newPassword: string) {
  const sql = getDb();
  const hash = hashPassword(newPassword);
  await sql`UPDATE users SET password_hash = ${hash} WHERE username = ${username}`;
  await sql`DELETE FROM sessions WHERE username = ${username}`;
}
