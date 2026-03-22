import { NextRequest, NextResponse } from "next/server";
import { checkAllEndpoints } from "@/lib/checker";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!await getSession(req)) return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const results = await checkAllEndpoints();
    return NextResponse.json({ ok: true, results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
