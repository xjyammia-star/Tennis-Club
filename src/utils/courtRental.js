// ══════════════════════════════════════════════════════
// 场地外租收入计算
// ══════════════════════════════════════════════════════

const DAYS_KEYS = ['mon','tue','wed','thu','fri','sat','sun']
const PLAYERS_PER_COURT = 4

// ── 时间段定义（与 SchedulePage 的 FULL_SLOTS 保持一致）──
// 06-10点(4h) 10-12点(2h) 12-17点(5h) 17-20点(3h) 20-22点(2h)
// 可外租时段：06-10点、12-17点、20-22点，共 4+5+2 = 11h/场/天
const DAILY_RENTABLE_PER_COURT = 11

// ══════════════════════════════════════════════════════
// 共用参数提取函数
// SchedulePage、ClubSettingsPage、weekEngine 全部调用此函数
// ══════════════════════════════════════════════════════
export function calcRentalParams(schedule, privateLessons = {}) {
  const weekPrivateCounts = {}
  const weekGroupCounts   = {}

  DAYS_KEYS.forEach(day => {
    // 私教占用：每名球员占1块场地1小时
    let privateHours = 0
    ;(privateLessons[day] || []).forEach(s => {
      if (s.type !== 'private') return
      privateHours += s.isMerged ? (s.playerIds?.length || 0) : 1
    })
    weekPrivateCounts[day] = privateHours

    // 团课占用：ceil(学员人数 / 4) × 课时小时数
    let courtHours = 0
    ;(schedule[day] || []).forEach(s => {
      if (s.type !== 'court_group') return
      const playerCount  = s.playerIds?.length || 0
      const courtsNeeded = playerCount > 0
        ? Math.ceil(playerCount / PLAYERS_PER_COURT)
        : 1
      courtHours += courtsNeeded * (s.hours || 0)
    })
    weekGroupCounts[day] = courtHours
  })

  return { weekPrivateCounts, weekGroupCounts }
}

// ── 声望加成（声望0~2000，加成0~15%）──────────────────
function prestigeBonus(prestige) {
  return Math.min(0.15, (prestige / 2000) * 0.15)
}

// ══════════════════════════════════════════════════════
// 主函数：计算外租收入
// ══════════════════════════════════════════════════════
export function calcCourtRentalIncome({
  courtCount,
  prestige,
  hourlyRate,
  weekPrivateCounts = {},
  weekGroupCounts   = {},
  eventModifier     = 0,
}) {
  // ✅ 第7条：基础出租率从60%降至40%
  const BASE_RATE = 0.40
  const pBonus    = prestigeBonus(prestige)
  const rentRate  = Math.min(0.85, Math.max(0.10, BASE_RATE + pBonus + eventModifier))

  let totalRentableHours = 0
  const breakdown = []

  DAYS_KEYS.forEach(day => {
    // ✅ 第5条：可租总时长从12h改为11h（新时间段）
    const totalSlotHours = DAILY_RENTABLE_PER_COURT * courtCount
    const privateHours   = weekPrivateCounts[day] || 0
    const groupHours     = weekGroupCounts[day]   || 0
    const dayRentable    = Math.max(0, totalSlotHours - privateHours - groupHours)
    totalRentableHours  += dayRentable
    breakdown.push({ day, totalSlotHours, privateHours, groupHours, dayRentable })
  })

  const actualRentedHours = totalRentableHours * rentRate
  const income = Math.round(actualRentedHours * hourlyRate)

  return {
    totalRentableHours: Math.round(totalRentableHours * 10) / 10,
    actualRentedHours:  Math.round(actualRentedHours * 10) / 10,
    rentRate:           Math.round(rentRate * 100),
    prestigeBonus:      Math.round(pBonus * 100),
    eventModifier:      Math.round(eventModifier * 100),
    hourlyRate,
    income,
    breakdown,
  }
}

// ── 出租率描述文字 ────────────────────────────────────
export function rentRateLabel(rate) {
  if (rate >= 75) return '极佳'
  if (rate >= 60) return '良好'
  if (rate >= 45) return '一般'
  if (rate >= 30) return '较低'
  return '冷清'
}
