import { neon } from '@neondatabase/serverless'

// 创建数据库连接
// DATABASE_URL 从环境变量读取，本地用 .env.local，线上 Vercel 自动注入
export function getDb() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL 环境变量未设置')
  }
  return neon(databaseUrl)
}
