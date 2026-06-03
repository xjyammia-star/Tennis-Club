// ══════════════════════════════════════════════════════
// 「下一周」核心引擎
// 每次点击「进入下一周」时调用，返回新的完整 state
// ══════════════════════════════════════════════════════

import { getClubSettings } from './clubSettings'
import { calcCourtRentalIncome } from './courtRental'
import { generatePrivateLessons } from './privateLesson'

// ── 随机事件库 ────────────────────────────────────────
const RANDOM_EVENTS = [
  { type: 'skill', weight: 3, gen: (players) => {
    const p = players[Math.floor(Math.random() * players.length)]
    const skills = ['上旋月亮','大力奇迹','侧旋发球','底线无敌','极限救球','网前幽灵']
    const skill = skills[Math.floor(Math.random() * skills.length)]
    if (p.skills.includes(skill)) return null
    return { playerIds: [p.id], skill, text: `${p.name}在训练中领悟了「${skill}」技能，天赋潜力令人期待。` }
  }},
  { type: 'finance', weight: 4, gen: () => {
    const bonus = Math.floor(Math.random() * 5000 + 1000)
    return { amount: bonus, text: `本周收到一笔额外赞助收入 ¥${bonus.toLocaleString()}。` }
  }},
  { type: 'player', weight: 3, gen: (players) => {
    const healthy = players.filter(p => p.health === 'healthy')
    if (!healthy.length) return null
    const p = healthy[Math.floor(Math.random() * healthy.length)]
    return { playerIds: [p.id], text: `${p.name}本周训练状态极佳，疲劳恢复速度加快。` }
  }},
  { type: 'sponsor', weight: 2, gen: (players) => {
    const unsponsored = players.filter(p => !p.isSponsored && p.talent >= 70)
    if (!unsponsored.length) return null
    const p = unsponsored[Math.floor(Math.random() * unsponsored.length)]
    return { playerIds: [p.id], text: `赞助商对${p.name}表示兴趣，下周将进行赞助谈判。` }
  }},
]

function randomEvent(players) {
  const totalWeight = RANDOM_EVENTS.reduce((s, e) => s + e.weight, 0)
  let r = Math.random() * totalWeight
  for (const ev of RANDOM_EVENTS) {
    r -= ev.weight
    if (r <= 0) {
      const result = ev.gen(players)
      if (result) return { type: ev.type, ...result }
      return null
    }
  }
  return null
}

// ── 疲劳年龄系数 ──────────────────────────────────────
function getFatiguePerHour(age) {
  if (age <= 11) return 20
  if (age <= 14) return 15
  if (age <= 18) return 10
  return 8
}

const DAILY_FATIGUE_RECOVERY = 50

// ── 按天模拟疲劳（7天滚动）────────────────────────────
function simulateFatigueByDay(startFatigue, age, schedule) {
  const DAYS_KEYS = ['mon','tue','wed','thu','fri','sat','sun']
  const fatiguePerHour = getFatiguePerHour(age)
  let fatigue = startFatigue

  DAYS_KEYS.forEach(day => {
    const sessions = schedule[day] || []
    let trainingHours = 0
    sessions.forEach(s => {
      if (s.type !== 'match' && s.type !== 'rest') {
        trainingHours += s.hours || 0
      }
    })
    fatigue = fatigue + trainingHours * fatiguePerHour - DAILY_FATIGUE_RECOVERY
    fatigue = Math.min(100, Math.max(0, fatigue))
  })

  return Math.round(fatigue)
}

// ── 设施效果系数 ──────────────────────────────────────
// 根据设施级别返回训练效果倍率（普通=1.0，高级=1.1，顶级=1.2，糟糕=0.8）
const FACILITY_EFFECT_MULT = { 糟糕: 0.8, 普通: 1.0, 高级: 1.1, 顶级: 1.2 }

// 获取当前设施的训练效果系数
// techMult: 球场级别影响技术经验
// physMult: 健身房级别影响身体经验
// mentalMult: 会议室级别影响精神经验
function getFacilityMultipliers(facilities) {
  // 取所有球场的平均级别效果
  const courts = facilities.filter(f =>
    ['hard_court','clay_court','grass_court'].includes(f.type)
  )
  const techMult = courts.length > 0
    ? courts.reduce((sum, f) => sum + (FACILITY_EFFECT_MULT[f.level] || 1.0), 0) / courts.length
    : 1.0

  // 健身房
  const gym = facilities.find(f => f.type === 'gym')
  const physMult = gym ? (FACILITY_EFFECT_MULT[gym.level] || 1.0) : 0.8 // 没有健身房打8折

  // 会议室
  const meeting = facilities.find(f => f.type === 'meeting')
  const mentalMult = meeting ? (FACILITY_EFFECT_MULT[meeting.level] || 1.0) : 0.8 // 没有会议室打8折

  return { techMult, physMult, mentalMult }
}

