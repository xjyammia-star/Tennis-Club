// api/game_rankings.js
// 游戏内动态排名系统
// 真实球员积分从 world_players 拷贝为快照（冻结不变）
// 俱乐部球员积分动态累积，按滚动52周规则清算
//
// 接口：
//   POST { action: 'init',          userId, saveSlot, difficulty }         → 初始化排名表（新游戏）
//   POST { action: 'add_points',    userId, saveSlot, entries: [{playerId, playerName, gender, age, tour, points, week, year}] } → 写入积分
//   POST { action: 'purge_old',     userId, saveSlot, currentWeek, currentYear } → 清算过期积分（每年末调用）
//   GET  { userId, saveSlot, tour, limit?, offset? }                       → 读取排名列表
//   POST { action: 'delete_save',   userId, saveSlot }                     → 删档联动清理

import { getDb } from './db.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const sql = getDb()

  // ── GET：读取排名列表 ─────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { searchParams } = new URL(req.url, `https://${req.headers.host}`)
    const userId   = searchParams.get('userId')
    const saveSlot = parseInt(searchParams.get('saveSlot') || '1', 10)
    const tour     = searchParams.get('tour') || 'ATP'
    const limit    = parseInt(searchParams.get('limit') || '100', 10)
    const offset   = parseInt(searchParams.get('offset') || '0', 10)

    if (!userId) return res.status(400).json({ error: '缺少 userId' })

    try {
      // 按总积分降序，取前 limit 条（加 offset 支持翻页）
      const rows = await sql`
        SELECT
          player_id, player_name, gender, age, nationality, tour,
          is_club, total_points,
          ROW_NUMBER() OVER (ORDER BY total_points DESC) AS ranking
        FROM game_rankings
        WHERE user_id = ${userId}
          AND save_slot = ${saveSlot}
          AND tour = ${tour}
          AND total_points > 0
        ORDER BY total_points DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return res.status(200).json({ players: rows })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  // ── POST：各种写操作 ──────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = req.body
    const { action, userId, saveSlot } = body

    if (!userId || !saveSlot) return res.status(400).json({ error: '缺少 userId 或 saveSlot' })

    // ── 初始化：新游戏时从 world_players 拷贝快照 ────────────────────
    if (action === 'init') {
      try {
        // 先清除该槽位旧数据（重新开始同一槽位时）
        await sql`DELETE FROM game_rankings WHERE user_id = ${userId} AND save_slot = ${saveSlot}`

        // 从 world_players 批量插入，积分直接存为 total_points，points_history 留空
        // 真实球员 is_club=false，积分冻结，不会再被 add_points 修改
        await sql`
          INSERT INTO game_rankings
            (user_id, save_slot, player_id, player_name, gender, age, nationality, tour, is_club, total_points, points_history)
          SELECT
            ${userId}, ${saveSlot},
            'real_' || id::text,
            name,
            gender,
            age,
            nationality,
            tour,
            false,
            COALESCE(points, 0),
            '[]'::jsonb
          FROM world_players
          WHERE points > 0
        `
        return res.status(200).json({ success: true })
      } catch (err) {
        return res.status(500).json({ error: err.message })
      }
    }

    // ── 写入积分：俱乐部球员比赛得分 ────────────────────────────────
    // entries: [{ playerId, playerName, gender, age, tour, points, week, year }]
    if (action === 'add_points') {
      const { entries } = body
      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ error: '缺少 entries' })
      }

      try {
        for (const e of entries) {
          if (!e.points || e.points <= 0) continue

          const playerIdStr = `club_${e.playerId}`
          const historyEntry = JSON.stringify({ week: e.week, year: e.year, points: e.points })

          // UPSERT：首次出现时插入，之后追加积分记录
          await sql`
            INSERT INTO game_rankings
              (user_id, save_slot, player_id, player_name, gender, age, nationality, tour, is_club, total_points, points_history)
            VALUES
              (${userId}, ${saveSlot}, ${playerIdStr}, ${e.playerName}, ${e.gender},
               ${e.age}, ${e.nationality || '中国'}, ${e.tour},
               true, ${e.points},
               ${JSON.stringify([{ week: e.week, year: e.year, points: e.points }])}::jsonb)
            ON CONFLICT (user_id, save_slot, player_id)
            DO UPDATE SET
              total_points    = game_rankings.total_points + ${e.points},
              points_history  = game_rankings.points_history || ${historyEntry}::jsonb,
              player_name     = ${e.playerName},
              age             = ${e.age},
              updated_at      = NOW()
          `
        }
        return res.status(200).json({ success: true })
      } catch (err) {
        return res.status(500).json({ error: err.message })
      }
    }

    // ── 清算过期积分（每满52周调用一次）────────────────────────────
    // 滚动52周规则：超过52周前的积分记录作废，重新计算 total_points
    // 只对俱乐部球员（is_club=true）执行，真实球员积分冻结不动
    if (action === 'purge_old') {
      const { currentWeek, currentYear } = body

      try {
        // 找出所有俱乐部球员的积分记录
        const rows = await sql`
          SELECT player_id, points_history
          FROM game_rankings
          WHERE user_id = ${userId} AND save_slot = ${saveSlot} AND is_club = true
        `

        for (const row of rows) {
          const history = Array.isArray(row.points_history) ? row.points_history : []

          // 过滤掉超过52周的记录
          // 总周数 = year*52 + week，超过52周前的即为过期
          const nowTotal = (currentYear - 1) * 52 + currentWeek
          const validHistory = history.filter(h => {
            const hTotal = (h.year - 1) * 52 + h.week
            return nowTotal - hTotal < 52
          })

          const newTotal = validHistory.reduce((sum, h) => sum + (h.points || 0), 0)

          await sql`
            UPDATE game_rankings
            SET total_points   = ${newTotal},
                points_history = ${JSON.stringify(validHistory)}::jsonb,
                updated_at     = NOW()
            WHERE user_id = ${userId} AND save_slot = ${saveSlot} AND player_id = ${row.player_id}
          `
        }

        return res.status(200).json({ success: true, purged: rows.length })
      } catch (err) {
        return res.status(500).json({ error: err.message })
      }
    }

    // ── 删档联动清理 ─────────────────────────────────────────────────
    if (action === 'delete_save') {
      try {
        await sql`DELETE FROM game_rankings WHERE user_id = ${userId} AND save_slot = ${saveSlot}`
        return res.status(200).json({ success: true })
      } catch (err) {
        return res.status(500).json({ error: err.message })
      }
    }

    return res.status(400).json({ error: '未知 action' })
  }

  return res.status(405).json({ error: '方法不允许' })
}
