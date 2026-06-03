// ══════════════════════════════════════════════════════
// 「下一周」核心引擎
// 每次点击「进入下一周」时调用，返回新的完整 state
// ══════════════════════════════════════════════════════

import { getClubSettings } from './clubSettings'
import { calcCourtRentalIncome } from './courtRental'
import { generatePrivateLessons } from './privateLesson'
import { SKILL_DEFS, SKILL_NAMES, getSelfLearnChance, canCoachTeach } from '../data/skillDefs'
import { simulateTournament, applyMatchExp } from './matchEngine'

// ── 随机事件库 ────────────────────────────────────────
const RANDOM_EVENTS = [
  { type: 'skill', weight: 3, gen: (players) => {
    // 随机事件版技能领悟：不检查属性，纯随机
    const p = players[Math.floor(Math.random() * players.length)]
    const available = SKILL_NAMES.filter(s => !p.skills?.includes(s))
    if (!available.length) return null
    const skill = available[Math.floor(Math.random() * available.length)]
    return { playerIds: [p.id], skill, text: `${p.name}在训练中突然领悟了「${skill}」技能，令人惊喜！` }
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

// ── 抗伤病属性：根据年龄获取伤病概率 ────────────────
// 伤病概率 = (100 - injuryResist) / 10，最低1%
// 年龄加成：8-11岁下限80，12-14下限70，15-18下限60，18+下限30
// 30岁以后每年减4-7
function getInjuryResistFloor(age) {
  if (age <= 11) return 80
  if (age <= 14) return 70
  if (age <= 18) return 60
  if (age <= 30) return 30
  return Math.max(5, 30 - (age - 30) * 5)
}

function calcInjuryChance(player) {
  const base = player.injuryResist ?? 50
  const floor = getInjuryResistFloor(player.age)
  const effective = Math.max(floor, base)
  return Math.max(0.01, (100 - effective) / 100)
}

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
const FACILITY_EFFECT_MULT = { 糟糕: 0.8, 普通: 1.0, 高级: 1.1, 顶级: 1.2 }

function getFacilityMultipliers(facilities) {
  const courts = facilities.filter(f =>
    ['hard_court','clay_court','grass_court'].includes(f.type)
  )
  const techMult = courts.length > 0
    ? courts.reduce((sum, f) => sum + (FACILITY_EFFECT_MULT[f.level] || 1.0), 0) / courts.length
    : 1.0
  const gym = facilities.find(f => f.type === 'gym')
  const physMult = gym ? (FACILITY_EFFECT_MULT[gym.level] || 1.0) : 0.8
  const meeting = facilities.find(f => f.type === 'meeting')
  const mentalMult = meeting ? (FACILITY_EFFECT_MULT[meeting.level] || 1.0) : 0.8
  return { techMult, physMult, mentalMult }
}

// ── 经验获取规则 ──────────────────────────────────────
const COURSE_EXP_PER_HOUR = {
  court_group: 10, fitness_group: 10, tactics: 10, private: 20, rest: 0,
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

function getExpThreshold(v) {
  if (v < 50) return 200
  if (v < 70) return 400
  if (v < 90) return 700
  return 1000
}

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
      techExp   += totalExp * dist.tech   * facilityMults.techMult
      physExp   += totalExp * dist.phys   * facilityMults.physMult
      mentalExp += totalExp * dist.mental * facilityMults.mentalMult
    })
  })
  return { techExp, physExp, mentalExp }
}

function applyExpToPool(player, techExp, physExp, mentalExp) {
  const pool = { ...(player.expPool || {}) }
  const talentMult = 0.5 + (player.talent / 100) * 1.0
  const updatedAttrs = {}
  const newPool = { ...pool }

  const applyOne = (exp, attrList, attrType) => {
    if (exp <= 0) return
    const actualExp = exp * talentMult * getAgeMultiplier(player.age, attrType)
    const attr = attrList[Math.floor(Math.random() * attrList.length)]
    newPool[attr] = (newPool[attr] || 0) + actualExp
    const cur = player[attr] || 0
    if (newPool[attr] >= getExpThreshold(cur)) {
      newPool[attr] -= getExpThreshold(cur)
      updatedAttrs[attr] = Math.min(99, cur + 1)
    }
  }

  applyOne(techExp,   TECH_ATTRS,   'tech')
  applyOne(physExp,   PHYS_ATTRS,   'phys')
  applyOne(mentalExp, MENTAL_ATTRS, 'mental')

  return { updatedAttrs, newPool }
}

