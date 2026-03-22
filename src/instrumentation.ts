export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Vercel Serverless 环境：调度由 Vercel Cron Jobs 触发，无需本地启动
    // 仅在本地开发时初始化数据库表
    if (process.env.NODE_ENV === "development" && process.env.DATABASE_URL) {
      const { initDb } = await import("@/lib/db");
      await initDb().catch(console.error);
    }
  }
}
