"use client";

import { useState } from "react";
import { Lock, X, Eye, EyeOff } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onLoggedIn: (username: string) => void;
}

export function LoginModal({ open, onClose, onLoggedIn }: Props) {
  const [username, setUsername] = useState("root");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setPassword("");
        onLoggedIn(data.username);
        onClose();
      } else {
        setError(data.error || "登录失败");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="panel brushed-metal rounded w-full max-w-sm mx-4 border border-border shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-accent-amber" />
            <span className="text-sm font-bold uppercase tracking-widest">管理员登录</span>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-foreground p-1 rounded"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent-cyan/50"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">
              密码
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent-cyan/50 pr-9"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground"
              >
                {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 rounded border border-accent-red/30 bg-accent-red/5 text-[11px] text-accent-red font-mono">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-industrial py-2 text-[11px] font-bold uppercase tracking-wider rounded border border-accent-cyan bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 disabled:opacity-50"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
      </div>
    </div>
  );
}
