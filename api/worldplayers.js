import { getDb } from './db.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: '方法不允许' })

  const sql = getDb()

  // 参数：level（赛事级别）, gender（male/female）
  const { level, gender } = req.query
  if (!level) return res.status(400).json({ error: '缺少 level 参数' })

  try {
    // 根据性别确定巡回赛
    const genderMap = { male: 'ATP', female: 'WTA' }
    const tour = genderMap[gender] || 'ATP'

    let rankingLimit = 500
    let tourFilter   = [tour]

    if (level === 'slam')  { rankingLimit = 150; tourFilter = [tour] }
    if (level === '1000')  { rankingLimit = 300; tourFilter = [tour] }
    if (level === '500')   { rankingLimit = 500; tourFilter = [tour] }
    if (level === '250')   { rankingLimit = 500; tourFilter = [tour] }
    if (level === 'itf')   { rankingLimit = 400; tourFilter = ['ITF_JUNIOR'] }

    const players = await sql`
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
