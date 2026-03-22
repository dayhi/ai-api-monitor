import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function GET() {
  const sql = getDb();
  const endpoints = await sql`SELECT * FROM api_endpoints ORDER BY created_at DESC`;
  return NextResponse.json(endpoints);
}

export async function POST(req: NextRequest) {
  if (!await getSession(req)) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const body = await req.json();
  const { name, provider, base_url, model, api_key, check_mode, api_path } = body;

  if (!name || !provider || !base_url) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const id = randomUUID().slice(0, 8);
  const sql = getDb();
  await sql`
    INSERT INTO api_endpoints (id, name, provider, base_url, model, api_key, check_mode, api_path)
    VALUES (${id}, ${name}, ${provider}, ${base_url}, ${model || ""}, ${api_key || ""}, ${check_mode || "chat"}, ${api_path || ""})
  `;

  return NextResponse.json({ id, name, provider, base_url, model });
}

export async function DELETE(req: NextRequest) {
  if (!await getSession(req)) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const sql = getDb();
  await sql`DELETE FROM check_results WHERE endpoint_id = ${id}`;
  await sql`DELETE FROM api_endpoints WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!await getSession(req)) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const body = await req.json();
  const { id, enabled } = body;
  if (!id || enabled === undefined) {
    return NextResponse.json({ error: "Missing id or enabled" }, { status: 400 });
  }
  const sql = getDb();
  await sql`UPDATE api_endpoints SET enabled = ${enabled ? 1 : 0} WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
