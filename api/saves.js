import { getDb } from './db.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const sql = getDb()

  // ── GET: 读取用户存档 ──────────────────────────────
  if (req.method === 'GET') {
    // ✅ 用 URL API 替代已废弃的 url.parse()
    const { searchParams } = new URL(req.url, `https://${req.headers.host}`)
    const userId = searchParams.get('userId')
    const slot   = searchParams.get('slot')

    if (!userId) return res.status(400).json({ error: '缺少 userId' })

    try {
      if (slot) {
        // 读取指定槽位（含完整 state_json）
        const saves = await sql`
          SELECT id, user_id, club_name, current_year, current_week,
                 funds, reputation, difficulty, slot, state_json, updated_at
          FROM game_saves
          WHERE user_id = ${userId} AND slot = ${parseInt(slot, 10)}
          LIMIT 1
        `
        return res.status(200).json({ save: saves[0] || null })
      } else {
        // 读取全部槽位（不含 state_json，只用于界面展示）
        const saves = await sql`
          SELECT id, user_id, club_name, current_year, current_week,
                 funds, reputation, difficulty, slot, updated_at
          FROM game_saves
          WHERE user_id = ${userId}
          ORDER BY slot ASC
        `
        return res.status(200).json({ saves })
      }
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  // ── POST: 存档操作 ──────────────────────────────────
  if (req.method === 'POST') {
    const { action, userId, slot, saveData } = req.body

    // save：写入或覆盖存档
    if (action === 'save') {
      if (!userId || !slot || !saveData) {
        return res.status(400).json({ error: '缺少参数' })
      }
      if (slot < 1 || slot > 3) {
        return res.status(400).json({ error: '存档槽位只能是 1-3' })
      }

      try {
        const existing = await sql`
          SELECT id FROM game_saves WHERE user_id = ${userId} AND slot = ${slot}
        `

        if (existing.length > 0) {
          await sql`
            UPDATE game_saves SET
              club_name     = ${saveData.club_name},
              current_year  = ${saveData.current_year},
              current_week  = ${saveData.current_week},
              funds         = ${saveData.funds},
              reputation    = ${saveData.reputation},
              difficulty    = ${saveData.difficulty},
              state_json    = ${saveData.state_json || null},
              updated_at    = NOW()
            WHERE user_id = ${userId} AND slot = ${slot}
          `
          return res.status(200).json({ success: true, action: 'overwritten' })
        } else {
          await sql`
            INSERT INTO game_saves
              (user_id, slot, club_name, current_year, current_week,
               funds, reputation, difficulty, state_json)
            VALUES
              (${userId}, ${slot},
               ${saveData.club_name}, ${saveData.current_year}, ${saveData.current_week},
               ${saveData.funds}, ${saveData.reputation}, ${saveData.difficulty},
               ${saveData.state_json || null})
          `
          return res.status(200).json({ success: true, action: 'created' })
        }
      } catch (err) {
        return res.status(500).json({ error: err.message })
      }
    }

    // check：检查槽位是否有存档
    if (action === 'check') {
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

    // delete：删除指定槽位存档
    if (action === 'delete') {
      if (!userId || !slot) return res.status(400).json({ error: '缺少参数' })
      try {
        await sql`DELETE FROM game_saves WHERE user_id = ${userId} AND slot = ${slot}`
        return res.status(200).json({ success: true })
      } catch (err) {
        return res.status(500).json({ error: err.message })
      }
    }

    return res.status(400).json({ error: '未知操作' })
  }

  return res.status(405).json({ error: '方法不允许' })
}
