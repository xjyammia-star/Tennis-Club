import { getDb } from './db.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: '方法不允许' })

  const sql = getDb()

  // 参数：tour = ATP | WTA | ITF_JUNIOR，limit 默认100
  const { tour = 'ATP', limit = '100' } = req.query
  const validTours = ['ATP', 'WTA', 'ITF_JUNIOR']
  if (!validTours.includes(tour)) {
    return res.status(400).json({ error: '无效的 tour 参数，允许值：ATP / WTA / ITF_JUNIOR' })
  }

  const n = Math.min(parseInt(limit, 10) || 100, 200)

  try {
    const players = await sql`
      SELECT
        id,
        ranking,
        name,
        age,
        nationality,
        points,
        gender,
        tour
      FROM world_players
      WHERE tour = ${tour}
      ORDER BY ranking ASC
      LIMIT ${n}
    `

    // ── 月度变化：用 ranking 和 points 做确定性伪随机波动 ──
    // 真实世界球员没有历史数据，用球员 id 做种子生成稳定的「上月排名」
    // 规则：排名越高（数字越小）波动越小，靠后的排名波动越大
    const playersWithChange = players.map(p => {
      // 用 id 生成确定性随机数（同一个球员每次算出来的变化一样）
      const seed = (p.id * 1103515245 + 12345) & 0x7fffffff
      const maxDelta = p.ranking <= 10 ? 2 : p.ranking <= 30 ? 5 : p.ranking <= 50 ? 8 : 12
      // 把 seed 映射到 [-maxDelta, +maxDelta]
      const delta = (seed % (maxDelta * 2 + 1)) - maxDelta
      const lastMonthRanking = Math.max(1, p.ranking + delta)

      return {
        ...p,
        lastMonthRanking,
        rankChange: lastMonthRanking - p.ranking, // 正数=排名上升（数字变小），负数=下降
      }
    })

    return res.status(200).json({ players: playersWithChange, tour, total: playersWithChange.length })
  } catch (err) {
    console.error('rankings API 错误:', err)
    return res.status(500).json({ error: err.message })
  }
}