// ── 技能自主领悟（每周检测）──────────────────────────
// 检查所有球员是否触发自主领悟
function checkSelfLearnSkills(players, coaches, newWeek) {
  const skillNews = []
  const playerUpdates = {}  // { playerId: { skills: [...] } }

  players.forEach(player => {
    SKILL_NAMES.forEach(skillName => {
      const chance = getSelfLearnChance(player, skillName)
      if (chance <= 0) return
      if (Math.random() < chance) {
        // 领悟成功
        if (!playerUpdates[player.id]) {
          playerUpdates[player.id] = { skills: [...(player.skills || [])] }
        }
        if (!playerUpdates[player.id].skills.includes(skillName)) {
          playerUpdates[player.id].skills.push(skillName)
          skillNews.push({
            id: Date.now() + Math.random(),
            type: 'skill',
            text: `${player.name}通过刻苦训练自主领悟了「${skillName}」技能！`,
            week: newWeek,
          })
        }
      }
    })

    // 教练传授：检查是否有教练拥有对应技能且球员满足条件
    // （教练技能传授需要教练自己也有该技能，目前教练无技能字段，预留逻辑）
    // TODO: 当教练数据中加入 skills 字段后启用
  })

  return { skillNews, playerUpdates }
}

// ── 比赛触发：检测本周是否有赛事开赛 ────────────────
// 赛事第一周（event.week === currentWeek）：标记参赛球员，跳过训练
// 赛事第二周（event.week + 1 === currentWeek）：结算比赛结果
async function processMatchEvents(state, newWeek, currentPlayers) {
  const { myEntries, allEvents, gameState } = state
  const matchNews = []
  const matchTransactions = []
  let playerPointsUpdates = {}  // { playerId: { points: +N, ranking: N } }
  let updatedPlayers = [...currentPlayers]

  // 获取本周开赛的赛事（第一周）
  const startingEvents = allEvents.filter(ev => ev.week === newWeek)
  // 获取本周结束的赛事（第二周，即 ev.week + 1 === newWeek）
  const endingEvents = allEvents.filter(ev => ev.week + 1 === newWeek)

  // ── 第一周：标记参赛球员为「比赛中」状态 ────────────
  startingEvents.forEach(event => {
    const entry = myEntries.find(e => e.eventId === event.id)
    if (!entry) return

    entry.playerIds.forEach(pid => {
      updatedPlayers = updatedPlayers.map(p => {
        if (p.id !== pid) return p
        return { ...p, inMatch: true, matchEventId: event.id }
      })
    })

    matchNews.push({
      id: Date.now() + Math.random(),
      type: 'event',
      text: `【${event.name}】本周开赛，${entry.playerIds.length}名球员参赛，期待好成绩！`,
      week: newWeek,
    })
  })

  // ── 第二周：结算比赛结果 ──────────────────────────
  for (const event of endingEvents) {
    const entry = myEntries.find(e => e.eventId === event.id)
    if (!entry) continue

    // 从 API 拉取世界球员（对手池）
    let worldPlayers = []
    try {
      // 取第一个参赛球员的性别作为对手筛选依据
      const firstPlayer = updatedPlayers.find(p => entry.playerIds.includes(p.id))
      const gender = firstPlayer?.gender || 'male'
      const res = await fetch(`/api/worldplayers?level=${event.level}&gender=${gender}`)
      const data = await res.json()
      worldPlayers = data.players || []
    } catch (err) {
      console.warn('获取世界球员失败，使用虚拟对手:', err)
    }

    // 筛选本次参赛球员
    const participatingPlayers = updatedPlayers.filter(p => entry.playerIds.includes(p.id))

    // 模拟比赛
    const results = simulateTournament(participatingPlayers, event, worldPlayers)

    // 处理每名球员的比赛结果
    let totalPrize = 0
    const resultSummaries = []

    results.forEach(result => {
      totalPrize += result.prize

      // 更新球员积分
      const player = updatedPlayers.find(p => p.id === result.playerId)
      if (player) {
        const newPoints = (player.points || 0) + result.points
        // 更新经验池（比赛获得经验）
        const { updatedAttrs, newPool } = applyMatchExp(player, result.expGained)
        updatedPlayers = updatedPlayers.map(p => {
          if (p.id !== result.playerId) return p
          return {
            ...p,
            ...updatedAttrs,
            expPool: newPool,
            points: newPoints,
            inMatch: false,
            matchEventId: null,
          }
        })
      }

      resultSummaries.push(`${result.playerName} ${result.finalRoundLabel}`)
    })

    // 财务结算
    if (totalPrize > 0) {
      matchTransactions.push({
        id: `tx_match_${event.id}_${newWeek}`,
        type: 'income',
        category: 'prize',
        label: `${event.name}奖金`,
        amount: totalPrize,
      })
    }

    // 生成比赛结果新闻
    matchNews.push({
      id: Date.now() + Math.random(),
      type: 'event',
      text: `【${event.name}】结果出炉：${resultSummaries.join('，')}。总奖金 ¥${totalPrize.toLocaleString()}。`,
      week: newWeek,
      matchResults: results,  // 存完整结果供 EventsPage 展示
    })

    // 恢复第二周比赛中的球员为正常状态
    entry.playerIds.forEach(pid => {
      updatedPlayers = updatedPlayers.map(p => {
        if (p.id !== pid) return p
        return { ...p, inMatch: false, matchEventId: null }
      })
    })
  }

  return { updatedPlayers, matchNews, matchTransactions }
}

