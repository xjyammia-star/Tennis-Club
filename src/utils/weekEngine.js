// ══════════════════════════════════════════════════════
// 「下一周」核心引擎
// 每次点击「进入下一周」时调用，返回新的完整 state
// ══════════════════════════════════════════════════════

import { getClubSettings } from './clubSettings'
import { calcCourtRentalIncome } from './courtRental'
import { generatePrivateLessons } from './privateLesson'
import { SKILL_DEFS, SKILL_NAMES, getSelfLearnChance, canCoachTeach } from '../data/skillDefs'
import { simulateTournament, applyMatchExp } from './matchEngine'
// ✅ 问题4修复：从独立常量文件导入，不再在此文件 export，消除循环依赖
import { MATCH_EXP, MATCH_ATTR_DIST } from '../data/gameConstants'

// ── 招募市场候选人随机生成 ──────────────────────────
// ✅ 问题5：每次进入下一周时重新生成招募候选人

const FAMILY_BG_LIST   = ['贫穷', '普通', '小康', '富裕']
const MALE_SURNAMES    = ['王','李','张','刘','陈','孙','周','吴','郑','冯','林','黄','赵','徐','何']
const FEMALE_SURNAMES  = ['王','李','张','刘','陈','孙','周','吴','郑','冯','林','黄','赵','徐','何']
const MALE_GIVEN       = ['浩然','志远','宇轩','博文','子豪','建国','伟明','俊杰','晨曦','锦涛','大鹏','凯','鑫','磊']
const FEMALE_GIVEN     = ['晓雨','美玲','静怡','梦琪','小慧','雪','慧敏','婷婷','丽华','雯雯','佳慧','欣怡','紫涵']
const COACH_STYLES     = [
  { style: 'strict',  styleLabel: '一丝不苟' },
  { style: 'free',    styleLabel: '自由发挥' },
  { style: 'relaxed', styleLabel: '宽松随意' },
  { style: 'balanced',styleLabel: '张弛有度' },
]
const TALENT_TIERS = [
  { min: 90, label: '万里挑一' },
  { min: 80, label: '天赋异禀' },
  { min: 70, label: '资质优良' },
  { min: 55, label: '平平无奇' },
  { min: 0,  label: '资质平庸' },
]

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function randName(surnames, givenNames) {
  return surnames[randInt(0, surnames.length - 1)] + givenNames[randInt(0, givenNames.length - 1)]
}
function getTalentLabel(talent) {
  return (TALENT_TIERS.find(t => talent >= t.min) || TALENT_TIERS[TALENT_TIERS.length - 1]).label
}
function randAttr(base, spread = 15) {
  return Math.min(99, Math.max(1, base + randInt(-spread, spread)))
}