// ── 经验获取规则 ──────────────────────────────────────
const COURSE_EXP_PER_HOUR = {
  court_group:   10,
  fitness_group: 10,
  tactics:       10,
  private:       20,
  rest:          0,
}

const COURSE_ATTR_DIST = {
  court_group:   { tech: 2/3, phys: 1/3, mental: 0 },
  fitness_group: { tech: 0,   phys: 1,   mental: 0 },
  tactics:       { tech: 0,   phys: 0,   mental: 1 },
  private:       { tech: 1,   phys: 0,   mental: 0 },
}

export const MATCH_EXP = 50
export const MATCH_ATTR_DIST = { tech: 0.20, phys: 0.20, mental: 0.60 }

const TECH_ATTRS   = ['serve','forehand','backhand','returnServe','volley','footwork']
const PHYS_ATTRS   = ['strength','stamina','agility']
const MENTAL_ATTRS = ['pressure','willpower','focus']

// ── 属性升级阈值 ──────────────────────────────────────
function getExpThreshold(currentValue) {
  if (currentValue < 50) return 200
  if (currentValue < 70) return 400
  if (currentValue < 90) return 700
  return 1000
}

// ── 年龄对经验的影响系数 ──────────────────────────────
function getAgeMultiplier(age, attrType) {
  if (attrType === 'tech') return 1.0
  if (attrType === 'phys') {
    if (age >= 12 && age <= 16) return 2.0
    if (age >= 17 && age <= 30) return 1.0
    return 0.5
  }
  if (attrType === 'mental') {
    if (age >= 8  && age <= 16) return 0.5
    if (age >= 17 && age <= 25) return 1.0
    return 2.0
  }
  return 1.0
}

// ── 计算单个球员本周训练经验（含设施系数）──────────────
function calcPlayerExp(playerId, schedule, coaches, facilityMults) {
  let techExp = 0, physExp = 0, mentalExp = 0

  Object.values(schedule).forEach(sessions => {
    sessions.forEach(s => {
      if (!s.playerIds?.includes(playerId)) return
      const expPerHour = COURSE_EXP_PER_HOUR[s.type] || 0
      const hours = s.hours || 1
      const coach = coaches.find(c => c.id === s.coachId)
      const bonusStr = coach?.expBonus || '0%'
      const bonusNum = parseFloat(bonusStr.replace('%', '')) || 0
      const coachBonus = 1 + bonusNum / 100
      const totalExp = expPerHour * hours * coachBonus
      const dist = COURSE_ATTR_DIST[s.type] || { tech: 0.5, phys: 0.5, mental: 0 }

      // 乘以对应设施系数
      techExp   += totalExp * dist.tech   * facilityMults.techMult
      physExp   += totalExp * dist.phys   * facilityMults.physMult
      mentalExp += totalExp * dist.mental * facilityMults.mentalMult
    })
  })

  return { techExp, physExp, mentalExp }
}

