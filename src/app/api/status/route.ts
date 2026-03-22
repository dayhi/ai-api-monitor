import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSchedulerStatus } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

// 时间段配置：每个时间段聚合成 slots 个格子
// 前端分多行显示，cols 为每行列数
const TIME_RANGES = [
  { key: "7h", label: "7 小时", hours: 7, slots: 126, cols: 42 },    // 3行×42列, 每格 ~3.3分钟
  { key: "24h", label: "24 小时", hours: 24, slots: 144, cols: 48 },  // 3行×48列, 每格 10分钟
  { key: "7d", label: "7 天", hours: 168, slots: 168, cols: 56 },     // 3行×56列, 每格 1小时
] as const;

interface SlotData {
  total: number;
  up: number;
  down: number;
  avgTtft: number;
  avgTokensPerSec: number;
}

function aggregateSlots(
  records: { status: string; ttft_ms: number; tokens_per_sec: number; checked_at: string }[],
  hours: number,
  slots: number,
): SlotData[] {
  const now = Date.now();
  const rangeMs = hours * 3600_000;
  const slotMs = rangeMs / slots;
  const startTime = now - rangeMs;

  const result: SlotData[] = Array.from({ length: slots }, () => ({
    total: 0, up: 0, down: 0, avgTtft: 0, avgTokensPerSec: 0,
  }));
  const sumTtft: number[] = new Array(slots).fill(0);
  const sumTps: number[] = new Array(slots).fill(0);
  const countTtft: number[] = new Array(slots).fill(0);
  const countTps: number[] = new Array(slots).fill(0);

  for (const r of records) {
    const raw = r.checked_at;
    const t = new Date(raw.endsWith("Z") ? raw : raw + "Z").getTime();
    if (t < startTime) continue;
    const idx = Math.min(Math.floor((t - startTime) / slotMs), slots - 1);
    result[idx].total++;
    if (r.status === "up") result[idx].up++;
    else result[idx].down++;
    if (r.ttft_ms > 0) { sumTtft[idx] += r.ttft_ms; countTtft[idx]++; }
    if (r.tokens_per_sec > 0) { sumTps[idx] += r.tokens_per_sec; countTps[idx]++; }
  }

  for (let i = 0; i < slots; i++) {
    result[i].avgTtft = countTtft[i] > 0 ? Math.round(sumTtft[i] / countTtft[i]) : 0;
    result[i].avgTokensPerSec = countTps[i] > 0 ? Math.round(sumTps[i] / countTps[i]) : 0;
  }

  return result;
}

function computeStats(records: { status: string; ttft_ms: number; tokens_per_sec: number }[]) {
  if (records.length === 0) return { uptime: "N/A", avgTtft: 0, avgTokensPerSec: 0, total: 0 };
  const upCount = records.filter((r) => r.status === "up").length;
  const ttftRecs = records.filter((r) => r.ttft_ms > 0);
  const tpsRecs = records.filter((r) => r.tokens_per_sec > 0);
  const avgTtft = ttftRecs.length > 0
    ? Math.round(ttftRecs.reduce((s, r) => s + r.ttft_ms, 0) / ttftRecs.length)
    : 0;
  const avgTokensPerSec = tpsRecs.length > 0
    ? Math.round(tpsRecs.reduce((s, r) => s + r.tokens_per_sec, 0) / tpsRecs.length)
    : 0;
  return {
    uptime: ((upCount / records.length) * 100).toFixed(1),
    avgTtft,
    avgTokensPerSec,
    total: records.length,
  };
}

export async function GET() {
  const db = getDb();

  const endpoints = db.prepare("SELECT * FROM api_endpoints ORDER BY created_at DESC").all() as any[];

  const statusData = endpoints.map((ep) => {
    const latest = db.prepare(`
      SELECT * FROM check_results 
      WHERE endpoint_id = ? 
      ORDER BY checked_at DESC 
      LIMIT 1
    `).get(ep.id) as any;

    // 取最近 7 天所有记录（覆盖所有时间段）
    const allRecords = db.prepare(`
      SELECT status, ttft_ms, tokens_per_sec, checked_at 
      FROM check_results 
      WHERE endpoint_id = ? AND checked_at > datetime('now', '-7 days')
      ORDER BY checked_at ASC
    `).all(ep.id) as { status: string; ttft_ms: number; tokens_per_sec: number; checked_at: string }[];

    // 为每个时间段聚合格子数据和统计
    const ranges: Record<string, { slots: SlotData[]; cols: number; uptime: string; avgTtft: number; avgTokensPerSec: number; total: number }> = {};
    const now = Date.now();
    for (const tr of TIME_RANGES) {
      const cutoff = now - tr.hours * 3600_000;
      const filtered = allRecords.filter((r) => {
        const raw = r.checked_at;
        return new Date(raw.endsWith("Z") ? raw : raw + "Z").getTime() >= cutoff;
      });
      const slots = aggregateSlots(filtered, tr.hours, tr.slots);
      const stats = computeStats(filtered);
      ranges[tr.key] = { slots, cols: tr.cols, ...stats };
    }

    return {
      endpoint: {
        id: ep.id,
        name: ep.name,
        provider: ep.provider,
        base_url: ep.base_url,
        model: ep.model,
        check_mode: ep.check_mode || "chat",
        api_path: ep.api_path || "",
        enabled: ep.enabled === 1,
      },
      latest: latest || null,
      ranges,
    };
  });

  const scheduler = getSchedulerStatus();

  return NextResponse.json({
    scheduler,
    endpoints: statusData,
    serverTime: new Date().toISOString(),
  });
}