// 生成招募球员（每周5人）
function generateRecruitPlayers(currentWeek) {
  const count = 5
  const result = []
  for (let i = 0; i < count; i++) {
    const gender = Math.random() < 0.5 ? 'male' : 'female'
    const name = gender === 'male'
      ? randName(MALE_SURNAMES, MALE_GIVEN)
      : randName(FEMALE_SURNAMES, FEMALE_GIVEN)
    const age = randInt(13, 24)
    const talent = randInt(55, 92)
    const familyBg = FAMILY_BG_LIST[randInt(0, 3)]

    // 属性基准随年龄和天赋浮动
    const baseStat = Math.floor(age * 1.8 + talent * 0.3)
    const hasSkill = talent >= 75 && Math.random() < 0.4
    const allSkills = Object.keys(SKILL_DEFS)
    const skills = hasSkill ? [allSkills[randInt(0, allSkills.length - 1)]] : []

    // 抗伤病随年龄
    const injuryBase = age <= 11 ? 85 : age <= 14 ? 75 : age <= 18 ? 65 : 50
    const injuryResist = Math.min(99, Math.max(30, randAttr(injuryBase, 8)))

    // 加入费：贫穷球员需补助
    const joinFee = familyBg === '贫穷' ? 500 : 0

    result.push({
      id: 200 + currentWeek * 10 + i,
      name,
      gender,
      age,
      height: gender === 'male' ? randInt(160, 195) : randInt(155, 178),
      weight: gender === 'male' ? randInt(58, 90)   : randInt(48, 70),
      familyBg,
      currentClub: Math.random() < 0.4 ? '其他俱乐部' : '无',
      talent,
      talentLabel: getTalentLabel(talent),
      health: 'healthy',
      ranking: age >= 18 && talent >= 65 ? randInt(200, 500) : null,
      points: age >= 18 ? randInt(0, 400) : 0,
      injuryResist,
      strength:    randAttr(baseStat * 0.85, 12),
      stamina:     randAttr(baseStat * 0.90, 12),
      agility:     randAttr(baseStat * 0.90, 12),
      serve:       randAttr(baseStat * 0.80, 12),
      forehand:    randAttr(baseStat * 0.85, 12),
      backhand:    randAttr(baseStat * 0.80, 12),
      footwork:    randAttr(baseStat * 0.85, 12),
      skills,
      note: familyBg === '贫穷'
        ? `家境贫困，需要生活补助（¥500/周）。训练刻苦，求上进心强。`
        : talent >= 80
        ? `天赋出众，有很大发展潜力。`
        : `普通球员，适合作为俱乐部梯队培养。`,
      joinFee,
      expPool: {},
      pressure:  randAttr(baseStat * 0.75, 12),
      willpower: randAttr(baseStat * 0.80, 12),
      focus:     randAttr(baseStat * 0.78, 12),
      fatigue: randInt(10, 40),
      loyalty: randInt(60, 85),
      isSponsored: false,
      inMatch: false,
      matchEventId: null,
    })
  }
  return result
}

// 生成招募教练（每周3人）
function generateRecruitCoaches(currentWeek) {
  const levels = [
    { level: 'elite',     levelLabel: '顶级教练', expBonus: '+15%', salaryRange: [8000, 12000] },
    { level: 'senior',    levelLabel: '高级教练', expBonus: '+10%', salaryRange: [5000, 7000]  },
    { level: 'normal',    levelLabel: '普通教练', expBonus: '+3%',  salaryRange: [3000, 5000]  },
    { level: 'assistant', levelLabel: '助教',     expBonus: '-5%',  salaryRange: [1500, 2500]  },
  ]
  // 按权重随机：助教40%，普通35%，高级20%，顶级5%
  const levelWeights = [5, 20, 35, 40]
  function pickLevel() {
    let r = randInt(1, 100)
    for (let i = 0; i < levels.length; i++) {
      r -= levelWeights[i]
      if (r <= 0) return levels[i]
    }
    return levels[2]
  }

  const allSkillNames = Object.keys(SKILL_DEFS)
  const result = []
  for (let i = 0; i < 3; i++) {
    const lv = pickLevel()
    const gender = Math.random() < 0.5 ? 'male' : 'female'
    const name = gender === 'male'
      ? randName(MALE_SURNAMES, MALE_GIVEN)
      : randName(FEMALE_SURNAMES, FEMALE_GIVEN)
    const age = randInt(26, 55)
    const styleObj = COACH_STYLES[randInt(0, COACH_STYLES.length - 1)]
    const salary = randInt(lv.salaryRange[0], lv.salaryRange[1])

    // 教练技能（顶级/高级有1-2个，普通有0-1个，助教没有）
    // ✅ 问题6：教练现在有 skills 字段
    let coachSkills = []
    if (lv.level === 'elite') {
      coachSkills = [...allSkillNames].sort(() => Math.random() - 0.5).slice(0, randInt(2, 3))
    } else if (lv.level === 'senior') {
      coachSkills = [...allSkillNames].sort(() => Math.random() - 0.5).slice(0, randInt(1, 2))
    } else if (lv.level === 'normal') {
      coachSkills = Math.random() < 0.4 ? [allSkillNames[randInt(0, allSkillNames.length - 1)]] : []
    }

    const specialSkills = ['发球','正手','反手','截击','脚步移动','战术分析','心理训练','体能训练','接发球','底线战术']
    const numSpecial = lv.level === 'elite' ? 4 : lv.level === 'senior' ? 3 : lv.level === 'normal' ? 2 : 0
    const pickedSpecial = [...specialSkills].sort(() => Math.random() - 0.5).slice(0, numSpecial)

    result.push({
      id: 100 + currentWeek * 10 + i,
      name,
      gender,
      age,
      level:      lv.level,
      levelLabel: lv.levelLabel,
      style:      styleObj.style,
      styleLabel: styleObj.styleLabel,
      expBonus:   lv.expBonus,
      weeklySalary:   salary,
      contractYears:  randInt(1, 2),
      specialSkills:  pickedSpecial,
      skills:         coachSkills,  // ✅ 教练可传授的技能列表
      careerHighlight: lv.level === 'assistant'
        ? '体育学院网球专业，持有 ITF Level 1 证书'
        : lv.level === 'normal'
        ? `前职业球员，最高排名 #${randInt(300, 500)}，执教 ${randInt(2, 8)} 年`
        : `前职业球员，最高排名 #${randInt(80, 300)}，曾培养多名职业球员`,
      bio: lv.level === 'assistant'
        ? '年轻有活力，经验尚浅，需要资深教练指导。'
        : lv.level === 'normal'
        ? '执教经验丰富，技术扎实，适合带领青少年训练。'
        : '资历深厚，有丰富大赛经验，是提升俱乐部水平的关键人选。',
      requiresFacility: lv.level === 'elite' ? '高级健身房' : null,
      studentCount: 0,
      totalStudents: lv.level === 'elite' ? 3 : lv.level === 'senior' ? 5 : 8,
    })
  }
  return result
}

