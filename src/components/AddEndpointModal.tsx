"use client";

import { useState } from "react";
import { X, ChevronDown } from "lucide-react";

type Provider = "claude" | "openai" | "openai-compatible";
type CheckMode = "chat" | "models" | "responses";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

const PROVIDER_OPTIONS: { value: Provider; label: string; desc: string }[] = [
  { value: "claude", label: "CLAUDE", desc: "Anthropic 原生协议" },
  { value: "openai", label: "OPENAI", desc: "OpenAI 原生协议" },
  { value: "openai-compatible", label: "OAI 兼容", desc: "第三方中转 / OneAPI 等" },
];

const CHECK_MODE_OPTIONS: { value: CheckMode; label: string; desc: string }[] = [
  { value: "chat", label: "对话检测", desc: "Chat Completions 最小请求（消耗极少 token）" },
  { value: "responses", label: "Responses", desc: "OpenAI Responses API（适用于 Codex 等新版接口）" },
  { value: "models", label: "模型列表", desc: "GET /v1/models，零 token 消耗" },
];

const PRESETS: Record<Provider, { url: string; model: string }> = {
  claude: { url: "https://api.anthropic.com", model: "claude-sonnet-4-20250514" },
  openai: { url: "https://api.openai.com", model: "gpt-4o" },
  "openai-compatible": { url: "", model: "" },
};

const PATH_HINTS: Record<Provider, Record<CheckMode, string>> = {
  claude: { chat: "/v1/messages", models: "/v1/models", responses: "/v1/responses" },
  openai: { chat: "/v1/chat/completions", models: "/v1/models", responses: "/v1/responses" },
  "openai-compatible": { chat: "/v1/chat/completions", models: "/v1/models", responses: "/v1/responses" },
};

export function AddEndpointModal({ open, onClose, onAdded }: Props) {
  const [provider, setProvider] = useState<Provider>("claude");
  const [checkMode, setCheckMode] = useState<CheckMode>("chat");
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiPath, setApiPath] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  function applyPreset(p: Provider) {
    const prev = PRESETS[provider];
    const next = PRESETS[p];
    setProvider(p);
    if (!baseUrl || baseUrl === prev.url) setBaseUrl(next.url);
    if (!model || model === prev.model) setModel(next.model);
    setApiPath("");
  }

  const effectivePath = apiPath || PATH_HINTS[provider]?.[checkMode] || "/v1/chat/completions";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          provider,
          base_url: baseUrl,
          model,
          api_key: apiKey,
          check_mode: checkMode,
          api_path: apiPath,
        }),
      });
      setName(""); setBaseUrl(""); setModel("");
      setApiKey(""); setApiPath(""); setShowAdvanced(false);
      onAdded();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const btnCls = (active: boolean) =>
    `btn-industrial flex-1 px-3 py-2 text-[11px] font-bold uppercase tracking-wider rounded border ${
      active
        ? "border-accent-cyan bg-accent-cyan/10 text-accent-cyan"
        : "border-border text-text-muted hover:border-border-light hover:text-foreground"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="panel brushed-metal w-full max-w-lg mx-4 rounded max-h-[90vh] overflow-y-auto">
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-surface z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent-amber rounded-full" />
            <span className="text-sm font-bold uppercase tracking-widest text-accent-amber">
              新增端点
            </span>
          </div>
          <button
            onClick={onClose}
            className="btn-industrial p-1.5 rounded border border-border hover:border-border-light text-text-muted hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Provider */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
              协议类型
            </label>
            <div className="flex gap-2">
              {PROVIDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => applyPreset(opt.value)}
                  className={btnCls(provider === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-text-muted">
              {PROVIDER_OPTIONS.find((o) => o.value === provider)?.desc}
            </p>
          </div>

          {/* Check mode */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
              检测方式
            </label>
            <div className="flex gap-2">
              {CHECK_MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCheckMode(opt.value)}
                  className={btnCls(checkMode === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-text-muted">
              {CHECK_MODE_OPTIONS.find((o) => o.value === checkMode)?.desc}
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">
              显示名称
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：Claude 生产环境"
              className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-accent-cyan"
            />
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">
              接口地址
            </label>
            <input
              required
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={provider === "openai-compatible" ? "https://your-proxy.com" : PRESETS[provider].url}
              className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-accent-cyan font-mono"
            />
            <p className="mt-1 text-[10px] text-text-muted font-mono">
              实际请求: {baseUrl || "..."}{effectivePath}
            </p>
          </div>

          {/* Model */}
          {checkMode !== "models" && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">
                模型
              </label>
              <input
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={PRESETS[provider].model || "model-name"}
                className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-accent-cyan font-mono"
              />
            </div>
          )}

          {/* API Key */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">
              密钥
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-accent-cyan font-mono"
            />
            <p className="mt-1 text-[10px] text-text-muted">
              可选。未填写密钥时，认证错误仍可确认 API 可达性。
            </p>
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-foreground"
          >
            <ChevronDown size={12} className={`transition-transform duration-150 ${showAdvanced ? "rotate-180" : ""}`} />
            高级选项
          </button>

          {showAdvanced && (
            <div className="space-y-3 pl-3 border-l-2 border-border">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">
                  自定义 API 路径
                </label>
                <input
                  value={apiPath}
                  onChange={(e) => setApiPath(e.target.value)}
                  placeholder={PATH_HINTS[provider]?.[checkMode] || "/v1/chat/completions"}
                  className="w-full px-3 py-2 text-sm bg-surface-2 border border-border rounded text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-accent-cyan font-mono"
                />
                <p className="mt-1 text-[10px] text-text-muted">
                  留空则使用默认路径。部分中转站路径可能不同，可在此覆盖。
                </p>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-industrial px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border border-border text-text-muted hover:text-foreground"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-industrial px-5 py-2 text-xs font-bold uppercase tracking-wider rounded border border-accent-cyan bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 disabled:opacity-50"
            >
              {saving ? "保存中..." : "添加端点"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
