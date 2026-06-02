// 俱乐部经营默认参数
export const DEFAULT_CLUB_SETTINGS = {
  courtHourlyRate:      200,  // 场地每小时租金（元）
  privateCoachCut:       40,  // 俱乐部私教分成比例（%）
  groupClassFee:         80,  // 团课每人每小时收费（元）
  tacticsClassFee:       60,  // 战术课每人每小时收费（元）
  // 私教费用按教练级别（元/小时）
  privateFeeElite:      800,
  privateFeeSenior:     500,
  privateFeeNormal:     300,
  privateFeeeAssistant: 150,
  levelProbBoost:     0.003,  // 球员水平对私教概率的影响系数
  wealthCoachBoost:     0.4,  // 富裕球员偏好高级教练的权重加成
}

export function getClubSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('tcm_club_settings'))
    return { ...DEFAULT_CLUB_SETTINGS, ...saved }
  } catch {
    return { ...DEFAULT_CLUB_SETTINGS }
  }
}

// 根据教练级别获取私教费用
export function getPrivateFeeByLevel(level, settings) {
  const s = settings || getClubSettings()
  const map = {
    elite:     s.privateFeeElite,
    senior:    s.privateFeeSenior,
    normal:    s.privateFeeNormal,
    assistant: s.privateFeeeAssistant,
  }
  return map[level] ?? s.privateFeeNormal
}

// 计算一节私教课俱乐部收入
export function calcPrivateIncome(coachLevel, settings) {
  const s = settings || getClubSettings()
  const fee = getPrivateFeeByLevel(coachLevel, s)
  return Math.round(fee * s.privateCoachCut / 100)
}
