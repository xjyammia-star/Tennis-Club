// ══════════════════════════════════════════════════════
// 场地外租收入计算
// ══════════════════════════════════════════════════════

// ── 外租时间规则 ──────────────────────────────────────
// 每天总可用时间：12小时（06-10点4h + 12-17点5h + 19-22点3h）
// 俱乐部专用时段（不可外租）：10-12点、17-19点
//
// 占用规则：
// - 私教：1名球员 占 1块场地 × 课时小时数
//   例：3人各1小时私教 = 3块场地×1h = 占用3小时（对外租影响=3h）
//
// - 团课：每块场地最多4名球员同时上课
//   需要场地数 = ceil(学员人数 / 4)
//   占用时长 = 需要场地数 × 课时小时数
//   例：8人团课2小时 → ceil(8/4)=2块场地 → 占用4小时
//   例：10人团课2小时 → ceil(10/4)=3块场地 → 占用6小时

// 声望加成（声望0~2000，加成0~20%）
function prestigeBonus(prestige) {
  const maxPrestige = 2000
  const maxBonus    = 0.20
  return Math.min(maxBonus, (prestige / maxPrestige) * maxBonus)
}

// ── 主函数 ────────────────────────────────────────────
// @param params.courtCount         球场数量
// @param params.prestige           俱乐部声望值
// @param params.hourlyRate         每小时租金（元）
// @param params.weekPrivateCounts  每天私教占用场地小时数 { mon: 3, tue: 2, ... }
//                                  = 私教人数 × 课时（每人1块场地）
// @param params.weekGroupCounts    每天团课占用场地小时数 { mon: 4, tue: 6, ... }
//                                  ✅ 已在 weekEngine 里按 ceil(人数/4)×课时 算好传入
// @param params.eventModifier      随机事件修正（-0.5 ~ +0.5）
export function calcCourtRentalIncome({
  courtCount,
  prestige,
  hourlyRate,
  weekPrivateCounts = {},
  weekGroupCounts   = {},
  eventModifier     = 0,
}) {
  const BASE_RATE = 0.60

  const pBonus   = prestigeBonus(prestige)
  const rawRate  = BASE_RATE + pBonus + eventModifier
  const rentRate = Math.min(0.95, Math.max(0.10, rawRate))

  // 每块场地每天可外租时长（固定）
  const DAILY_RENTABLE_PER_COURT = 12  // 06-10(4h) + 12-17(5h) + 19-22(3h)

  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  let totalRentableHours = 0
  const breakdown = []

  DAYS.forEach(day => {
    // 该天所有球场总可外租时长
    const totalSlotHours = DAILY_RENTABLE_PER_COURT * courtCount

    // 私教占用：weekEngine 传来的已是"场地小时数"（人数 × 课时）
    const privateHours = weekPrivateCounts[day] || 0

    // 团课占用：weekEngine 传来的已是"场地小时数"（ceil(人数/4) × 课时）
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
