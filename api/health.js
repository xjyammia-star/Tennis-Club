import { getDb } from './db.js'

export default async function handler(req, res) {
  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只允许 GET 请求' })
  }

  try {
    const sql = getDb()

    // 测试数据库连接：查询球员总数
    const result = await sql`
      SELECT
        (SELECT COUNT(*) FROM world_players WHERE tour = 'ATP') AS atp_count,
        (SELECT COUNT(*) FROM world_players WHERE tour = 'WTA') AS wta_count,
        (SELECT COUNT(*) FROM world_players) AS total_count
    `

    const { atp_count, wta_count, total_count } = result[0]

    return res.status(200).json({
      status: 'ok',
      message: '数据库连接成功',
      data: {
        atp球员数: Number(atp_count),
        wta球员数: Number(wta_count),
        总球员数: Number(total_count)
      }
    })
  } catch (error) {
    console.error('数据库连接失败:', error)
    return res.status(500).json({
      status: 'error',
      message: '数据库连接失败',
      error: error.message
    })
  }
}
