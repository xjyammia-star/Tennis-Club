// ══════════════════════════════════════════════════════
// 私教自动排课引擎
// 规则：
//   - 时间固定 06-10点，每节课 1 小时
//   - 每天私教上限 = 球场数 × 2
//   - 同时私教人数 ≤ 教练数量
//   - 家庭背景影响每周次数上限
//   - 球员水平影响概率
//   - 比赛周/受伤球员自动跳过
// ══════════════════════════════════════════════════════

// ── 家庭背景 → 每周私教次数上限 ──────────────────────
const FAMILY_BG_MAP = {
  贫穷: { maxPerWeek: 1,  baseProb: 0.15 }, // 极少甚至没有
  普通: { maxPerWeek: 3,  baseProb: 0.35 },
  小康: { maxPerWeek: 6,  baseProb: 0.60 },
  富裕: { maxPerWeek: 14, baseProb: 0.90 }, // 最多每天2小时
}

// ── 教练级别 → 富裕球员偏好权重 ──────────────────────
const COACH_LEVEL_WEIGHT = {
  elite:     4,  // 顶级教练：富裕球员最偏好
  senior:    3,
  normal:    2,
  assistant: 1,
}

// ── 球员水平计算（技术+身体均值）────────────────────
function playerLevel(player) {
  const tech = (player.serve + player.forehand + player.backhand +
    player.returnServe + player.volley + player.footwork) / 6
  const phys = (player.strength + player.stamina + player.agility) / 3
  return (tech + phys) / 2
}

// ── 概率随机 ──────────────────────────────────────────
function chance(prob) {
  return Math.random() < prob
}

// ── 主函数：生成本周私教安排 ─────────────────────────
// @param players      球员数组
// @param coaches      教练数组
// @param courtCount   球场数量
// @param isMatchWeek  是否比赛周（跳过所有私教）
// @param settings     经营设置（含私教相关参数）
// @returns            weekSchedule 格式的私教记录，按天分组
//   { mon: [{id,slot,type,label,hours,...}], tue: [...], ... }
//   私教统一放入 privateLesson 类型，同一天合并为一条记录