// ── 随机事件库 ────────────────────────────────────────
const RANDOM_EVENTS = [
  { type: 'skill', weight: 3, gen: (players) => {
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

// ── 获取设施疲劳恢复加成（问题3）────────────────────
// 更衣室和休息室能在疲劳恢复里加成
// 返回每天额外恢复的疲劳点数
// ✅ 问题3修复：加入更衣室/休息室疲劳恢复效果
const SERVICE_FATIGUE_RECOVERY = {
  locker: { 糟糕: 2, 普通: 4, 高级: 6,  顶级: 8  },  // 更衣室：每天疲劳 -N
  lounge: { 糟糕: 2, 普通: 5, 高级: 8,  顶级: 12 },  // 休息室：每天疲劳 -N
  physio: { 糟糕: 0, 普通: 3, 高级: 5,  顶级: 8  },  // 理疗室：每天疲劳 -N（额外）
  dormitory: { 糟糕: 3, 普通: 5, 高级: 8, 顶级: 12 }, // 宿舍：每天疲劳 -N
}

function getServiceFatigueRecovery(facilities) {
  let extraRecoveryPerDay = 0
  facilities.forEach(f => {
    const table = SERVICE_FATIGUE_RECOVERY[f.type]
    if (table && f.level) {
      extraRecoveryPerDay += table[f.level] || 0
    }
  })
  return extraRecoveryPerDay
}

// ── 抗伤病属性：根据年龄获取最低限 ────────────────
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
// ✅ 问题3：加入 extraRecoveryPerDay 参数
function simulateFatigueByDay(startFatigue, age, schedule, extraRecoveryPerDay = 0) {
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
    // ✅ 疲劳公式：原有恢复 + 设施额外恢复
    fatigue = fatigue + trainingHours * fatiguePerHour - DAILY_FATIGUE_RECOVERY - extraRecoveryPerDay
    fatigue = Math.min(100, Math.max(0, fatigue))
  })

  return Math.round(fatigue)
}

// ── 设施训练效果系数 ──────────────────────────────────
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
  const talentMult = 0.5 + (player.talent / 100) * 1.0
  const updatedAttrs = {}
  const newPool = { ...(player.expPool || {}) }

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

// ── 技能自主领悟 + 教练传授（每周检测）──────────────
// ✅ 问题6：加入教练技能传授逻辑
function checkSelfLearnSkills(players, coaches, newWeek) {
  const skillNews    = []
  const playerUpdates = {}

  players.forEach(player => {
    // 1. 自主领悟
    SKILL_NAMES.forEach(skillName => {
      const chance = getSelfLearnChance(player, skillName)
      if (chance <= 0) return
      if (Math.random() < chance) {
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

    // ✅ 2. 教练传授：检查本周给该球员上课的教练是否会某技能，且球员满足学习条件
    // 传授概率：每节私教课 30%，团课 5%
    const coachesThisWeek = new Set()  // 本周给该球员上课的教练id集合
    Object.values({}).forEach(() => {})  // 占位，下面用 schedule 处理
    // 注意：schedule 在这里不可访问，改为通过参数传入（见下方调用处）

  })

  return { skillNews, playerUpdates }
}

// ✅ 问题6：重写技能检测函数，加入 schedule 参数以支持教练传授
function checkSkills(players, coaches, schedule, newWeek) {
  const skillNews    = []
  const playerUpdates = {}

  players.forEach(player => {
    // 1. 自主领悟
    SKILL_NAMES.forEach(skillName => {
      const chance = getSelfLearnChance(player, skillName)
      if (chance <= 0) return
      if (Math.random() < chance) {
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

    // 2. 教练技能传授
    // 收集本周给该球员上课的教练
    const coachesTeaching = []
    Object.values(schedule).forEach(sessions => {
      sessions.forEach(s => {
        if (!s.playerIds?.includes(player.id)) return
        const coach = coaches.find(c => c.id === s.coachId)
        if (!coach || !coach.skills?.length) return
        // 避免重复添加同一教练
        if (!coachesTeaching.find(c => c.id === coach.id)) {
          coachesTeaching.push({ coach, sessionType: s.type, hours: s.hours || 1 })
        }
      })
    })

    // 对每个教练的每个技能检查是否传授
    coachesTeaching.forEach(({ coach, sessionType }) => {
      coach.skills.forEach(skillName => {
        // 球员已有该技能则跳过
        const currentSkills = playerUpdates[player.id]?.skills || player.skills || []
        if (currentSkills.includes(skillName)) return

        // 检查球员是否满足学习该技能的条件
        if (!canCoachTeach(player, skillName)) return

        // 传授概率：私教课 30%，团课 5%
        const teachChance = sessionType === 'private' ? 0.30 : 0.05
        if (Math.random() < teachChance) {
          if (!playerUpdates[player.id]) {
            playerUpdates[player.id] = { skills: [...(player.skills || [])] }
          }
          if (!playerUpdates[player.id].skills.includes(skillName)) {
            playerUpdates[player.id].skills.push(skillName)
            skillNews.push({
              id: Date.now() + Math.random(),
              type: 'skill',
              text: `教练${coach.name}在训练中传授了「${skillName}」技能给${player.name}！`,
              week: newWeek,
            })
          }
        }
      })
    })
  })

  return { skillNews, playerUpdates }
}

// ── 比赛触发 ─────────────────────────────────────────
async function processMatchEvents(state, newWeek, currentPlayers) {
  const { myEntries, allEvents } = state
  const matchNews = []
  const matchTransactions = []
  let updatedPlayers = [...currentPlayers]

  const startingEvents = allEvents.filter(ev => ev.week === newWeek)
  const endingEvents   = allEvents.filter(ev => ev.week + 1 === newWeek)

  // 第一周：标记参赛球员
  startingEvents.forEach(event => {
    const entry = myEntries.find(e => e.eventId === event.id)
    if (!entry) return
    entry.playerIds.forEach(pid => {
      updatedPlayers = updatedPlayers.map(p =>
        p.id !== pid ? p : { ...p, inMatch: true, matchEventId: event.id }
      )
    })
    matchNews.push({
      id: Date.now() + Math.random(),
      type: 'event',
      text: `【${event.name}】本周开赛，${entry.playerIds.length}名球员参赛，期待好成绩！`,
      week: newWeek,
    })
  })

  // 第二周：结算比赛结果
  for (const event of endingEvents) {
    const entry = myEntries.find(e => e.eventId === event.id)
    if (!entry) continue

    let worldPlayers = []
    try {
      const firstPlayer = updatedPlayers.find(p => entry.playerIds.includes(p.id))
      const gender = firstPlayer?.gender || 'male'
      const res = await fetch(`/api/worldplayers?level=${event.level}&gender=${gender}`)
      const data = await res.json()
      worldPlayers = data.players || []
    } catch (err) {
      console.warn('获取世界球员失败，使用虚拟对手:', err)
    }

    const participatingPlayers = updatedPlayers.filter(p => entry.playerIds.includes(p.id))
    const results = simulateTournament(participatingPlayers, event, worldPlayers)

    let totalPrize = 0
    const resultSummaries = []

    results.forEach(result => {
      totalPrize += result.prize
      const player = updatedPlayers.find(p => p.id === result.playerId)
      if (player) {
        const newPoints = (player.points || 0) + result.points
        const { updatedAttrs, newPool } = applyMatchExp(player, result.expGained)
        updatedPlayers = updatedPlayers.map(p =>
          p.id !== result.playerId ? p : {
            ...p, ...updatedAttrs, expPool: newPool,
            points: newPoints, inMatch: false, matchEventId: null,
          }
        )
      }
      resultSummaries.push(`${result.playerName} ${result.finalRoundLabel}`)
    })

    if (totalPrize > 0) {
      matchTransactions.push({
        id: `tx_match_${event.id}_${newWeek}`,
        type: 'income', category: 'prize',
        label: `${event.name}奖金`, amount: totalPrize,
      })
    }

    matchNews.push({
      id: Date.now() + Math.random(),
      type: 'event',
      text: `【${event.name}】结果出炉：${resultSummaries.join('，')}。总奖金 ¥${totalPrize.toLocaleString()}。`,
      week: newWeek,
      matchResults: results,
    })

    entry.playerIds.forEach(pid => {
      updatedPlayers = updatedPlayers.map(p =>
        p.id !== pid ? p : { ...p, inMatch: false, matchEventId: null }
      )
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

  // ✅ 问题3：计算设施疲劳恢复加成
  const facilityMults = getFacilityMultipliers(facilities || [])
  const extraFatigueRecovery = getServiceFatigueRecovery(facilities || [])

  // 3. 处理比赛事件
  const {
    updatedPlayers: playersAfterMatch,
    matchNews,
    matchTransactions,
  } = await processMatchEvents(state, newWeek, players)

  // 4. 计算每个球员的疲劳、经验、属性、伤病
  const updatedPlayers = playersAfterMatch.map(player => {
    if (player.health === 'major') {
      // 重伤球员：疲劳缓慢恢复，但设施能帮助更快恢复
      const majorRecovery = DAILY_FATIGUE_RECOVERY * 7 + extraFatigueRecovery * 7
      return { ...player, fatigue: Math.max(0, Math.round(player.fatigue - majorRecovery)) }
    }

    if (player.inMatch) {
      // 比赛中球员：小幅疲劳增加，设施恢复也适用
      const matchFatigue = Math.min(100, player.fatigue + 15 - extraFatigueRecovery * 2)
      return { ...player, fatigue: Math.max(0, Math.round(matchFatigue)) }
    }

    // ✅ 问题3：传入 extraFatigueRecovery
    const newFatigue = simulateFatigueByDay(
      player.fatigue, player.age, fullSchedule, extraFatigueRecovery
    )
    const { techExp, physExp, mentalExp } = calcPlayerExp(player.id, fullSchedule, coaches, facilityMults)
    const { updatedAttrs, newPool } = applyExpToPool(player, techExp, physExp, mentalExp)

    let newHealth = player.health
    if (player.health === 'minor' && Math.random() < 0.4) newHealth = 'healthy'
    if (newHealth === 'healthy' && newFatigue >= 85) {
      const injuryChance = calcInjuryChance(player)
      if (Math.random() < injuryChance) newHealth = 'minor'
    }

    return { ...player, ...updatedAttrs, expPool: newPool, fatigue: newFatigue, health: newHealth }
  })

  // 5. ✅ 问题6：技能检测（自主领悟 + 教练传授）
  const { skillNews, playerUpdates } = checkSkills(updatedPlayers, coaches, fullSchedule, newWeek)
  const updatedPlayersWithSkills = updatedPlayers.map(p =>
    playerUpdates[p.id] ? { ...p, skills: playerUpdates[p.id].skills } : p
  )

  // 6. 教练合同处理
  const contractNews = []
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

  // 团课收费忠诚度影响
  const FAMILY_LOYALTY_MULT = { 贫穷: 2.0, 普通: 1.2, 小康: 0.8, 富裕: 0.4 }
  const BASE_GROUP_FEE = 80

  const playersAfterLoyalty = updatedPlayersWithSkills.map(player => {
    let groupHours = 0
    DAYS_KEYS.forEach(day => {
      ;(schedule[day] || []).forEach(s => {
        if (['court_group','fitness_group','tactics'].includes(s.type)) {
          if (s.playerIds?.includes(player.id)) groupHours += s.hours || 0
        }
      })
    })
    if (groupHours <= 0) return player

    const actualFee = Math.max(settings.groupClassFee, settings.fitnessClassFee, settings.tacticsClassFee)
    const overcharge = Math.max(0, actualFee - BASE_GROUP_FEE)
    if (overcharge <= 0) return player

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
    { id: `tx_${newWeek}_1`, type: 'income',  category: 'court_rent',   label: '场地外租', amount: rentalInfo.income },
    { id: `tx_${newWeek}_2`, type: 'income',  category: 'private_cut',  label: '私教分成', amount: privateIncome     },
    { id: `tx_${newWeek}_3`, type: 'income',  category: 'group_class',  label: '团课收费', amount: groupIncome       },
    { id: `tx_${newWeek}_4`, type: 'expense', category: 'coach_salary', label: '教练薪资', amount: coachSalary       },
    { id: `tx_${newWeek}_5`, type: 'expense', category: 'insurance',    label: '球员保险', amount: insurance         },
    { id: `tx_${newWeek}_6`, type: 'expense', category: 'subsidy',      label: '赞助球员补助', amount: subsidy       },
    ...matchTransactions,
  ].filter(t => t.amount > 0)

  // 8. 随机事件
  let newRecentNews = [...matchNews, ...skillNews, ...contractNews, ...(state.recentNews || [])].slice(0, 15)
  let finalPlayers  = playersAfterLoyalty

  if (Math.random() < 0.3) {
    const ev = randomEvent(finalPlayers)
    if (ev) {
      if (ev.type === 'skill' && ev.skill && ev.playerIds?.length) {
        finalPlayers = finalPlayers.map(p => {
          if (!ev.playerIds.includes(p.id)) return p
          if (p.skills?.includes(ev.skill)) return p
          return { ...p, skills: [...(p.skills || []), ev.skill] }
        })
      }
      newRecentNews = [
        { id: Date.now(), type: ev.type, text: ev.text, week: newWeek },
        ...newRecentNews,
      ].slice(0, 15)
      if (ev.type === 'finance' && ev.amount) {
        newTx.push({ id: `tx_${newWeek}_bonus`, type: 'income', category: 'other', label: '随机事件收入', amount: ev.amount })
      }
    }
  }

  const totalIncome  = newTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = newTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  // ✅ 问题5：每周刷新招募市场候选人
  const newRecruitPlayers = generateRecruitPlayers(newWeek)
  const newRecruitCoaches = generateRecruitCoaches(newWeek)

  return {
    ...state,
    gameState: {
      ...gameState,
      week: newWeek, year: newYear, cash: newCash,
      prestigeChange: Math.floor(Math.random() * 10 - 3),
    },
    clubStats: { ...state.clubStats, coachCount: updatedCoaches.length },
    players:  finalPlayers,
    coaches:  updatedCoaches,
    finance: {
      ...finance, cash: newCash,
      weekIncome: totalIncome, weekExpense: totalExpense, weekNet: totalIncome - totalExpense,
    },
    transactions:    newTx,
    recentNews:      newRecentNews,
    // ✅ 问题5：更新招募市场数据
    recruitPlayers:  newRecruitPlayers,
    recruitCoaches:  newRecruitCoaches,
  }
}
