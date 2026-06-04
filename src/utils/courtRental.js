// ══════════════════════════════════════════════════════
// 场地外租收入计算
// ══════════════════════════════════════════════════════

// ── 外租时间规则 ──────────────────────────────────────
// 每天总可用时间：12小时（06:00-22:00 扣掉俱乐部专用时段后约12小时可租）
// 俱乐部专用时段（不可外租）：10-12点、17-19点
// 可外租时段：06-10点(4h) + 12-17点(5h) + 19-22点(3h) = 12小时/场
//
// ✅ 问题5修复：
// 外租可用时间 = 总可外租时间 - 私教占用时间 - 团课占用时间
// 收入 = 实际可外租时间 × 出租率 × 每小时租金

// 声望加成（声望0~2000，加成0~20%）
function prestigeBonus(prestige) {
  const maxPrestige = 2000
  const maxBonus    = 0.20
  return Math.min(maxBonus, (prestige / maxPrestige) * maxBonus)
}

// ── 主函数 ────────────────────────────────────────────
// @param params.courtCount           球场数量
// @param params.prestige             俱乐部声望值
// @param params.hourlyRate           每小时租金
// @param params.weekPrivateCounts    每天私教课时数（小时）{ mon: 3.5, tue: 2, ... }
// @param params.weekGroupCounts      每天团课课时数（小时）{ mon: 4, tue: 3, ... }
// @param params.eventModifier        随机事件修正（-0.5 ~ +0.5）
export function calcCourtRentalIncome({
  courtCount,
  prestige,
  hourlyRate,
  weekPrivateCounts = {},   // 每天私教占用总小时数
  weekGroupCounts   = {},   // ✅ 新增：每天团课占用总小时数
  eventModifier     = 0,
}) {
  const BASE_RATE = 0.60

  // 出租率
  const pBonus  = prestigeBonus(prestige)
  const rawRate = BASE_RATE + pBonus + eventModifier
  const rentRate = Math.min(0.95, Math.max(0.10, rawRate))

  // 每场每天可外租时段（固定）
  // 06-10: 4h，12-17: 5h，19-22: 3h = 共12小时/场/天
  const DAILY_RENTABLE_PER_COURT = 12

  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  let totalRentableHours = 0
  const breakdown = []

  DAYS.forEach(day => {
    // 该天所有球场总可外租时长
    const totalSlotHours = DAILY_RENTABLE_PER_COURT * courtCount

    // ✅ 私教占用：每节私教占1个球场1小时
    const privateHours = weekPrivateCounts[day] || 0

    // ✅ 团课占用：团课在球场举行时占用球场时间
    // weekGroupCounts[day] 已经是总课时（所有球场团课小时数之和）
    const groupHours = weekGroupCounts[day] || 0

    // 实际可外租 = 总时长 - 私教占用 - 团课占用（不低于0）
    const dayRentable = Math.max(0, totalSlotHours - privateHours - groupHours)
    totalRentableHours += dayRentable

    breakdown.push({
      day,
      totalSlotHours,
      privateHours,
      groupHours,
      dayRentable,
    })
  })

  // 实际出租时长（受出租率影响）
  const actualRentedHours = totalRentableHours * rentRate
  const income = Math.round(actualRentedHours * hourlyRate)

  return {
    totalRentableHours: Math.round(totalRentableHours * 10) / 10,
    actualRentedHours:  Math.round(actualRentedHours * 10) / 10,
    rentRate:           Math.round(rentRate * 100),   // 百分比整数
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
