import { getDb, type ApiEndpoint, type CheckResult } from "./db";

const CHECK_TIMEOUT = 20000; // 20s timeout（流式需要更长）

// 默认 API 路径映射
const DEFAULT_PATHS: Record<string, Record<string, string>> = {
  claude: {
    chat: "/v1/messages",
    models: "/v1/models",
    responses: "/v1/responses",
  },
  openai: {
    chat: "/v1/chat/completions",
    models: "/v1/models",
    responses: "/v1/responses",
  },
  "openai-compatible": {
    chat: "/v1/chat/completions",
    models: "/v1/models",
    responses: "/v1/responses",
  },
};

function normalizeBaseUrl(url: string): string {
  // 去除末尾斜杠
  let base = url.replace(/\/+$/, "");
  // 如果 base_url 末尾已经带了 /v1，去掉它（后面路径映射会自动加）
  if (base.endsWith("/v1")) {
    base = base.slice(0, -3);
  }
  return base;
}

function resolveUrl(endpoint: ApiEndpoint): string {
  const base = normalizeBaseUrl(endpoint.base_url);
  // 用户自定义路径优先
  if (endpoint.api_path) {
    return `${base}${endpoint.api_path}`;
  }
  const paths = DEFAULT_PATHS[endpoint.provider] || DEFAULT_PATHS["openai-compatible"];
  const apiPath = paths[endpoint.check_mode] || paths.chat;
  return `${base}${apiPath}`;
}

function buildHeaders(endpoint: ApiEndpoint): Record<string, string> {
  const headers: Record<string, string> = {};

  if (endpoint.check_mode === "models") {
    // GET 请求不需要 Content-Type
  } else {
    headers["Content-Type"] = "application/json";
  }

  if (endpoint.provider === "claude") {
    if (endpoint.api_key) headers["x-api-key"] = endpoint.api_key;
    headers["anthropic-version"] = "2023-06-01";
  } else {
    // openai & openai-compatible 都用 Bearer
    if (endpoint.api_key) headers["Authorization"] = `Bearer ${endpoint.api_key}`;
  }

  return headers;
}

function buildRequest(endpoint: ApiEndpoint): { method: string; body?: string } {
  if (endpoint.check_mode === "models") {
    return { method: "GET" };
  }

  // responses 模式 (OpenAI Responses API) — 流式
  if (endpoint.check_mode === "responses") {
    return {
      method: "POST",
      body: JSON.stringify({
        model: endpoint.model,
        input: [{ role: "user", content: "hi" }],
        max_output_tokens: 200,
        stream: true,
      }),
    };
  }

  // chat 模式 - claude — 流式
  if (endpoint.provider === "claude") {
    return {
      method: "POST",
      body: JSON.stringify({
        model: endpoint.model,
        max_tokens: 200,
        stream: true,
        messages: [{ role: "user", content: "hi" }],
      }),
    };
  }

  // chat 模式 - openai / openai-compatible — 流式
  return {
    method: "POST",
    body: JSON.stringify({
      model: endpoint.model,
      max_tokens: 200,
      stream: true,
      messages: [{ role: "user", content: "hi" }],
    }),
  };
}

// 从 SSE chunk 中提取 token 数量
function countTokensInChunk(chunk: string, provider: string, checkMode: string): number {
  let count = 0;
  const lines = chunk.split("\n");
  for (const line of lines) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (data === "[DONE]") continue;
    try {
      const json = JSON.parse(data);
      if (checkMode === "responses") {
        // OpenAI Responses API
        if (json.type === "response.output_text.delta" && json.delta) count++;
        else if (json.type === "response.done" && json.response?.usage?.output_tokens) {
          count = json.response.usage.output_tokens;
        }
      } else if (provider === "claude") {
        // Claude SSE
        if (json.type === "content_block_delta" && json.delta?.text) count++;
        else if (json.type === "message_delta" && json.usage?.output_tokens) {
          count = json.usage.output_tokens;
        }
      } else {
        // OpenAI chat
        const delta = json.choices?.[0]?.delta?.content;
        if (delta && delta.length > 0) count++;
        // usage chunk (some providers send it)
        if (json.usage?.completion_tokens) count = json.usage.completion_tokens;
      }
    } catch {
      // ignore parse errors
    }
  }
  return count;
}

