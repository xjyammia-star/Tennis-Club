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

// ── 训练经验计算 ──────────────────────────────────────
const COURSE_EXP = { court_group: 10, fitness_group: 10, tactics: 10, private: 20, rest: 0 }
const COURSE_ATTR = {
  court_group:   { tech: 0.67, phys: 0.33, mental: 0 },
  fitness_group: { tech: 0,    phys: 1,    mental: 0 },
  tactics:       { tech: 0,    phys: 0,    mental: 1 },
  private:       { tech: 1,    phys: 0,    mental: 0 },
}

const TECH_ATTRS  = ['serve','forehand','backhand','returnServe','volley','footwork']
const PHYS_ATTRS  = ['strength','stamina','agility']
const MENTAL_ATTRS = ['pressure','willpower','focus']

function calcPlayerExp(playerId, schedule, coaches) {
  let techExp = 0, physExp = 0, mentalExp = 0, fatigueAdd = 0

  Object.values(schedule).forEach(sessions => {
    sessions.forEach(s => {
      if (!s.playerIds?.includes(playerId)) return
      const expPerHour = COURSE_EXP[s.type] || 0
      const hours = s.hours || 1
      const coach = coaches.find(c => c.id === s.coachId)
      const bonus = coach ? (parseFloat(coach.expBonus) / 100 + 1) : 1
      const totalExp = expPerHour * hours * bonus
      const dist = COURSE_ATTR[s.type] || { tech: 0.5, phys: 0.5, mental: 0 }

      techExp   += totalExp * dist.tech
      physExp   += totalExp * dist.phys
      mentalExp += totalExp * dist.mental
      fatigueAdd += hours * 8
    })
  })

  return { techExp, physExp, mentalExp, fatigueAdd }
}

function applyExp(player, techExp, physExp, mentalExp) {
  // 天赋影响成长速度
  const talentMult = 0.5 + (player.talent / 100) * 1.0
  // 年龄影响（25岁以后成长减慢）
  const ageMult = player.age <= 25 ? 1 : Math.max(0.3, 1 - (player.age - 25) * 0.05)
  const mult = talentMult * ageMult

  // 经验阈值：需要100点经验才能提升1点属性
  const THRESHOLD = 100
  const updates = {}

  // 技术属性提升
  if (techExp > 0) {
    const techGain = (techExp * mult) / THRESHOLD
    const attrs = [...TECH_ATTRS].sort(() => Math.random() - 0.5).slice(0, Math.ceil(techGain * 3))
    attrs.forEach(attr => {
      const gain = Math.random() < (techGain * 3 % 1) ? Math.ceil(techGain) : Math.floor(techGain)
      if (gain > 0) updates[attr] = Math.min(99, (player[attr] || 0) + gain)
    })
  }

  // 身体属性提升
  if (physExp > 0) {
    const physGain = (physExp * mult) / THRESHOLD
    PHYS_ATTRS.forEach(attr => {
      const gain = Math.random() < physGain ? 1 : 0
      if (gain > 0) updates[attr] = Math.min(99, (player[attr] || 0) + gain)
    })
  }

  // 精神属性提升
  if (mentalExp > 0) {
    const mentalGain = (mentalExp * mult) / THRESHOLD
    MENTAL_ATTRS.forEach(attr => {
      const gain = Math.random() < mentalGain ? 1 : 0
      if (gain > 0) updates[attr] = Math.min(99, (player[attr] || 0) + gain)
    })
  }

  return updates
}

