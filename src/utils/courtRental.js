// ══════════════════════════════════════════════════════
// 场地外租收入计算
// ══════════════════════════════════════════════════════

const DAYS_KEYS = ['mon','tue','wed','thu','fri','sat','sun']
const PLAYERS_PER_COURT = 4

// ══════════════════════════════════════════════════════
// 共用参数提取函数
// SchedulePage、ClubSettingsPage、weekEngine 全部调用此函数
//
// @param schedule       训练课表 { mon: [...], tue: [...], ... }
// @param privateLessons 私教课表（可选）
// @returns { weekPrivateCounts, weekGroupCounts }
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
    // ✅ 关键：playerIds 为空时默认按 1 块场地计算（至少占1块）
    let courtHours = 0
    ;(schedule[day] || []).forEach(s => {
      if (s.type !== 'court_group') return
      const playerCount  = s.playerIds?.length || 0
      // 有人数用人数算，没人数（异常情况）至少算1块场地
      const courtsNeeded = playerCount > 0
        ? Math.ceil(playerCount / PLAYERS_PER_COURT)
        : 1
      courtHours += courtsNeeded * (s.hours || 0)

      // 调试日志（上线后可删除）
      console.log(`[外租] ${day} 团课: ${playerCount}人, ${courtsNeeded}块场地, ${s.hours}h → 占用${courtsNeeded * (s.hours || 0)}h`)
    })
    weekGroupCounts[day] = courtHours
  })

  return { weekPrivateCounts, weekGroupCounts }
}

// ── 声望加成（声望0~2000，加成0~20%）──────────────────
function prestigeBonus(prestige) {
  return Math.min(0.20, (prestige / 2000) * 0.20)
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
  const BASE_RATE = 0.60
  const pBonus    = prestigeBonus(prestige)
  const rentRate  = Math.min(0.95, Math.max(0.10, BASE_RATE + pBonus + eventModifier))

  const DAILY_RENTABLE_PER_COURT = 12

  let totalRentableHours = 0
  const breakdown = []

  DAYS_KEYS.forEach(day => {
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
  if (rate >= 85) return '极佳'
  if (rate >= 70) return '良好'
  if (rate >= 55) return '一般'
  if (rate >= 40) return '较低'
  return '冷清'
}