export async function checkEndpoint(endpoint: ApiEndpoint): Promise<CheckResult> {
  const start = Date.now();
  let status: CheckResult["status"] = "up";
  let errorMessage = "";
  let ttftMs = 0;
  let tokensPerSec = 0;
  let responseTimeMs = 0;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT);

    const url = resolveUrl(endpoint);
    const headers = buildHeaders(endpoint);
    const { method, body } = buildRequest(endpoint);

    const res = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      clearTimeout(timeout);
      const text = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403) {
        status = "up";
        errorMessage = `认证错误 (${res.status}) - API 可达但密钥无效`;
      } else if (res.status === 429) {
        status = "up";
        errorMessage = `限流 (429) - API 可达`;
      } else {
        status = "error";
        errorMessage = `HTTP ${res.status}: ${text.slice(0, 200)}`;
      }
      responseTimeMs = Date.now() - start;
    } else if (endpoint.check_mode === "models") {
      // GET /models — 不需要流，直接耗时
      clearTimeout(timeout);
      await res.text();
      responseTimeMs = Date.now() - start;
    } else {
      // 流式读取：测量 TTFT 和 token 速度
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let firstTokenSeen = false;
      let totalTokens = 0;
      let streamStart = Date.now();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });

          if (!firstTokenSeen) {
            // 检查是否有实际内容 token
            const hasContent = chunk.includes("data:") && !chunk.includes('"[DONE]"');
            if (hasContent) {
              ttftMs = Date.now() - start;
              firstTokenSeen = true;
              streamStart = Date.now();
            }
          }

          totalTokens += countTokensInChunk(chunk, endpoint.provider, endpoint.check_mode);
        }
        reader.releaseLock();
      }

      clearTimeout(timeout);
      const totalMs = Date.now() - start;
      responseTimeMs = totalMs;
      const streamDuration = (totalMs - (ttftMs || totalMs)) / 1000;
      if (totalTokens > 0 && streamDuration > 0) {
        tokensPerSec = Math.round(totalTokens / streamDuration);
      }
    }
  } catch (err: unknown) {
    const elapsed = Date.now() - start;
    if (err instanceof Error) {
      if (err.name === "AbortError" || elapsed >= CHECK_TIMEOUT - 500) {
        status = "timeout";
        errorMessage = `请求超时 (${CHECK_TIMEOUT / 1000}s)`;
      } else {
        status = "down";
        errorMessage = err.message.slice(0, 300);
      }
    } else {
      status = "down";
      errorMessage = "未知错误";
    }
    responseTimeMs = Date.now() - start;
  }

  const db = getDb();
  db.prepare(`
    INSERT INTO check_results (endpoint_id, status, response_time_ms, ttft_ms, tokens_per_sec, error_message)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(endpoint.id, status, responseTimeMs, ttftMs, tokensPerSec, errorMessage);

  return {
    id: 0,
    endpoint_id: endpoint.id,
    status,
    response_time_ms: responseTimeMs,
    ttft_ms: ttftMs,
    tokens_per_sec: tokensPerSec,
    error_message: errorMessage,
    checked_at: new Date().toISOString(),
  };
}

export async function checkAllEndpoints() {
  const db = getDb();
  const endpoints = db.prepare("SELECT * FROM api_endpoints WHERE enabled = 1").all() as ApiEndpoint[];
  const results = await Promise.allSettled(endpoints.map((ep) => checkEndpoint(ep)));
  return results.map((r, i) => ({
    endpoint: endpoints[i],
    result: r.status === "fulfilled" ? r.value : { status: "error" as const, error_message: "Check failed" },
  }));
}
