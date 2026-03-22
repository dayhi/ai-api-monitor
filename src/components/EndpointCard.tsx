"use client";

import { useState, useCallback } from "react";
import { Trash2, Power, PowerOff, Activity, Clock, Zap } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

interface SlotData {
  total: number;
  up: number;
  down: number;
  avgTtft: number;
  avgTokensPerSec: number;
}

interface RangeData {
  slots: SlotData[];
  cols: number;
  uptime: string;
  avgTtft: number;
  avgTokensPerSec: number;
  total: number;
}

interface EndpointData {
  endpoint: {
    id: string;
    name: string;
    provider: string;
    base_url: string;
    model: string;
    check_mode: string;
    api_path: string;
    enabled: boolean;
  };
  latest: {
    status: string;
    response_time_ms: number;
    error_message: string;
    checked_at: string;
  } | null;
  ranges: Record<string, RangeData>;
}

interface Props {
  data: EndpointData;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}

const RANGE_ROWS = [
  { key: "7h", label: "7小时", perSlot: "~3分钟" },
  { key: "24h", label: "24小时", perSlot: "10分钟" },
  { key: "7d", label: "7天", perSlot: "1小时" },
];

export function EndpointCard({ data, onToggle, onDelete }: Props) {
  const { endpoint, latest, ranges } = data;
  const status = latest?.status as "up" | "down" | "timeout" | "error" | null;
  const isDown = status === "down" || status === "error";

  const range24h = ranges?.["24h"] || { slots: [], cols: 48, uptime: "N/A", avgResponseTime: 0, total: 0 };

  return (
    <div
      className={`panel brushed-metal rounded overflow-hidden transition-all duration-150 ${
        isDown ? "border-accent-red/40" : ""
      } ${!endpoint.enabled ? "opacity-50" : ""}`}
    >
      {isDown && endpoint.enabled && (
        <div className="h-1 bg-gradient-to-r from-accent-red/60 via-accent-orange/40 to-accent-red/60" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <StatusBadge status={endpoint.enabled ? status : null} />
          <div className="min-w-0">
            <h3 className="text-sm font-bold uppercase tracking-wide truncate">
              {endpoint.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span
                className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${providerStyle(endpoint.provider)}`}
              >
                {providerLabel(endpoint.provider)}
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border border-border text-text-muted"
              >
                {checkModeLabel(endpoint.check_mode)}
              </span>
              {endpoint.model && (
                <span className="text-[10px] text-text-muted font-mono truncate">
                  {endpoint.model}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onToggle(endpoint.id, !endpoint.enabled)}
            className="btn-industrial p-1.5 rounded border border-border hover:border-border-light text-text-muted hover:text-foreground"
            title={endpoint.enabled ? "禁用" : "启用"}
          >
            {endpoint.enabled ? <Power size={13} /> : <PowerOff size={13} />}
          </button>
          <button
            onClick={() => onDelete(endpoint.id)}
            className="btn-industrial p-1.5 rounded border border-border hover:border-accent-red/50 text-text-muted hover:text-accent-red"
            title="删除"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        <MetricCell
          icon={<Activity size={12} />}
          label="24h 可用率"
          value={range24h.uptime === "N/A" ? "—" : `${range24h.uptime}%`}
          highlight={
            range24h.uptime !== "N/A" && parseFloat(range24h.uptime) >= 99
              ? "text-accent-green"
              : range24h.uptime !== "N/A" && parseFloat(range24h.uptime) < 90
                ? "text-accent-red"
                : "text-accent-amber"
          }
        />
        <MetricCell
          icon={<Clock size={12} />}
          label="24h TTFT"
          value={range24h.avgTtft ? `${range24h.avgTtft}ms` : "—"}
          highlight={
            range24h.avgTtft && range24h.avgTtft < 500
              ? "text-accent-green"
              : range24h.avgTtft && range24h.avgTtft < 2000
                ? "text-accent-amber"
                : "text-text-dim"
          }
        />
        <MetricCell
          icon={<Zap size={12} />}
          label="Token/s"
          value={range24h.avgTokensPerSec ? `${range24h.avgTokensPerSec}` : "—"}
          highlight={
            range24h.avgTokensPerSec && range24h.avgTokensPerSec >= 20
              ? "text-accent-green"
              : range24h.avgTokensPerSec && range24h.avgTokensPerSec >= 5
                ? "text-accent-amber"
                : "text-text-dim"
          }
        />
      </div>

      {/* Multi-row timelines */}
      <div className="px-4 py-3 space-y-3">
        {RANGE_ROWS.map((row) => {
          const r = ranges?.[row.key];
          return (
            <div key={row.key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    {row.label}
                  </span>
                  <span className="text-[9px] text-text-muted/60 font-mono">
                    ({row.perSlot}/格)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-mono text-text-muted">
                  {r && r.uptime !== "N/A" && (
                    <span className={
                      parseFloat(r.uptime) >= 99 ? "text-accent-green" :
                      parseFloat(r.uptime) < 90 ? "text-accent-red" : "text-accent-amber"
                    }>
                      {r.uptime}%
                    </span>
                  )}
                  <span>{r?.total || 0} 次</span>
                </div>
              </div>
              <TimelineGrid
                slots={r?.slots || []}
                cols={r?.cols || 48}
              />
            </div>
          );
        })}
      </div>

      {/* Error message */}
      {latest?.error_message && endpoint.enabled && (
        <div className="px-4 pb-3">
          <div className="hazard-stripe rounded px-3 py-2 border border-border">
            <p className="text-[10px] font-mono text-text-muted leading-relaxed break-all">
              {latest.error_message}
            </p>
          </div>
        </div>
      )}

      {/* Base URL footer */}
      <div className="px-4 py-2 border-t border-border bg-surface-2/50">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-text-muted truncate">
            {endpoint.base_url}
          </span>
          {latest?.checked_at && (
            <span className="text-[10px] text-text-muted font-mono shrink-0 ml-2">
              {formatTime(latest.checked_at)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function slotColor(s: SlotData): string {
  if (s.total === 0) return "bg-surface-2";
  if (s.down === 0) return "bg-accent-green";
  if (s.up === 0) return "bg-accent-red";
  const ratio = s.up / s.total;
  return ratio >= 0.8 ? "bg-accent-amber" : "bg-accent-orange";
}

function slotTooltipText(s: SlotData): string {
  if (s.total === 0) return "无数据";
  const rate = ((s.up / s.total) * 100).toFixed(0);
  return `正确率 ${rate}% | ${s.up}/${s.total} 成功`;
}

function TimelineGrid({ slots, cols }: { slots: SlotData[]; cols: number }) {
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null);

  const handleEnter = useCallback((e: React.MouseEvent, idx: number) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHover({ idx, x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  const handleLeave = useCallback(() => setHover(null), []);

  if (!slots || slots.length === 0) {
    return (
      <div
        className="grid gap-[1px]"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {Array.from({ length: cols * 3 }).map((_, i) => (
          <div key={i} className="h-[6px] bg-surface-2 rounded-[1px]" />
        ))}
      </div>
    );
  }

  const rows = Math.ceil(slots.length / cols);

  return (
    <div className="relative">
      <div
        className="grid gap-[1px]"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {slots.map((s, i) => (
          <div
            key={i}
            className={`h-[6px] rounded-[1px] ${slotColor(s)} cursor-pointer transition-all hover:brightness-125 hover:scale-y-150`}
            onMouseEnter={(e) => handleEnter(e, i)}
            onMouseLeave={handleLeave}
          />
        ))}
        {/* 补齐末行 */}
        {slots.length % cols !== 0 &&
          Array.from({ length: cols - (slots.length % cols) }).map((_, i) => (
            <div key={`pad-${i}`} className="h-[6px] bg-surface-2/30 rounded-[1px]" />
          ))
        }
      </div>

      {/* Tooltip */}
      {hover !== null && slots[hover.idx] && (
        <SlotTooltip slot={slots[hover.idx]} x={hover.x} y={hover.y} />
      )}
    </div>
  );
}

function SlotTooltip({ slot, x, y }: { slot: SlotData; x: number; y: number }) {
  if (slot.total === 0) {
    return (
      <div
        className="fixed z-50 pointer-events-none px-2.5 py-1.5 rounded border border-border bg-surface text-[10px] font-mono text-text-muted shadow-lg whitespace-nowrap"
        style={{ left: x, top: y - 4, transform: "translate(-50%, -100%)" }}
      >
        无数据
      </div>
    );
  }

  const rate = ((slot.up / slot.total) * 100).toFixed(1);
  const rateNum = parseFloat(rate);
  const rateColor = rateNum >= 99 ? "text-accent-green" : rateNum < 90 ? "text-accent-red" : "text-accent-amber";

  return (
    <div
      className="fixed z-50 pointer-events-none px-3 py-2 rounded border border-border bg-surface shadow-lg whitespace-nowrap"
      style={{ left: x, top: y - 4, transform: "translate(-50%, -100%)" }}
    >
      <div className="flex items-center gap-3 text-[10px] font-mono">
        <span className={`font-bold ${rateColor}`}>{rate}%</span>
        <span className="text-text-muted">{slot.up}/{slot.total} 成功</span>
        {slot.avgTtft > 0 && <span className="text-text-muted">TTFT {slot.avgTtft}ms</span>}
        {slot.avgTokensPerSec > 0 && <span className="text-text-muted">{slot.avgTokensPerSec} tok/s</span>}
      </div>
    </div>
  );
}

function MetricCell({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight: string;
}) {
  return (
    <div className="px-3 py-2.5 text-center">
      <div className="flex items-center justify-center gap-1 mb-1 text-text-muted">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <span className={`text-base font-bold font-mono ${highlight}`}>{value}</span>
    </div>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function providerStyle(provider: string): string {
  switch (provider) {
    case "claude":
      return "text-accent-amber border-accent-amber/30 bg-accent-amber/5";
    case "openai":
      return "text-accent-cyan border-accent-cyan/30 bg-accent-cyan/5";
    case "openai-compatible":
      return "text-accent-green border-accent-green/30 bg-accent-green/5";
    default:
      return "text-text-muted border-border";
  }
}

function providerLabel(provider: string): string {
  switch (provider) {
    case "claude": return "CLAUDE";
    case "openai": return "OPENAI";
    case "openai-compatible": return "OAI 兼容";
    default: return provider.toUpperCase();
  }
}

function checkModeLabel(mode: string): string {
  switch (mode) {
    case "models": return "模型列表";
    case "responses": return "Responses";
    default: return "对话检测";
  }
}
