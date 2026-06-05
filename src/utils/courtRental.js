// ══════════════════════════════════════════════════════
// 场地外租收入计算
// ══════════════════════════════════════════════════════

// ── 外租时间规则 ──────────────────────────────────────
// 每天总可用时间：12小时（06-10点4h + 12-17点5h + 19-22点3h）
// 俱乐部专用时段（不可外租）：10-12点、17-19点
//
// 占用规则：
// - 私教：1名球员占1块场地 × 1小时
//   例：3人各1小时私教 = 占用3小时
//
// - 团课：每块场地最多4名球员
//   需要场地数 = ceil(学员人数 / 4)
//   占用时长 = 需要场地数 × 课时小时数
//   例：8人2小时团课 → ceil(8/4)=2块场地 → 占用4小时
//   例：10人2小时团课 → ceil(10/4)=3块场地 → 占用6小时

const DAYS_KEYS = ['mon','tue','wed','thu','fri','sat','sun']
const PLAYERS_PER_COURT = 4

// ══════════════════════════════════════════════════════
// ✅ 共用参数提取函数
// SchedulePage、ClubSettingsPage、weekEngine 全部调用此函数
// 保证三处计算逻辑完全一致
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
      // isMerged 是合并显示的私教卡片，playerIds.length = 总人数
      privateHours += s.isMerged ? (s.playerIds?.length || 0) : 1
    })
    weekPrivateCounts[day] = privateHours

    // 团课占用：ceil(学员人数 / 4) × 课时小时数
    let courtHours = 0
    ;(schedule[day] || []).forEach(s => {
      if (s.type !== 'court_group') return
      const courtsNeeded = Math.ceil((s.playerIds?.length || 0) / PLAYERS_PER_COURT)
      courtHours += courtsNeeded * (s.hours || 0)
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
// @param params.courtCount         球场数量
// @param params.prestige           俱乐部声望值
// @param params.hourlyRate         每小时租金（元）
// @param params.weekPrivateCounts  由 calcRentalParams 生成
// @param params.weekGroupCounts    由 calcRentalParams 生成
// @param params.eventModifier      随机事件修正（-0.5 ~ +0.5）
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

  // 每块场地每天可外租时长（固定12小时）
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
