import { NextRequest, NextResponse } from "next/server";
import { checkAllEndpoints } from "@/lib/checker";
import { recordCheckStart, recordCheckDone } from "@/lib/scheduler";
import { initDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // 验证 Vercel Cron secret，防止外部触发
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 确保表结构存在（首次部署时）
    await initDb();
    await recordCheckStart();
    await checkAllEndpoints();
    await recordCheckDone();
    return NextResponse.json({ ok: true, time: new Date().toISOString() });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
