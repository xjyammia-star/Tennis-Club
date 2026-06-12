import { getDb } from './db.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: '方法不允许' })

  const sql = getDb()
  const { level, gender, mode, tour } = req.query

  // ══════════════════════════════════════════════════════
  // 新模式：mode=boundary
  // 用途：查询某巡回赛排名末位球员的积分，作为系统生成球员积分的上限基准
  // 参数：tour=ATP|WTA|ITF_JUNIOR, gender=male|female（ITF专用）
  // 返回：{ tour, boundaryRank, boundaryPoints }
  // ══════════════════════════════════════════════════════
  if (mode === 'boundary') {
    if (!tour) return res.status(400).json({ error: '缺少 tour 参数' })
    try {
      let player
      if (tour === 'ITF_JUNIOR') {
        if (!gender) return res.status(400).json({ error: 'ITF_JUNIOR 需要 gender 参数' })
        // ITF 取该性别排名最高数字（即最低名次）的球员
        player = await sql`
          SELECT ranking, points
          FROM world_players
          WHERE tour = 'ITF_JUNIOR' AND gender = ${gender}
          ORDER BY ranking DESC
          LIMIT 1
        `
      } else {
        // ATP 或 WTA：取排名最大值（末位）
        player = await sql`
          SELECT ranking, points
          FROM world_players
          WHERE tour = ${tour}
          ORDER BY ranking DESC
          LIMIT 1
        `
      }
      const row = player[0]
      if (!row) return res.status(404).json({ error: '未找到数据' })
      return res.status(200).json({
        tour,
        boundaryRank:   row.ranking,
        boundaryPoints: row.points,
      })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  // ══════════════════════════════════════════════════════
  // 新模式：mode=recruit
  // 用途：招募市场随机抽取真实球员展示
  // 参数：prestige=数字（俱乐部声望），count=数字（最多几个），gender=male|female（可选）
  // 返回：{ players: [...] }
  // 逻辑：声望越高，高排名球员出现概率越高；排名越靠后出现概率越高（末位更容易被招募）
  // ══════════════════════════════════════════════════════
  if (mode === 'recruit') {
    const prestige = parseInt(req.query.prestige) || 0
    const countWanted = Math.min(10, parseInt(req.query.count) || 3)
    const genderFilter = req.query.gender // 可选

    try {
      // 拉取全部球员（ATP+WTA，或按gender过滤），排名从大到小
      // 声望决定可见范围：声望越低，只有排名很靠后的球员才会出现
      // 声望0~1000 → 只可见排名 300~500
      // 声望1000~3000 → 可见排名 100~500
      // 声望3000~6000 → 可见排名 30~500
      // 声望6000+ → 可见排名 1~500
      let minRankVisible
      if      (prestige >= 6000) minRankVisible = 1
      else if (prestige >= 3000) minRankVisible = 30
      else if (prestige >= 1000) minRankVisible = 100
      else                       minRankVisible = 300

      let allPlayers
      if (genderFilter === 'male') {
        allPlayers = await sql`
          SELECT id, ranking, name, age, nationality, points, gender, tour
          FROM world_players
          WHERE tour = 'ATP' AND ranking >= ${minRankVisible}
          ORDER BY ranking ASC
        `
      } else if (genderFilter === 'female') {
        allPlayers = await sql`
          SELECT id, ranking, name, age, nationality, points, gender, tour
          FROM world_players
          WHERE tour = 'WTA' AND ranking >= ${minRankVisible}
          ORDER BY ranking ASC
        `
      } else {
        allPlayers = await sql`
          SELECT id, ranking, name, age, nationality, points, gender, tour
          FROM world_players
          WHERE tour IN ('ATP', 'WTA') AND ranking >= ${minRankVisible}
          ORDER BY ranking ASC
        `
      }

      if (allPlayers.length === 0) return res.status(200).json({ players: [] })

      // 加权随机抽取：排名越靠后越容易被抽到（更容易被低级俱乐部接触）
      // 但顶级球员概率也随声望上升而提高
      // 权重公式：w(rank) = rank^0.8 × prestigeBoost(rank, prestige)
      // prestigeBoost 对高排名球员有放大作用（声望越高越明显）
      const weights = allPlayers.map(p => {
        const rank = p.ranking
        // 基础权重：排名越靠后权重越大（更多普通球员流向招募市场）
        const baseW = Math.pow(rank, 0.8)
        // 声望加成：对前50名球员有显著放大，声望越高加成越大
        const prestigeMult = rank <= 50
          ? 1 + (prestige / 10000) * 5     // 顶级球员：声望每1000 +0.5倍
          : rank <= 150
          ? 1 + (prestige / 10000) * 2
          : 1
        return baseW * prestigeMult
      })

      const totalW = weights.reduce((s, w) => s + w, 0)
      const selected = []
      const usedIdx = new Set()

      for (let i = 0; i < countWanted && selected.length < allPlayers.length; i++) {
        let r = Math.random() * totalW
        for (let j = 0; j < allPlayers.length; j++) {
          if (usedIdx.has(j)) continue
          r -= weights[j]
          if (r <= 0) {
            selected.push(allPlayers[j])
            usedIdx.add(j)
            break
          }
        }
      }

      return res.status(200).json({ players: selected })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  // ══════════════════════════════════════════════════════
  // 原有模式：按赛事级别查询对阵对手（level 参数）
  // ══════════════════════════════════════════════════════
  if (!level) return res.status(400).json({ error: '缺少 level 参数' })

  try {
    const genderMap = { male: 'ATP', female: 'WTA' }
    const tour2 = genderMap[gender] || 'ATP'

    let rankingLimit = 500
    let tourFilter   = [tour2]

    if (level === 'slam')  { rankingLimit = 150; tourFilter = [tour2] }
    if (level === '1000')  { rankingLimit = 300; tourFilter = [tour2] }
    if (level === '500')   { rankingLimit = 500; tourFilter = [tour2] }
    if (level === '250')   { rankingLimit = 500; tourFilter = [tour2] }
    if (level === 'itf')   { rankingLimit = 400; tourFilter = ['ITF_JUNIOR'] }

    const needGenderFilter = (level === 'itf') && (gender === 'male' || gender === 'female')

    const players = needGenderFilter
      ? await sql`
          SELECT id, ranking, name, age, nationality, points, gender, tour
          FROM world_players
          WHERE tour = ANY(${tourFilter})
            AND ranking <= ${rankingLimit}
            AND gender = ${gender}
          ORDER BY ranking ASC
        `
      : await sql`
          SELECT id, ranking, name, age, nationality, points, gender, tour
          FROM world_players
          WHERE tour = ANY(${tourFilter})
            AND ranking <= ${rankingLimit}
          ORDER BY ranking ASC
        `

    return res.status(200).json({ players })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
