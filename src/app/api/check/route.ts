import { NextResponse } from "next/server";
import { checkAllEndpoints } from "@/lib/checker";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const results = await checkAllEndpoints();
    return NextResponse.json({ ok: true, results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
