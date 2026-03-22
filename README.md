# AI API Monitor // CTRL-PANEL

工业风 AI API 健康监控系统，支持 Claude (Anthropic) 和 GPT (OpenAI) 兼容接口的存活检测。

## 功能

- **多端点监控** — 支持添加多个 Claude / GPT 第三方 API 端点
- **定时检测** — 每 1 分钟自动检测所有启用的端点
- **手动触发** — 支持一键手动检测
- **历史记录** — SQLite 存储检测历史，展示最近 60 次检测时间线
- **Uptime 统计** — 24 小时可用率和平均响应时间
- **工业风 UI** — 深色工控机风格界面，硬边面板、网格背景、警示色

## 快速开始

```bash
npm install
npm run dev
```

打开 http://localhost:3000 查看监控面板。

## 添加端点

1. 点击界面右上角 **ADD** 按钮
2. 选择 Provider（Claude / GPT）
3. 填写名称、Base URL、Model 和 API Key
4. 点击 **ADD ENDPOINT**

> **注意**：不填 API Key 也可以检测 API 是否可达（403 表示可达但 key 无效）。

## 检测逻辑

| Provider | 请求路径 | 认证方式 |
|----------|---------|---------|
| Claude   | `{base_url}/v1/messages` | `x-api-key` header |
| GPT      | `{base_url}/v1/chat/completions` | `Bearer` token |

**状态判定**：
- **UP** — 请求成功，或返回 401/403/429（API 可达）
- **DOWN** — 网络不可达或 DNS 解析失败
- **TIMEOUT** — 请求超过 15 秒
- **ERROR** — 其他 HTTP 错误

## 技术栈

- **Next.js 16** — 全栈框架
- **SQLite** (better-sqlite3) — 轻量持久化
- **node-cron** — 定时任务调度
- **TailwindCSS** — 样式
- **Lucide React** — 图标