// ── 经验写入池 + 判断升级 ────────────────────────────
function applyExpToPool(player, techExp, physExp, mentalExp) {
  const pool = { ...(player.expPool || {}) }
  const talentMult = 0.5 + (player.talent / 100) * 1.0
  const updatedAttrs = {}
  const newPool = { ...pool }

  if (techExp > 0) {
    const actualExp = techExp * talentMult * getAgeMultiplier(player.age, 'tech')
    const targetAttr = TECH_ATTRS[Math.floor(Math.random() * TECH_ATTRS.length)]
    newPool[targetAttr] = (newPool[targetAttr] || 0) + actualExp
    const currentVal = player[targetAttr] || 0
    if (newPool[targetAttr] >= getExpThreshold(currentVal)) {
      newPool[targetAttr] -= getExpThreshold(currentVal)
      updatedAttrs[targetAttr] = Math.min(99, currentVal + 1)
    }
  }

  if (physExp > 0) {
    const actualExp = physExp * talentMult * getAgeMultiplier(player.age, 'phys')
    const targetAttr = PHYS_ATTRS[Math.floor(Math.random() * PHYS_ATTRS.length)]
    newPool[targetAttr] = (newPool[targetAttr] || 0) + actualExp
    const currentVal = player[targetAttr] || 0
    if (newPool[targetAttr] >= getExpThreshold(currentVal)) {
      newPool[targetAttr] -= getExpThreshold(currentVal)
      updatedAttrs[targetAttr] = Math.min(99, currentVal + 1)
    }
  }

  if (mentalExp > 0) {
    const actualExp = mentalExp * talentMult * getAgeMultiplier(player.age, 'mental')
    const targetAttr = MENTAL_ATTRS[Math.floor(Math.random() * MENTAL_ATTRS.length)]
    newPool[targetAttr] = (newPool[targetAttr] || 0) + actualExp
    const currentVal = player[targetAttr] || 0
    if (newPool[targetAttr] >= getExpThreshold(currentVal)) {
      newPool[targetAttr] -= getExpThreshold(currentVal)
      updatedAttrs[targetAttr] = Math.min(99, currentVal + 1)
    }
  }

  return { updatedAttrs, newPool }
}

