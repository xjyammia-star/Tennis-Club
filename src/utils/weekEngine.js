// ══════════════════════════════════════════════════════
// 「下一周」核心引擎
// 每次点击「进入下一周」时调用，返回新的完整 state
// ══════════════════════════════════════════════════════

import { getClubSettings } from './clubSettings'
import { calcCourtRentalIncome } from './courtRental'
import { generatePrivateLessons } from './privateLesson'

// ── 随机事件库 ────────────────────────────────────────
const RANDOM_EVENTS = [
  { type: 'skill',    weight: 3, gen: (players) => {
    const p = players[Math.floor(Math.random() * players.length)]
    const skills = ['上旋月亮','大力奇迹','侧旋发球','底线无敌','极限救球','网前幽灵']
    const skill = skills[Math.floor(Math.random() * skills.length)]
    if (p.skills.includes(skill)) return null
    return { playerIds: [p.id], skill, text: `${p.name}在训练中领悟了「${skill}」技能，天赋潜力令人期待。` }
  }},
  { type: 'finance',  weight: 4, gen: () => {
    const bonus = Math.floor(Math.random() * 5000 + 1000)
    return { amount: bonus, text: `本周收到一笔额外赞助收入 ¥${bonus.toLocaleString()}。` }
  }},
  { type: 'player',   weight: 3, gen: (players) => {
    const healthy = players.filter(p => p.health === 'healthy')
    if (!healthy.length) return null
    const p = healthy[Math.floor(Math.random() * healthy.length)]
    return { playerIds: [p.id], text: `${p.name}本周训练状态极佳，疲劳恢复速度加快。` }
  }},
  { type: 'sponsor',  weight: 2, gen: (players) => {
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

// ── 经验获取规则 ──────────────────────────────────────
// 每小时获得的基础经验值（参加比赛为每场固定50点，单独处理）
const COURSE_EXP_PER_HOUR = {
  court_group:   10,  // 球场团课：每小时10点
  fitness_group: 10,  // 体能团课：每小时10点
  tactics:       10,  // 战术分析课：每小时10点
  private:       20,  // 私教训练：每小时20点
  rest:          0,   // 休息：不获得经验
}

// 经验分配比例（tech技术 / phys身体 / mental精神）
const COURSE_ATTR_DIST = {
  court_group:   { tech: 2/3, phys: 1/3, mental: 0   }, // 球场团课：技术2/3，身体1/3
  fitness_group: { tech: 0,   phys: 1,   mental: 0   }, // 体能团课：全部身体
  tactics:       { tech: 0,   phys: 0,   mental: 1   }, // 战术课：全部精神
  private:       { tech: 1,   phys: 0,   mental: 0   }, // 私教：全部技术
}

// 参加比赛经验（每场固定50点）
// 分配：精神60%，技术20%，身体20%
export const MATCH_EXP = 50
export const MATCH_ATTR_DIST = { tech: 0.20, phys: 0.20, mental: 0.60 }

const TECH_ATTRS   = ['serve', 'forehand', 'backhand', 'returnServe', 'volley', 'footwork']
const PHYS_ATTRS   = ['strength', 'stamina', 'agility']
const MENTAL_ATTRS = ['pressure', 'willpower', 'focus']

// ── 属性升级所需经验阈值 ──────────────────────────────
// 根据属性当前值，决定升1点需要积累多少经验
// 三类属性（技术/身体/精神）使用相同阈值表
function getExpThreshold(currentValue) {
  if (currentValue < 50) return 200
  if (currentValue < 70) return 400
  if (currentValue < 90) return 700
  return 1000  // 90以上
}

// ── 年龄对经验的影响系数 ──────────────────────────────
// 三类属性年龄影响规则各不相同
function getAgeMultiplier(age, attrType) {
  if (attrType === 'tech') {
    // 技术属性：无年龄影响
    return 1.0
  }
  if (attrType === 'phys') {
    // 身体属性：
    // 12-16岁 经验加成100%（×2）
    // 17-30岁 正常（×1）
    // 30岁以上 经验减少50%（×0.5）
    if (age >= 12 && age <= 16) return 2.0
    if (age >= 17 && age <= 30) return 1.0
    return 0.5
  }
  if (attrType === 'mental') {
    // 精神属性：
    // 8-16岁  经验减少50%（×0.5）
    // 17-25岁 正常（×1）
    // 25岁以上 经验加成100%（×2）
    if (age >= 8  && age <= 16) return 0.5
    if (age >= 17 && age <= 25) return 1.0
    return 2.0
  }
  return 1.0
}

// ── 计算单个球员本周从训练中获得的原始经验 ──────────────
function calcPlayerExp(playerId, schedule, coaches) {
  let techExp = 0, physExp = 0, mentalExp = 0, fatigueAdd = 0

  Object.values(schedule).forEach(sessions => {
    sessions.forEach(s => {
      if (!s.playerIds?.includes(playerId)) return

      const expPerHour = COURSE_EXP_PER_HOUR[s.type] || 0
      const hours = s.hours || 1

      // 教练经验加成（expBonus 字段，如 "15" 表示额外+15%）
      const coach = coaches.find(c => c.id === s.coachId)
      const coachBonus = coach ? (parseFloat(coach.expBonus) / 100 + 1) : 1

      const totalExp = expPerHour * hours * coachBonus
      const dist = COURSE_ATTR_DIST[s.type] || { tech: 0.5, phys: 0.5, mental: 0 }

      techExp   += totalExp * dist.tech
      physExp   += totalExp * dist.phys
      mentalExp += totalExp * dist.mental

      // 每小时训练增加8点疲劳
      fatigueAdd += hours * 8
    })
  })

  return { techExp, physExp, mentalExp, fatigueAdd }
}

// ── 将经验写入经验池，并判断是否触发属性升级 ────────────
// expPool 结构示例：{ serve: 156.5, forehand: 89.2, strength: 234, ... }
// 每个属性独立记录经验，跨周累积，达到阈值才升级
function applyExpToPool(player, techExp, physExp, mentalExp) {
  // 读取现有经验池（兼容旧数据，字段不存在时初始化为空对象）
  const pool = { ...(player.expPool || {}) }

  // 天赋影响经验获取速度：talent 0-100 → 乘数 0.5-1.5
  const talentMult = 0.5 + (player.talent / 100) * 1.0

  const updatedAttrs = {}  // 本周升级的属性，格式：{ serve: 62 }
  const newPool = { ...pool }

  // ── 处理技术属性经验 ──────────────────────────────
  if (techExp > 0) {
    const ageMult = getAgeMultiplier(player.age, 'tech')
    const actualExp = techExp * talentMult * ageMult

    // 每次训练随机选1个技术属性作为本周提升方向
    const targetAttr = TECH_ATTRS[Math.floor(Math.random() * TECH_ATTRS.length)]
    newPool[targetAttr] = (newPool[targetAttr] || 0) + actualExp

    // 检查是否达到升级阈值
    const currentVal = player[targetAttr] || 0
    const threshold = getExpThreshold(currentVal)
    if (newPool[targetAttr] >= threshold) {
      newPool[targetAttr] -= threshold  // 扣除阈值，超出部分保留到下周
      updatedAttrs[targetAttr] = Math.min(99, currentVal + 1)
    }
  }

  // ── 处理身体属性经验 ──────────────────────────────
  if (physExp > 0) {
    const ageMult = getAgeMultiplier(player.age, 'phys')
    const actualExp = physExp * talentMult * ageMult

    // 随机选1个身体属性
    const targetAttr = PHYS_ATTRS[Math.floor(Math.random() * PHYS_ATTRS.length)]
    newPool[targetAttr] = (newPool[targetAttr] || 0) + actualExp

    const currentVal = player[targetAttr] || 0
    const threshold = getExpThreshold(currentVal)
    if (newPool[targetAttr] >= threshold) {
      newPool[targetAttr] -= threshold
      updatedAttrs[targetAttr] = Math.min(99, currentVal + 1)
    }
  }

  // ── 处理精神属性经验 ──────────────────────────────
  if (mentalExp > 0) {
    const ageMult = getAgeMultiplier(player.age, 'mental')
    const actualExp = mentalExp * talentMult * ageMult

    // 随机选1个精神属性
    const targetAttr = MENTAL_ATTRS[Math.floor(Math.random() * MENTAL_ATTRS.length)]
    newPool[targetAttr] = (newPool[targetAttr] || 0) + actualExp

    const currentVal = player[targetAttr] || 0
    const threshold = getExpThreshold(currentVal)
    if (newPool[targetAttr] >= threshold) {
      newPool[targetAttr] -= threshold
      updatedAttrs[targetAttr] = Math.min(99, currentVal + 1)
    }
  }

  return { updatedAttrs, newPool }
}

// ── 主函数：执行下一周结算 ────────────────────────────
export function advanceWeekEngine(state) {
  const settings = getClubSettings()
  const { gameState, clubStats, players, coaches, schedule, finance, transactions } = state

  // 1. 推进周历
  let newWeek = gameState.week + 1
  let newYear = gameState.year
  if (newWeek > 52) { newWeek = 1; newYear++ }

  // 2. 生成本周私教排课
  const privateLessons = generatePrivateLessons({
    players,
    coaches,
    courtCount: clubStats.courtCount,
    isMatchWeek: false,
    settings,
  })

  // 合并团课 + 私教，作为完整训练表用于经验计算
  const fullSchedule = {}
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  DAYS.forEach(day => {
    const group = (schedule[day] || []).filter(s => s.type !== 'private')
    const priv  = (privateLessons[day] || []).filter(s => s.type === 'private')
    fullSchedule[day] = [...group, ...priv]
  })

  // 3. 计算每个球员的训练经验、属性成长、疲劳、伤病
  const updatedPlayers = players.map(player => {
    // 重伤球员：停训养伤，每周恢复20点疲劳
    if (player.health === 'major') {
      return { ...player, fatigue: Math.max(0, player.fatigue - 20) }
    }

    // 计算本周训练获得的经验和疲劳增量
    const { techExp, physExp, mentalExp, fatigueAdd } = calcPlayerExp(
      player.id, fullSchedule, coaches
    )

    // 将经验写入经验池，判断属性升级
    const { updatedAttrs, newPool } = applyExpToPool(player, techExp, physExp, mentalExp)

    // 疲劳：训练增加，基础每周恢复15点
    const fatigueRecovery = 15
    const newFatigue = Math.min(100, Math.max(0, player.fatigue + fatigueAdd - fatigueRecovery))

    // 伤病逻辑
    let newHealth = player.health
    // 轻伤有40%概率自然康复
    if (player.health === 'minor' && Math.random() < 0.4) {
      newHealth = 'healthy'
    }
    // 疲劳≥85且健康，有20%概率触发轻伤
    if (newHealth === 'healthy' && newFatigue >= 85 && Math.random() < 0.2) {
      newHealth = 'minor'
    }

    return {
      ...player,
      ...updatedAttrs,        // 升级的属性覆盖原值，如 { serve: 62 }
      expPool: newPool,        // 更新经验池（跨周持久化）
      fatigue: Math.round(newFatigue),
      health: newHealth,
    }
  })

  // 4. 财务结算

  // 统计本周每天私教人次（用于计算场地占用）
  const weekPrivateCounts = {}
  DAYS.forEach(day => {
    weekPrivateCounts[day] = (privateLessons[day] || []).reduce(
      (sum, s) => sum + (s.playerIds?.length || 0), 0
    )
  })

  // 场地外租收入
  const rentalInfo = calcCourtRentalIncome({
    courtCount: clubStats.courtCount,
    prestige: gameState.prestige,
    hourlyRate: settings.courtHourlyRate,
    weekPrivateCounts,
    eventModifier: 0,
  })

  // 私教分成收入
  let privateIncome = 0
  DAYS.forEach(day => {
    ;(privateLessons[day] || []).forEach(s => {
      if (!s.isMerged) return
      ;(s.details || []).forEach(d => {
        const coach = coaches.find(c => c.id === d.coachId)
        const level = coach?.level || 'normal'
        const feeMap = {
          elite:     settings.privateFeeElite,
          senior:    settings.privateFeeSenior,
          normal:    settings.privateFeeNormal,
          assistant: settings.privateFeeeAssistant,
        }
        const fee = feeMap[level] || settings.privateFeeNormal
        privateIncome += Math.round(fee * settings.privateCoachCut / 100)
      })
    })
  })

  // 团课收费收入
  let groupIncome = 0
  DAYS.forEach(day => {
    ;(schedule[day] || []).forEach(s => {
      if (s.type === 'court_group') {
        groupIncome += (s.playerIds?.length || 0) * (s.hours || 0) * settings.groupClassFee
      }
      if (s.type === 'fitness_group') {
        groupIncome += (s.playerIds?.length || 0) * (s.hours || 0) * settings.fitnessClassFee
      }
      if (s.type === 'tactics') {
        groupIncome += (s.playerIds?.length || 0) * (s.hours || 0) * settings.tacticsClassFee
      }
    })
  })

  // 支出：教练薪资
  const coachSalary = coaches.reduce((sum, c) => sum + c.weeklySalary, 0)

  // 支出：人员保险（球员+教练，每人每周200）
  const insurance = (players.length + coaches.length) * 200

  // 支出：赞助球员补助（每人每周500）
  const subsidy = players.filter(p => p.isSponsored).length * 500

  // 汇总本周资金变动
  const weekIncome  = rentalInfo.income + privateIncome + groupIncome
  const weekExpense = coachSalary + insurance + subsidy
  const newCash     = finance.cash + weekIncome - weekExpense

  // 生成本周财务明细记录
  const newTx = [
    { id: `tx_${newWeek}_1`, type: 'income',  category: 'court_rent',   label: '场地外租',     amount: rentalInfo.income },
    { id: `tx_${newWeek}_2`, type: 'income',  category: 'private_cut',  label: '私教分成',     amount: privateIncome     },
    { id: `tx_${newWeek}_3`, type: 'income',  category: 'group_class',  label: '团课收费',     amount: groupIncome       },
    { id: `tx_${newWeek}_4`, type: 'expense', category: 'coach_salary', label: '教练薪资',     amount: coachSalary       },
    { id: `tx_${newWeek}_5`, type: 'expense', category: 'insurance',    label: '球员保险',     amount: insurance         },
    { id: `tx_${newWeek}_6`, type: 'expense', category: 'subsidy',      label: '赞助球员补助', amount: subsidy           },
  ].filter(t => t.amount > 0)

  // 5. 教练合同倒计时（每周 -1）
  const updatedCoaches = coaches.map(c => ({
    ...c,
    contractWeeksLeft: Math.max(0, c.contractWeeksLeft - 1),
  }))

  // 6. 随机事件（30% 概率触发）
  let newRecentNews = state.recentNews || []
  if (Math.random() < 0.3) {
    const ev = randomEvent(updatedPlayers)
    if (ev) {
      newRecentNews = [
        { id: Date.now(), type: ev.type, text: ev.text, week: newWeek },
        ...newRecentNews,
      ].slice(0, 10)

      // 财务类随机事件：计入本周收入
      if (ev.type === 'finance' && ev.amount) {
        newTx.push({
          id: `tx_${newWeek}_bonus`,
          type: 'income',
          category: 'other',
          label: '随机事件收入',
          amount: ev.amount,
        })
      }
    }
  }

  // 7. 计算本周财务汇总（含随机事件）
  const totalIncome  = newTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = newTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  // 8. 返回完整新 state
  return {
    ...state,
    gameState: {
      ...gameState,
      week:           newWeek,
      year:           newYear,
      cash:           newCash,
      prestigeChange: Math.floor(Math.random() * 10 - 3),
    },
    players:  updatedPlayers,
    coaches:  updatedCoaches,
    finance: {
      ...finance,
      cash:        newCash,
      weekIncome:  totalIncome,
      weekExpense: totalExpense,
      weekNet:     totalIncome - totalExpense,
    },
    transactions: newTx,
    recentNews:   newRecentNews,
  }
}
