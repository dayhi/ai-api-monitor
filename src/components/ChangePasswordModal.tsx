"use client";

import { useState } from "react";
import { KeyRound, X, Eye, EyeOff } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export function ChangePasswordModal({ open, onClose, onChanged }: Props) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          onChanged();
          onClose();
        }, 1200);
      } else {
        setError(data.error || "修改失败");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="panel brushed-metal rounded w-full max-w-sm mx-4 border border-border shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <KeyRound size={14} className="text-accent-cyan" />
            <span className="text-sm font-bold uppercase tracking-widest">修改密码</span>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-foreground p-1 rounded">
            <X size={14} />
          </button>
        </div>

        {success ? (
          <div className="px-5 py-8 text-center">
            <p className="text-accent-green font-bold text-sm">密码修改成功，请重新登录</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">
                当前密码
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent-cyan/50 pr-9"
                  required
                />
                <button type="button" onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground">
                  {showCurrent ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">
                新密码（至少 4 位）
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent-cyan/50 pr-9"
                  required
                  minLength={4}
                />
                <button type="button" onClick={() => setShowNew((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground">
                  {showNew ? <EyeOff size={13} /> : <Eye size={13} />}
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
              {loading ? "提交中..." : "确认修改"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
