import { NextRequest, NextResponse } from "next/server";
import { attemptLogin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json({ error: "缺少用户名或密码" }, { status: 400 });
  }

  const result = await attemptLogin(req, username, password);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, banned: result.banned || false },
      { status: result.banned ? 403 : 401 }
    );
  }

  const res = NextResponse.json({ ok: true, username });
  res.cookies.set("session", result.token!, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
  return res;
}