// ── 主函数：执行下一周结算 ────────────────────────────
export function advanceWeekEngine(state) {
  const settings = getClubSettings()
  const { gameState, clubStats, players, coaches, schedule, finance, transactions } = state

  // 1. 推进周历
  let newWeek = gameState.week + 1
  let newYear = gameState.year
  if (newWeek > 52) { newWeek = 1; newYear++ }

  // 2. 计算本周私教
  const privateLessons = generatePrivateLessons({
    players, coaches,
    courtCount: clubStats.courtCount,
    isMatchWeek: false,
    settings,
  })

  // 合并团课+私教为完整schedule用于计算
  const fullSchedule = {}
  const DAYS = ['mon','tue','wed','thu','fri','sat','sun']
  DAYS.forEach(day => {
    const group = (schedule[day] || []).filter(s => s.type !== 'private')
    const priv = (privateLessons[day] || []).filter(s => s.type === 'private')
    fullSchedule[day] = [...group, ...priv]
  })

  // 3. 计算每个球员的训练经验和疲劳
  const updatedPlayers = players.map(player => {
    if (player.health === 'major') {
      // 重伤：疲劳恢复，但不训练
      return { ...player, fatigue: Math.max(0, player.fatigue - 20) }
    }

    const { techExp, physExp, mentalExp, fatigueAdd } = calcPlayerExp(player.id, fullSchedule, coaches)
    const attrUpdates = applyExp(player, techExp, physExp, mentalExp)

    // 疲劳计算：训练增加，有休息室/更衣室自动恢复
    const fatigueRecovery = 15 // 基础每周恢复
    const newFatigue = Math.min(100, Math.max(0, player.fatigue + fatigueAdd - fatigueRecovery))

    // 轻伤有概率自然康复
    let newHealth = player.health
    if (player.health === 'minor' && Math.random() < 0.4) newHealth = 'healthy'

    // 高疲劳有概率轻伤
    if (newHealth === 'healthy' && newFatigue >= 85 && Math.random() < 0.2) newHealth = 'minor'

    return { ...player, ...attrUpdates, fatigue: Math.round(newFatigue), health: newHealth }
  })

  // 4. 财务结算
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

  // 私教收入
  let privateIncome = 0
  DAYS.forEach(day => {
    ;(privateLessons[day] || []).forEach(s => {
      if (!s.isMerged) return
      ;(s.details || []).forEach(d => {
        const coach = coaches.find(c => c.id === d.coachId)
        const level = coach?.level || 'normal'
        const feeMap = { elite: settings.privateFeeElite, senior: settings.privateFeeSenior, normal: settings.privateFeeNormal, assistant: settings.privateFeeeAssistant }
        const fee = feeMap[level] || settings.privateFeeNormal
        privateIncome += Math.round(fee * settings.privateCoachCut / 100)
      })
    })
  })

  // 团课收入
  let groupIncome = 0
  DAYS.forEach(day => {
    ;(schedule[day] || []).forEach(s => {
      if (s.type === 'court_group') groupIncome += (s.playerIds?.length || 0) * (s.hours || 0) * settings.groupClassFee
      if (s.type === 'fitness_group') groupIncome += (s.playerIds?.length || 0) * (s.hours || 0) * settings.fitnessClassFee
      if (s.type === 'tactics') groupIncome += (s.playerIds?.length || 0) * (s.hours || 0) * settings.tacticsClassFee
    })
  })

  // 教练薪资支出
  const coachSalary = coaches.reduce((sum, c) => sum + c.weeklySalary, 0)

  // 保险支出（每人每周200）
  const insurance = (players.length + coaches.length) * 200

  // 赞助球员补助
  const subsidy = players.filter(p => p.isSponsored).length * 500

  // 本周净收支
  const weekIncome  = rentalInfo.income + privateIncome + groupIncome
  const weekExpense = coachSalary + insurance + subsidy
  const weekNet     = weekIncome - weekExpense
  const newCash     = finance.cash + weekNet

  // 新增本周交易记录
  const newTx = [
    { id: `tx_${newWeek}_1`, type: 'income',  category: 'court_rent',  label: '场地外租',     amount: rentalInfo.income },
    { id: `tx_${newWeek}_2`, type: 'income',  category: 'private_cut', label: '私教分成',     amount: privateIncome    },
    { id: `tx_${newWeek}_3`, type: 'income',  category: 'group_class', label: '团课收费',     amount: groupIncome      },
    { id: `tx_${newWeek}_4`, type: 'expense', category: 'coach_salary',label: '教练薪资',     amount: coachSalary      },
    { id: `tx_${newWeek}_5`, type: 'expense', category: 'insurance',   label: '球员保险',     amount: insurance        },
    { id: `tx_${newWeek}_6`, type: 'expense', category: 'subsidy',     label: '赞助球员补助', amount: subsidy          },
  ].filter(t => t.amount > 0)

  // 5. 教练合同倒计时
  const updatedCoaches = coaches.map(c => ({
    ...c,
    contractWeeksLeft: Math.max(0, c.contractWeeksLeft - 1)
  }))

  // 6. 随机事件（30%概率触发）
  let newRecentNews = state.recentNews
  if (Math.random() < 0.3) {
    const ev = randomEvent(updatedPlayers)
    if (ev) {
      newRecentNews = [{ id: Date.now(), type: ev.type, text: ev.text, week: newWeek }, ...state.recentNews].slice(0, 10)
      // 如果是财务事件，加钱
      if (ev.type === 'finance' && ev.amount) {
        newTx.push({ id: `tx_${newWeek}_bonus`, type: 'income', category: 'other', label: '随机事件收入', amount: ev.amount })
      }
    }
  }

  // 7. 本周财务汇总
  const totalIncome  = newTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = newTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  return {
    ...state,
    gameState: {
      ...gameState,
      week: newWeek,
      year: newYear,
      cash: newCash,
      prestigeChange: Math.floor(Math.random() * 10 - 3),
    },
    players: updatedPlayers,
    coaches: updatedCoaches,
    finance: {
      ...finance,
      cash: newCash,
      weekIncome: totalIncome,
      weekExpense: totalExpense,
      weekNet: totalIncome - totalExpense,
    },
    transactions: newTx,
    recentNews: newRecentNews,
  }
}
