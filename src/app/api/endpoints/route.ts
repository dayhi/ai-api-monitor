import { NextRequest, NextResponse } from "next/server";
import { getDb, type ApiEndpoint } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET() {
  const db = getDb();
  const endpoints = db.prepare("SELECT * FROM api_endpoints ORDER BY created_at DESC").all();
  return NextResponse.json(endpoints);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, provider, base_url, model, api_key, check_mode, api_path } = body;

  if (!name || !provider || !base_url) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const id = randomUUID().slice(0, 8);
  const db = getDb();
  db.prepare(`
    INSERT INTO api_endpoints (id, name, provider, base_url, model, api_key, check_mode, api_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, provider, base_url, model || "", api_key || "", check_mode || "chat", api_path || "");

  return NextResponse.json({ id, name, provider, base_url, model });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const db = getDb();
  db.prepare("DELETE FROM check_results WHERE endpoint_id = ?").run(id);
  db.prepare("DELETE FROM api_endpoints WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, enabled } = body;
  if (!id || enabled === undefined) {
    return NextResponse.json({ error: "Missing id or enabled" }, { status: 400 });
  }
  const db = getDb();
  db.prepare("UPDATE api_endpoints SET enabled = ? WHERE id = ?").run(enabled ? 1 : 0, id);
  return NextResponse.json({ ok: true });
}
