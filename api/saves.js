import { getDb } from './db.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const sql = getDb()

  // ── GET: 读取用户所有存档 ──
  if (req.method === 'GET') {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: '缺少 userId' })

    try {
      const saves = await sql`
        SELECT id, user_id, club_name, current_year, current_week,
               funds, reputation, difficulty, slot, updated_at
        FROM game_saves
        WHERE user_id = ${userId}
        ORDER BY slot ASC
      `
      return res.status(200).json({ saves })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  // ── POST: 保存/覆盖存档 ──
  if (req.method === 'POST') {
    const { action, userId, slot, saveData } = req.body

    // 写入存档（新建或覆盖）
    if (action === 'save') {
      if (!userId || !slot || !saveData) {
        return res.status(400).json({ error: '缺少参数' })
      }
      if (slot < 1 || slot > 3) {
        return res.status(400).json({ error: '存档槽位只能是 1-3' })
      }

      try {
        // 检查该槽位是否已有存档
        const existing = await sql`
          SELECT id FROM game_saves WHERE user_id = ${userId} AND slot = ${slot}
        `

        if (existing.length > 0) {
          // 覆盖
          await sql`
            UPDATE game_saves SET
              club_name     = ${saveData.club_name},
              current_year  = ${saveData.current_year},
              current_week  = ${saveData.current_week},
              funds         = ${saveData.funds},
              reputation    = ${saveData.reputation},
              difficulty    = ${saveData.difficulty},
              updated_at    = NOW()
            WHERE user_id = ${userId} AND slot = ${slot}
          `
          return res.status(200).json({ success: true, action: 'overwritten' })
        } else {
          // 新建
          await sql`
            INSERT INTO game_saves
              (user_id, slot, club_name, current_year, current_week, funds, reputation, difficulty)
            VALUES
              (${userId}, ${slot}, ${saveData.club_name}, ${saveData.current_year},
               ${saveData.current_week}, ${saveData.funds}, ${saveData.reputation}, ${saveData.difficulty})
          `
          return res.status(200).json({ success: true, action: 'created' })
        }
      } catch (err) {
        return res.status(500).json({ error: err.message })
      }
    }

    // 检查槽位是否有存档（用于覆盖提示）
    if (action === 'check') {
      const { userId, slot } = req.body
      try {
        const existing = await sql`
          SELECT id, club_name, current_year, current_week, updated_at
          FROM game_saves WHERE user_id = ${userId} AND slot = ${slot}
        `
        return res.status(200).json({ exists: existing.length > 0, save: existing[0] || null })
      } catch (err) {
        return res.status(500).json({ error: err.message })
      }
    }

    return res.status(400).json({ error: '未知操作' })
  }

  return res.status(405).json({ error: '方法不允许' })
}
