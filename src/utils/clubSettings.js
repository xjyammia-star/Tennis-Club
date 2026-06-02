// 俱乐部经营默认参数
// 单独抽出来避免循环引用
export const DEFAULT_CLUB_SETTINGS = {
  courtHourlyRate:     200,   // 场地每小时租金（元）
  privateCoachCut:     40,    // 俱乐部私教分成比例（%）
  groupClassFee:       80,    // 团课每人每小时收费（元）
  tacticsClassFee:     60,    // 战术课每人每小时收费
  membershipFeeWeekly: 300,   // 会员周费（元/人）
  levelProbBoost:      0.003, // 球员水平对私教概率的影响系数
  wealthCoachBoost:    0.4,   // 富裕球员偏好高级教练的权重加成
}

export function getClubSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('tcm_club_settings'))
    return { ...DEFAULT_CLUB_SETTINGS, ...saved }
  } catch {
    return { ...DEFAULT_CLUB_SETTINGS }
  }
}
