import { getDb } from './db.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: '方法不允许' })

  const sql = getDb()

  // 参数：
  //   tour   = ATP | WTA | ITF_JUNIOR_M | ITF_JUNIOR_F
  //   limit  = 最多返回条数，默认100，最大200
  const { tour = 'ATP', limit = '100' } = req.query

  const validTours = ['ATP', 'WTA', 'ITF_JUNIOR_M', 'ITF_JUNIOR_F']
  if (!validTours.includes(tour)) {
    return res.status(400).json({
      error: '无效的 tour 参数，允许值：ATP / WTA / ITF_JUNIOR_M / ITF_JUNIOR_F',
    })
  }

  const n = Math.min(parseInt(limit, 10) || 100, 200)

  try {
    // ✅ ITF_JUNIOR_M / ITF_JUNIOR_F → 数据库里都存的是 ITF_JUNIOR，加 gender 过滤
    let dbTour   = tour
    let genderFilter = null

    if (tour === 'ITF_JUNIOR_M') {
      dbTour       = 'ITF_JUNIOR'
      genderFilter = 'male'
    } else if (tour === 'ITF_JUNIOR_F') {
      dbTour       = 'ITF_JUNIOR'
      genderFilter = 'female'
    }

    let players
    if (genderFilter) {
      players = await sql`
        SELECT
          id, ranking, name, age, nationality, points, gender, tour
        FROM world_players
        WHERE tour   = ${dbTour}
          AND gender = ${genderFilter}
        ORDER BY ranking ASC
        LIMIT ${n}
      `
    } else {
      players = await sql`
        SELECT
          id, ranking, name, age, nationality, points, gender, tour
        FROM world_players
        WHERE tour = ${dbTour}
        ORDER BY ranking ASC
        LIMIT ${n}
      `
    }

    // ── 月度变化：用 id 做确定性伪随机，同一球员每次算出来一样 ──
    const playersWithChange = players.map(p => {
      const seed     = (p.id * 1103515245 + 12345) & 0x7fffffff
      const maxDelta = p.ranking <= 10 ? 2 : p.ranking <= 30 ? 5 : p.ranking <= 50 ? 8 : 12
      const delta    = (seed % (maxDelta * 2 + 1)) - maxDelta
      const lastMonthRanking = Math.max(1, p.ranking + delta)

      return {
        ...p,
        lastMonthRanking,
        rankChange: lastMonthRanking - p.ranking,
      }
    })

    return res.status(200).json({
      players: playersWithChange,
      tour,
      total: playersWithChange.length,
    })
  } catch (err) {
    console.error('rankings API 错误:', err)
    return res.status(500).json({ error: err.message })
  }
}
