"use client";

import { Shield, ShieldAlert, ShieldOff, Clock } from "lucide-react";

type Status = "up" | "down" | "timeout" | "error" | null;

const config: Record<string, { icon: typeof Shield; label: string; color: string; bg: string; border: string }> = {
  up: {
    icon: Shield,
    label: "在线",
    color: "text-accent-green",
    bg: "bg-accent-green/10",
    border: "border-accent-green/30",
  },
  down: {
    icon: ShieldOff,
    label: "离线",
    color: "text-accent-red",
    bg: "bg-accent-red/10",
    border: "border-accent-red/30",
  },
  timeout: {
    icon: Clock,
    label: "超时",
    color: "text-accent-amber",
    bg: "bg-accent-amber/10",
    border: "border-accent-amber/30",
  },
  error: {
    icon: ShieldAlert,
    label: "异常",
    color: "text-accent-orange",
    bg: "bg-accent-orange/10",
    border: "border-accent-orange/30",
  },
};

export function StatusBadge({ status }: { status: Status }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-text-muted border border-border rounded">
        <span className="w-2 h-2 rounded-full bg-text-muted" />
        等待中
      </span>
    );
  }

  const c = config[status] || config.error;
  const Icon = c.icon;
  const isAlert = status === "down" || status === "error";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${c.color} ${c.bg} border ${c.border} rounded ${isAlert ? "alert-blink" : ""}`}
    >
      <span className={`w-2 h-2 rounded-full bg-current ${status === "up" ? "status-pulse" : ""}`} />
      {c.label}
    </span>
  );
}

export function StatusDot({ status }: { status: Status }) {
  const colorMap: Record<string, string> = {
    up: "bg-accent-green",
    down: "bg-accent-red",
    timeout: "bg-accent-amber",
    error: "bg-accent-orange",
  };
  const color = status ? colorMap[status] || "bg-text-muted" : "bg-text-muted";
  return <span className={`inline-block w-1.5 h-4 rounded-[1px] ${color}`} />;
}
