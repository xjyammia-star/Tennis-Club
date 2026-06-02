import { getDb } from './db.js'
import { createHash } from 'crypto'

// 简单密码哈希（生产环境建议用 bcrypt，此处用 sha256+salt 简化）
function hashPassword(password) {
  return createHash('sha256').update('tcm_salt_2024_' + password).digest('hex')
}

export default async function handler(req, res) {
  // 跨域头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const sql = getDb()

  // ── GET: 管理员获取用户列表 ──
  if (req.method === 'GET') {
    const { action } = req.query
    if (action === 'list') {
      try {
        const users = await sql`
          SELECT id, username, email, created_at
          FROM users ORDER BY created_at DESC
        `
        return res.status(200).json({ users })
      } catch (err) {
        return res.status(500).json({ error: err.message })
      }
    }
    return res.status(400).json({ error: '未知操作' })
  }

  // ── POST ──
  if (req.method === 'POST') {
    const { action, email, password, username, userId, newPassword } = req.body

    // 注册
    if (action === 'register') {
      if (!email || !password || !username) {
        return res.status(400).json({ error: '请填写完整信息' })
      }
      if (password.length < 6) {
        return res.status(400).json({ error: '密码至少6位' })
      }
      try {
        const existing = await sql`SELECT id FROM users WHERE email = ${email}`
        if (existing.length > 0) {
          return res.status(400).json({ error: '该邮箱已注册' })
        }
        const hash = hashPassword(password)
        const result = await sql`
          INSERT INTO users (email, password_hash, username)
          VALUES (${email}, ${hash}, ${username})
          RETURNING id, email, username, created_at
        `
        const user = { id: result[0].id, email: result[0].email, username: result[0].username }
        return res.status(200).json({ user })
      } catch (err) {
        return res.status(500).json({ error: err.message })
      }
    }

    // 登录
    if (action === 'login') {
      if (!email || !password) {
        return res.status(400).json({ error: '请输入邮箱和密码' })
      }
      try {
        const hash = hashPassword(password)
        const result = await sql`
          SELECT id, email, username FROM users
          WHERE email = ${email} AND password_hash = ${hash}
        `
        if (result.length === 0) {
          return res.status(401).json({ error: '邮箱或密码错误' })
        }
        const user = { id: result[0].id, email: result[0].email, username: result[0].username }
        return res.status(200).json({ user })
      } catch (err) {
        return res.status(500).json({ error: err.message })
      }
    }

    // 管理员重置密码
    if (action === 'resetPassword') {
      if (!userId || !newPassword) {
        return res.status(400).json({ error: '缺少参数' })
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: '新密码至少6位' })
      }
      try {
        const hash = hashPassword(newPassword)
        await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${userId}`
        return res.status(200).json({ success: true })
      } catch (err) {
        return res.status(500).json({ error: err.message })
      }
    }

    return res.status(400).json({ error: '未知操作' })
  }

  return res.status(405).json({ error: '方法不允许' })
}
