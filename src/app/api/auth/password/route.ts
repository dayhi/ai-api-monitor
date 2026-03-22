import { NextRequest, NextResponse } from "next/server";
import { getSession, changePassword, hashPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "缺少当前密码或新密码" }, { status: 400 });
  }
  if (newPassword.length < 4) {
    return NextResponse.json({ error: "新密码至少 4 位" }, { status: 400 });
  }

  const sql = getDb();
  const rows = await sql`SELECT password_hash FROM users WHERE username = ${session.username}`;
  const user = rows[0] as { password_hash: string } | undefined;

  if (!user || user.password_hash !== hashPassword(currentPassword)) {
    return NextResponse.json({ error: "当前密码错误" }, { status: 401 });
  }

  await changePassword(session.username, newPassword);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", "", { maxAge: 0, path: "/" });
  return res;
}
