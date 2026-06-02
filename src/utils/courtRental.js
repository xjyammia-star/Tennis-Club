// ══════════════════════════════════════════════════════
// 场地外租收入计算
// ══════════════════════════════════════════════════════

// ── 外租收入公式 ──────────────────────────────────────
// 出租率 = 基础(60%) + 声望加成(0~20%) + 随机事件修正
// 收入 = 可租时长 × 出租率 × 每小时租金

// 声望加成（声望0~2000，加成0~20%，幅度较小）
function prestigeBonus(prestige) {
  const maxPrestige = 2000
  const maxBonus = 0.20
  return Math.min(maxBonus, (prestige / maxPrestige) * maxBonus)
}

// ── 主函数：计算本周场地外租收入 ─────────────────────
// @param params.courtCount         球场数量
// @param params.prestige           俱乐部声望值
// @param params.hourlyRate         每小时租金（玩家设定）
// @param params.weekPrivateCounts  每天私教场数 { mon:3, tue:2, ... }
// @param params.eventModifier      随机事件修正（-0.5 ~ +0.5）
// @returns { totalHours, rentRate, income, breakdown }
export function calcCourtRentalIncome({
  courtCount,
  prestige,
  hourlyRate,
  weekPrivateCounts = {},
  eventModifier = 0,
}) {
  const BASE_RATE = 0.60

  // 出租率
  const pBonus = prestigeBonus(prestige)
  const rawRate = BASE_RATE + pBonus + eventModifier
  const rentRate = Math.min(0.95, Math.max(0.10, rawRate)) // 限制在10%~95%

  // 每天可租时长明细
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  let totalRentableHours = 0
  const breakdown = []

  DAYS.forEach(day => {
    const privateCount = weekPrivateCounts[day] || 0

    // 06-10点：4小时/场，减去私教占用
    const morningTotal = 4 * courtCount
    const privateUsed  = Math.min(privateCount, courtCount * 2)
    const morningRent  = Math.max(0, morningTotal - privateUsed)

    // 12-17点：5小时/场，全部可租
    const afternoonRent = 5 * courtCount

    // 19-22点：3小时/场，全部可租
    const eveningRent = 3 * courtCount

    const dayTotal = morningRent + afternoonRent + eveningRent
    totalRentableHours += dayTotal

    breakdown.push({
      day,
      morningRent,
      afternoonRent,
      eveningRent,
      dayTotal,
    })
  })

  // 实际出租时长（受出租率影响）
  const actualRentedHours = totalRentableHours * rentRate
  const income = Math.round(actualRentedHours * hourlyRate)

  return {
    totalRentableHours: Math.round(totalRentableHours * 10) / 10,
    actualRentedHours:  Math.round(actualRentedHours * 10) / 10,
    rentRate:           Math.round(rentRate * 100),  // 百分比
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