export function generatePrivateLessons({
  players,
  coaches,
  courtCount,
  isMatchWeek = false,
  settings = {},
}) {
  // 比赛周全部跳过
  if (isMatchWeek) return buildEmptyWeek()

  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  const dailyLimit = courtCount * 2       // 每天私教总场数上限
  const coachLimit = coaches.length       // 同时私教人数 ≤ 教练数

  // 概率调整参数（可由settings覆盖）
  const levelProbBoost   = settings.levelProbBoost   ?? 0.003  // 每点水平增加概率
  const wealthCoachBoost = settings.wealthCoachBoost ?? 0.4    // 富裕球员匹配高级教练额外权重

  // 过滤可参加私教的球员（健康 or 轻伤可参加，重伤跳过）
  const eligiblePlayers = players.filter(p =>
    p.health === 'healthy' || p.health === 'minor'
  )

  // 为每个球员计算本周私教分配
  // 结果：{ playerId: { maxSessions, coachId } }
  const assignments = []

  eligiblePlayers.forEach(player => {
    const bg = FAMILY_BG_MAP[player.familyBg] || FAMILY_BG_MAP['普通']
    const level = playerLevel(player)

    // 水平越高概率越大（0-100分范围内）
    const levelBonus = (level - 40) * levelProbBoost  // 低水平球员概率略降
    const finalProb = Math.min(0.98, Math.max(0.05, bg.baseProb + levelBonus))

    // 决定本周是否安排私教
    if (!chance(finalProb)) return

    // 决定本周次数（1 ~ maxPerWeek，随机）
    const maxSessions = bg.maxPerWeek
    const sessionCount = Math.max(1, Math.round(
      1 + Math.random() * (maxSessions - 1)
    ))

    // 为球员匹配教练（富裕球员偏好高级教练）
    const coachId = matchCoach(player, coaches, wealthCoachBoost)
    if (!coachId) return

    assignments.push({ player, coachId, sessionCount })
  })

  // 按天分配私教（不超过每天上限 & 教练上限）
  const weekResult = buildEmptyWeek()
  const dailyCount = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 }

  // 打乱顺序，避免靠前的球员总是抢到位置
  const shuffled = [...assignments].sort(() => Math.random() - 0.5)

  shuffled.forEach(({ player, coachId, sessionCount }) => {
    let scheduled = 0
    const shuffledDays = [...DAYS].sort(() => Math.random() - 0.5)

    for (const day of shuffledDays) {
      if (scheduled >= sessionCount) break

      // 检查当天限额
      if (dailyCount[day] >= dailyLimit) continue
      if (dailyCount[day] >= coachLimit) continue

      // 检查该教练当天是否已被占用（每个教练每个时段只能带一个私教）
      const coachBusy = weekResult[day].some(s => s.coachId === coachId)
      if (coachBusy) continue

      // 安排私教
      dailyCount[day]++
      scheduled++

      const coach = coaches.find(c => c.id === coachId)
      weekResult[day].push({
        id: `private_${player.id}_${day}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        slot: 'private', // 特殊时段标识（06-10点）
        type: 'private',
        label: '私教课',
        hours: 1,
        coachId,
        coachName: coach?.name || '',
        playerIds: [player.id],
        playerNames: [player.name],
        color: '#9a6e0a',
        isAutoScheduled: true, // 标记为系统自动排课
      })
    }
  })

  // 合并同一天的私教为一条展示记录
  return mergePrivateLessons(weekResult)
}

// ── 教练匹配 ──────────────────────────────────────────
function matchCoach(player, coaches, wealthBoost) {
  if (coaches.length === 0) return null

  const bgMap = { 贫穷: 1, 普通: 2, 小康: 3, 富裕: 4 }
  const wealth = bgMap[player.familyBg] || 2

  // 构建权重数组
  const weighted = coaches.map(coach => {
    let weight = COACH_LEVEL_WEIGHT[coach.level] || 1
    // 富裕球员对高级教练加权
    if (wealth >= 3 && (coach.level === 'senior' || coach.level === 'elite')) {
      weight += wealthBoost * wealth
    }
    // 贫穷球员更可能分配到助教
    if (wealth === 1 && coach.level === 'assistant') {
      weight *= 1.5
    }
    return { coach, weight }
  })

  // 加权随机选择
  const totalWeight = weighted.reduce((s, w) => s + w.weight, 0)
  let rand = Math.random() * totalWeight
  for (const { coach, weight } of weighted) {
    rand -= weight
    if (rand <= 0) return coach.id
  }
  return coaches[0].id
}

// ── 合并同天私教为展示用聚合记录 ─────────────────────
// 展示：「周二上午，私教课（3人）」
// 点开后看到每个球员+对应教练
function mergePrivateLessons(weekResult) {
  const merged = buildEmptyWeek()
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

  DAYS.forEach(day => {
    const sessions = weekResult[day]
    if (sessions.length === 0) return

    // 非私教课直接保留
    const nonPrivate = sessions.filter(s => s.type !== 'private')
    const privateSessions = sessions.filter(s => s.type === 'private')

    merged[day] = [...nonPrivate]

    if (privateSessions.length > 0) {
      // 合并为一条聚合记录
      const allPlayerIds   = privateSessions.flatMap(s => s.playerIds)
      const allPlayerNames = privateSessions.flatMap(s => s.playerNames)
      const details = privateSessions.map(s => ({
        playerId:  s.playerIds[0],
        playerName: s.playerNames[0],
        coachId:   s.coachId,
        coachName: s.coachName,
      }))

      merged[day].push({
        id: `private_merged_${day}`,
        slot: 'private',
        type: 'private',
        label: `私教课（${privateSessions.length}人）`,
        hours: privateSessions.length, // 总课时
        coachId: null,   // 合并后无单一教练
        coachName: '系统安排',
        playerIds: allPlayerIds,
        playerNames: allPlayerNames,
        color: '#9a6e0a',
        isAutoScheduled: true,
        isMerged: true,   // 标记为合并记录
        details,          // 详情：[{playerId, playerName, coachId, coachName}]
      })
    }
  })

  return merged
}

// ── 工具：创建空周 ────────────────────────────────────
function buildEmptyWeek() {
  return { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }
}

// ── 导出：获取某天外租可用时长 ───────────────────────
// 06-10点：4小时总量，减去私教占用（每节1小时）
// 12-17点：5小时
// 19-22点：3小时
// 10-12、17-19点：俱乐部专用，不外租
export function calcRentableHours(dayPrivateCount, courtCount) {
  const morningTotal  = 4 * courtCount               // 06-10点总时长
  const privateUsed   = Math.min(dayPrivateCount, courtCount * 2) // 私教占用
  const morningRent   = Math.max(0, morningTotal - privateUsed)

  const afternoonRent = 5 * courtCount  // 12-17点全部可租
  const eveningRent   = 3 * courtCount  // 19-22点全部可租

  return morningRent + afternoonRent + eveningRent
}