// ── 主函数 ────────────────────────────────────────────
export function advanceWeekEngine(state) {
  const settings = getClubSettings()
  const { gameState, clubStats, players, coaches, facilities, schedule, finance } = state

  // 1. 推进周历
  let newWeek = gameState.week + 1
  let newYear = gameState.year
  if (newWeek > 52) { newWeek = 1; newYear++ }

  // 2. 生成本周私教排课
  const privateLessons = generatePrivateLessons({
    players, coaches,
    courtCount: clubStats.courtCount,
    isMatchWeek: false,
    settings,
  })

  const DAYS_KEYS = ['mon','tue','wed','thu','fri','sat','sun']
  const fullSchedule = {}
  DAYS_KEYS.forEach(day => {
    const group = (schedule[day] || []).filter(s => s.type !== 'private')
    const priv  = (privateLessons[day] || []).filter(s => s.type === 'private')
    fullSchedule[day] = [...group, ...priv]
  })

  // 3. 读取设施效果系数（新增）
  const facilityMults = getFacilityMultipliers(facilities || [])

  // 4. 计算每个球员的疲劳、经验、属性、伤病
  const updatedPlayers = players.map(player => {
    if (player.health === 'major') {
      return { ...player, fatigue: Math.max(0, Math.round(player.fatigue - DAILY_FATIGUE_RECOVERY * 7)) }
    }

    const newFatigue = simulateFatigueByDay(player.fatigue, player.age, fullSchedule)
    const { techExp, physExp, mentalExp } = calcPlayerExp(player.id, fullSchedule, coaches, facilityMults)
    const { updatedAttrs, newPool } = applyExpToPool(player, techExp, physExp, mentalExp)

    let newHealth = player.health
    if (player.health === 'minor' && Math.random() < 0.4) newHealth = 'healthy'
    if (newHealth === 'healthy' && newFatigue >= 85 && Math.random() < 0.2) newHealth = 'minor'

    return { ...player, ...updatedAttrs, expPool: newPool, fatigue: newFatigue, health: newHealth }
  })

  // 5. 教练合同处理（新增：到期自动离队 + 新闻提醒）
  let contractNews = []
  const updatedCoaches = []

  coaches.forEach(c => {
    const newWeeksLeft = Math.max(0, c.contractWeeksLeft - 1)

    if (newWeeksLeft === 0) {
      // 合同到期：教练自动离队，生成新闻
      contractNews.push({
        id: Date.now() + Math.random(),
        type: 'coach',
        text: `教练${c.name}的合同已到期，已自动离队。`,
        week: newWeek,
      })
      // 不 push 到 updatedCoaches，相当于移除
    } else {
      // 合同剩余8周时发出警告新闻
      if (newWeeksLeft === 8) {
        contractNews.push({
          id: Date.now() + Math.random(),
          type: 'coach',
          text: `⚠️ 教练${c.name}的合同仅剩 8 周，请尽快安排续约。`,
          week: newWeek,
        })
      }
      updatedCoaches.push({ ...c, contractWeeksLeft: newWeeksLeft })
    }
  })

  // 同步更新 clubStats 的 coachCount
  const newCoachCount = updatedCoaches.length

  // 6. 财务结算
  const weekPrivateCounts = {}
  DAYS_KEYS.forEach(day => {
    weekPrivateCounts[day] = (privateLessons[day] || []).reduce(
      (sum, s) => sum + (s.playerIds?.length || 0), 0
    )
  })

  const rentalInfo = calcCourtRentalIncome({
    courtCount: clubStats.courtCount,
    prestige: gameState.prestige,
    hourlyRate: settings.courtHourlyRate,
    weekPrivateCounts,
    eventModifier: 0,
  })

  let privateIncome = 0
  DAYS_KEYS.forEach(day => {
    ;(privateLessons[day] || []).forEach(s => {
      if (!s.isMerged) return
      ;(s.details || []).forEach(d => {
        const coach = coaches.find(c => c.id === d.coachId)
        const level = coach?.level || 'normal'
        const feeMap = {
          elite: settings.privateFeeElite, senior: settings.privateFeeSenior,
          normal: settings.privateFeeNormal, assistant: settings.privateFeeeAssistant,
        }
        privateIncome += Math.round((feeMap[level] || settings.privateFeeNormal) * settings.privateCoachCut / 100)
      })
    })
  })

  let groupIncome = 0
  DAYS_KEYS.forEach(day => {
    ;(schedule[day] || []).forEach(s => {
      if (s.type === 'court_group')   groupIncome += (s.playerIds?.length || 0) * (s.hours || 0) * settings.groupClassFee
      if (s.type === 'fitness_group') groupIncome += (s.playerIds?.length || 0) * (s.hours || 0) * settings.fitnessClassFee
      if (s.type === 'tactics')       groupIncome += (s.playerIds?.length || 0) * (s.hours || 0) * settings.tacticsClassFee
    })
  })

  const coachSalary = updatedCoaches.reduce((sum, c) => sum + c.weeklySalary, 0)
  const insurance   = (updatedPlayers.length + updatedCoaches.length) * 200
  const subsidy     = updatedPlayers.filter(p => p.isSponsored).length * 500

  const weekIncome  = rentalInfo.income + privateIncome + groupIncome
  const weekExpense = coachSalary + insurance + subsidy
  const newCash     = finance.cash + weekIncome - weekExpense

  const newTx = [
    { id: `tx_${newWeek}_1`, type: 'income',  category: 'court_rent',   label: '场地外租',     amount: rentalInfo.income },
    { id: `tx_${newWeek}_2`, type: 'income',  category: 'private_cut',  label: '私教分成',     amount: privateIncome     },
    { id: `tx_${newWeek}_3`, type: 'income',  category: 'group_class',  label: '团课收费',     amount: groupIncome       },
    { id: `tx_${newWeek}_4`, type: 'expense', category: 'coach_salary', label: '教练薪资',     amount: coachSalary       },
    { id: `tx_${newWeek}_5`, type: 'expense', category: 'insurance',    label: '球员保险',     amount: insurance         },
    { id: `tx_${newWeek}_6`, type: 'expense', category: 'subsidy',      label: '赞助球员补助', amount: subsidy           },
  ].filter(t => t.amount > 0)

  // 7. 随机事件
  let newRecentNews = state.recentNews || []

  // 先加合同相关新闻
  newRecentNews = [...contractNews, ...newRecentNews].slice(0, 10)

  if (Math.random() < 0.3) {
    const ev = randomEvent(updatedPlayers)
    if (ev) {
      newRecentNews = [{ id: Date.now(), type: ev.type, text: ev.text, week: newWeek }, ...newRecentNews].slice(0, 10)
      if (ev.type === 'finance' && ev.amount) {
        newTx.push({ id: `tx_${newWeek}_bonus`, type: 'income', category: 'other', label: '随机事件收入', amount: ev.amount })
      }
    }
  }

  const totalIncome  = newTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = newTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  return {
    ...state,
    gameState: { ...gameState, week: newWeek, year: newYear, cash: newCash, prestigeChange: Math.floor(Math.random() * 10 - 3) },
    clubStats: { ...state.clubStats, coachCount: newCoachCount },
    players:  updatedPlayers,
    coaches:  updatedCoaches,
    finance: { ...finance, cash: newCash, weekIncome: totalIncome, weekExpense: totalExpense, weekNet: totalIncome - totalExpense },
    transactions: newTx,
    recentNews: newRecentNews,
  }
}