// ── 主函数 ────────────────────────────────────────────
export async function advanceWeekEngine(state) {
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

  const facilityMults = getFacilityMultipliers(facilities || [])

  // 3. 处理比赛事件（先跑，得到参赛状态和结算结果）
  const {
    updatedPlayers: playersAfterMatch,
    matchNews,
    matchTransactions,
  } = await processMatchEvents(state, newWeek, players)

  // 4. 计算每个球员的疲劳、经验、属性、伤病
  // 参赛球员（inMatch=true）本周不参与训练计算
  const updatedPlayers = playersAfterMatch.map(player => {
    // 重伤球员
    if (player.health === 'major') {
      return { ...player, fatigue: Math.max(0, Math.round(player.fatigue - DAILY_FATIGUE_RECOVERY * 7)) }
    }

    // 本周正在参赛的球员：不训练（第一周开赛时标记为 inMatch）
    // 注意：第二周结算后 inMatch 已清除，不影响下周
    if (player.inMatch) {
      // 比赛周疲劳：小幅增加（比赛消耗），但无训练恢复
      const matchFatigue = Math.min(100, player.fatigue + 15)
      return { ...player, fatigue: matchFatigue }
    }

    const newFatigue = simulateFatigueByDay(player.fatigue, player.age, fullSchedule)
    const { techExp, physExp, mentalExp } = calcPlayerExp(player.id, fullSchedule, coaches, facilityMults)
    const { updatedAttrs, newPool } = applyExpToPool(player, techExp, physExp, mentalExp)

    // 伤病逻辑（使用 injuryResist）
    let newHealth = player.health
    if (player.health === 'minor' && Math.random() < 0.4) newHealth = 'healthy'
    if (newHealth === 'healthy' && newFatigue >= 85) {
      const injuryChance = calcInjuryChance(player)
      if (Math.random() < injuryChance) newHealth = 'minor'
    }

    return { ...player, ...updatedAttrs, expPool: newPool, fatigue: newFatigue, health: newHealth }
  })

  // 5. 技能自主领悟检测
  const { skillNews, playerUpdates } = checkSelfLearnSkills(updatedPlayers, coaches, newWeek)
  const updatedPlayersWithSkills = updatedPlayers.map(p => {
    if (!playerUpdates[p.id]) return p
    return { ...p, skills: playerUpdates[p.id].skills }
  })

  // 6. 教练合同处理
  let contractNews = []
  const updatedCoaches = []
  coaches.forEach(c => {
    const newWeeksLeft = Math.max(0, c.contractWeeksLeft - 1)
    if (newWeeksLeft === 0) {
      contractNews.push({
        id: Date.now() + Math.random(),
        type: 'coach',
        text: `教练${c.name}的合同已到期，已自动离队。`,
        week: newWeek,
      })
    } else {
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

  // 7. 财务结算
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

  // 问题6：团课收费越高，贫困球员忠诚度下降
  // 基准费率：团课80元/小时以内不影响；超出部分按比例扣忠诚度
  // 家境系数：贫穷×2，普通×1.2，小康×0.8，富裕×0.4
  const FAMILY_LOYALTY_MULT = { 贫穷: 2.0, 普通: 1.2, 小康: 0.8, 富裕: 0.4 }
  const BASE_GROUP_FEE = 80  // 基准费率（元/小时）

  const playersAfterLoyalty = updatedPlayersWithSkills.map(player => {
    // 统计该球员本周参与的团课总小时数
    let groupHours = 0
    DAYS_KEYS.forEach(day => {
      ;(schedule[day] || []).forEach(s => {
        if (s.type === 'court_group' || s.type === 'fitness_group' || s.type === 'tactics') {
          if (s.playerIds?.includes(player.id)) groupHours += s.hours || 0
        }
      })
    })
    if (groupHours <= 0) return player

    // 实际收费（取最高的团课费）
    const actualFee = Math.max(settings.groupClassFee, settings.fitnessClassFee, settings.tacticsClassFee)
    const overcharge = Math.max(0, actualFee - BASE_GROUP_FEE)
    if (overcharge <= 0) return player

    // 忠诚度扣减：超出基准的部分 × 课时 × 家境系数 / 100
    const familyMult = FAMILY_LOYALTY_MULT[player.familyBg] || 1.0
    const loyaltyDrop = Math.round(overcharge * groupHours * familyMult / 100)
    if (loyaltyDrop <= 0) return player

    return { ...player, loyalty: Math.max(0, player.loyalty - loyaltyDrop) }
  })

  const coachSalary = updatedCoaches.reduce((sum, c) => sum + c.weeklySalary, 0)
  const insurance   = (playersAfterLoyalty.length + updatedCoaches.length) * 200
  const subsidy     = playersAfterLoyalty.filter(p => p.isSponsored).length * 500
  const prizeIncome = matchTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)

  const weekIncome  = rentalInfo.income + privateIncome + groupIncome + prizeIncome
  const weekExpense = coachSalary + insurance + subsidy
  const newCash     = finance.cash + weekIncome - weekExpense

  const newTx = [
    { id: `tx_${newWeek}_1`, type: 'income',  category: 'court_rent',   label: '场地外租',     amount: rentalInfo.income },
    { id: `tx_${newWeek}_2`, type: 'income',  category: 'private_cut',  label: '私教分成',     amount: privateIncome     },
    { id: `tx_${newWeek}_3`, type: 'income',  category: 'group_class',  label: '团课收费',     amount: groupIncome       },
    { id: `tx_${newWeek}_4`, type: 'expense', category: 'coach_salary', label: '教练薪资',     amount: coachSalary       },
    { id: `tx_${newWeek}_5`, type: 'expense', category: 'insurance',    label: '球员保险',     amount: insurance         },
    { id: `tx_${newWeek}_6`, type: 'expense', category: 'subsidy',      label: '赞助球员补助', amount: subsidy           },
    ...matchTransactions,
  ].filter(t => t.amount > 0)

  // 8. 随机事件
  let newRecentNews = state.recentNews || []
  newRecentNews = [...matchNews, ...skillNews, ...contractNews, ...newRecentNews].slice(0, 15)

  if (Math.random() < 0.3) {
    const ev = randomEvent(playersAfterLoyalty)
    if (ev) {
      // 随机事件技能领悟：真正修改球员 skills
      let finalPlayers = playersAfterLoyalty
      if (ev.type === 'skill' && ev.skill && ev.playerIds?.length) {
        finalPlayers = playersAfterLoyalty.map(p => {
          if (!ev.playerIds.includes(p.id)) return p
          if (p.skills?.includes(ev.skill)) return p
          return { ...p, skills: [...(p.skills || []), ev.skill] }
        })
      }
      newRecentNews = [{ id: Date.now(), type: ev.type, text: ev.text, week: newWeek }, ...newRecentNews].slice(0, 15)
      if (ev.type === 'finance' && ev.amount) {
        newTx.push({ id: `tx_${newWeek}_bonus`, type: 'income', category: 'other', label: '随机事件收入', amount: ev.amount })
      }
      if (ev.type === 'skill') {
        const totalIncomeTmp  = newTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
        const totalExpenseTmp = newTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        return {
          ...state,
          gameState: { ...gameState, week: newWeek, year: newYear, cash: newCash, prestigeChange: Math.floor(Math.random() * 10 - 3) },
          clubStats: { ...state.clubStats, coachCount: updatedCoaches.length },
          players:  finalPlayers,
          coaches:  updatedCoaches,
          finance: { ...finance, cash: newCash, weekIncome: totalIncomeTmp, weekExpense: totalExpenseTmp, weekNet: totalIncomeTmp - totalExpenseTmp },
          transactions: newTx,
          recentNews: newRecentNews,
        }
      }
    }
  }

  const totalIncome  = newTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = newTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  return {
    ...state,
    gameState: { ...gameState, week: newWeek, year: newYear, cash: newCash, prestigeChange: Math.floor(Math.random() * 10 - 3) },
    clubStats: { ...state.clubStats, coachCount: updatedCoaches.length },
    players:  playersAfterLoyalty,
    coaches:  updatedCoaches,
    finance: { ...finance, cash: newCash, weekIncome: totalIncome, weekExpense: totalExpense, weekNet: totalIncome - totalExpense },
    transactions: newTx,
    recentNews: newRecentNews,
  }
}
