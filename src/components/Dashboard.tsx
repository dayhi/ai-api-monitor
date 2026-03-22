"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Radio,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  ShieldAlert,
  Activity,
} from "lucide-react";
import { EndpointCard } from "./EndpointCard";
import { AddEndpointModal } from "./AddEndpointModal";

interface StatusData {
  scheduler: { running: boolean; lastCheckTime: string | null; isChecking: boolean };
  endpoints: any[];
  serverTime: string;
}

export function Dashboard() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [checking, setChecking] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      const json = await res.json();
      setData(json);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 60 : c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [data?.scheduler?.lastCheckTime]);

  async function manualCheck() {
    setChecking(true);
    try {
      await fetch("/api/check", { method: "POST" });
      await fetchData();
    } finally {
      setChecking(false);
    }
  }

  async function toggleEndpoint(id: string, enabled: boolean) {
    await fetch("/api/endpoints", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled }),
    });
    fetchData();
  }

  async function deleteEndpoint(id: string) {
    if (!confirm("确定删除该端点及其所有历史记录？")) return;
    await fetch(`/api/endpoints?id=${id}`, { method: "DELETE" });
    fetchData();
  }

  const endpoints = data?.endpoints || [];
  const totalUp = endpoints.filter(
    (e: any) => e.endpoint.enabled && e.latest?.status === "up"
  ).length;
  const totalDown = endpoints.filter(
    (e: any) =>
      e.endpoint.enabled &&
      (e.latest?.status === "down" || e.latest?.status === "error")
  ).length;
  const totalActive = endpoints.filter((e: any) => e.endpoint.enabled).length;

  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="panel border-b border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Hazard stripe accent */}
          <div className="h-[2px] -mx-4 sm:-mx-6 bg-gradient-to-r from-transparent via-accent-amber/30 to-transparent" />

          <div className="flex items-center justify-between py-3">
            {/* Logo area */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-2 py-1 border border-accent-amber/30 rounded bg-accent-amber/5">
                <Radio size={14} className="text-accent-amber" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent-amber">
                  CTRL
                </span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold uppercase tracking-widest">
                  API MONITOR
                </h1>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">
                  AI 服务健康监控台
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Countdown */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-border rounded text-[10px] font-mono text-text-muted">
                <span className="uppercase tracking-wider">下次检测</span>
                <span className="text-accent-cyan font-bold tabular-nums w-6 text-right">
                  {mounted ? `${countdown}s` : "—"}
                </span>
              </div>

              <button
                onClick={manualCheck}
                disabled={checking}
                className="btn-industrial flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded border border-border text-text-dim hover:text-accent-cyan hover:border-accent-cyan/30 disabled:opacity-50"
              >
                <RefreshCw
                  size={12}
                  className={checking ? "animate-spin" : ""}
                />
                立即检测
              </button>

              <button
                onClick={() => setShowAdd(true)}
                className="btn-industrial flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded border border-accent-cyan bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20"
              >
                <Plus size={12} />
                添加
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Summary strip */}
      <div className="border-b border-border bg-surface/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-6">
          <SummaryChip
            icon={<Server size={12} />}
            label="端点数"
            value={String(totalActive)}
            color="text-text-dim"
          />
          <SummaryChip
            icon={<ShieldCheck size={12} />}
            label="在线"
            value={String(totalUp)}
            color="text-accent-green"
          />
          <SummaryChip
            icon={<ShieldAlert size={12} />}
            label="离线"
            value={String(totalDown)}
            color={totalDown > 0 ? "text-accent-red" : "text-text-muted"}
          />
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-text-muted">
            <Activity size={10} />
            <span className="font-mono">
              {data?.scheduler?.running ? "调度器运行中" : "调度器已停止"}
            </span>
            {data?.scheduler?.isChecking && (
              <span className="text-accent-amber ml-1">● 检测中</span>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {loading && !data ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-text-muted">
              <RefreshCw size={16} className="animate-spin" />
              <span className="text-sm uppercase tracking-wider">
                系统初始化中...
              </span>
            </div>
          </div>
        ) : endpoints.length === 0 ? (
          <EmptyState onAdd={() => setShowAdd(true)} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {endpoints.map((ep: any) => (
              <EndpointCard
                key={ep.endpoint.id}
                data={ep}
                onToggle={toggleEndpoint}
                onDelete={deleteEndpoint}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between text-[10px] text-text-muted font-mono">
          <span>SYS // API-监控系统 v1.0</span>
          {data?.serverTime && (
            <span>
              服务器时间: {formatDateTime(data.serverTime)}
            </span>
          )}
        </div>
      </footer>

      <AddEndpointModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdded={fetchData}
      />
    </div>
  );
}

function SummaryChip({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-text-muted">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
        {label}
      </span>
      <span className={`text-sm font-bold font-mono ${color}`}>{value}</span>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="panel brushed-metal rounded p-8 text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded border border-border flex items-center justify-center bg-surface-2">
          <Radio size={24} className="text-text-muted" />
        </div>
        <h2 className="text-lg font-bold uppercase tracking-wider mb-2">
          未配置监控端点
        </h2>
        <p className="text-sm text-text-muted mb-6 leading-relaxed">
          添加第一个 AI API 端点开始监控。支持 Claude (Anthropic)
          和 GPT (OpenAI) 兼容接口。
        </p>
        <button
          onClick={onAdd}
          className="btn-industrial inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded border border-accent-cyan bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20"
        >
          <Plus size={14} />
          添加第一个端点
        </button>
      </div>

      {/* Decorative bolt corners */}
      <div className="mt-8 grid grid-cols-2 gap-4 text-[10px] text-text-muted/40 font-mono">
        <span>◆ CLAUDE / ANTHROPIC</span>
        <span>◆ GPT / OPENAI</span>
      </div>
    </div>
  );
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
