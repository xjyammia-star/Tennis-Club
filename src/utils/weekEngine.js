// ══════════════════════════════════════════════════════
// 「下一周」核心引擎
// 每次点击「进入下一周」时调用，返回新的完整 state
// ══════════════════════════════════════════════════════

import { getClubSettings } from './clubSettings'
import { calcCourtRentalIncome } from './courtRental'
import { generatePrivateLessons } from './privateLesson'
import { SKILL_DEFS, SKILL_NAMES, getSelfLearnChance, canCoachTeach } from '../data/skillDefs'
import { simulateTournament, applyMatchExp } from './matchEngine'
import { MATCH_EXP, MATCH_ATTR_DIST } from '../data/gameConstants'
// ✅ 新增：导入设施价格、维护费率、共用外租参数提取函数
import { FACILITY_PRICES, MAINTENANCE_RATE } from '../data/mockData'
import { calcRentalParams } from './courtRental'

// ── 招募市场候选人随机生成 ──────────────────────────

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
  return Math.round(Math.min(99, Math.max(1, base + randInt(-spread, spread))))
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

    const baseStat = Math.floor(age * 1.8 + talent * 0.3)
    const hasSkill = talent >= 75 && Math.random() < 0.4
    const allSkills = Object.keys(SKILL_DEFS)
    const skills = hasSkill ? [allSkills[randInt(0, allSkills.length - 1)]] : []

    const injuryBase = age <= 11 ? 85 : age <= 14 ? 75 : age <= 18 ? 65 : 50
    const injuryResist = Math.min(99, Math.max(30, randAttr(injuryBase, 8)))

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
    { level: 'elite',     levelLabel: '顶级教练', expBonus: '+10%', salaryRange: [8000, 12000] },
    { level: 'senior',    levelLabel: '高级教练', expBonus: '+5%',  salaryRange: [5000, 7000]  },
    { level: 'normal',    levelLabel: '普通教练', expBonus: '+3%',  salaryRange: [3000, 5000]  },
    { level: 'assistant', levelLabel: '助教',     expBonus: '0%',   salaryRange: [1500, 2500]  },
  ]
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
      skills:         coachSkills,
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

// ── 随机事件库（内联，无需外部文件）─────────────────
const EVENT_LIBRARY = [
  // 球员类
  { id:'EVT_P01', category:'player',  trigger:'fatigue>80',    probability:0.55, keywords:'球员{name}因长期高强度训练出现不适，本周强制减少训练量', effect:{ fatigue:-15, loyalty:-5 }, tone:'negative' },
  { id:'EVT_P02', category:'player',  trigger:'fatigue>80',    probability:0.35, keywords:'球员{name}训练时突然崴脚，轻微扭伤需休息，但得到妥善照顾', effect:{ fatigue:-25, loyalty:+8 }, tone:'negative' },
  { id:'EVT_P03', category:'player',  trigger:'loyalty<40',    probability:0.50, keywords:'球员{name}对训练安排不满，情绪低落，私下向队友抱怨', effect:{ loyalty:-8 }, tone:'negative' },
  { id:'EVT_P04', category:'player',  trigger:'loyalty<30',    probability:0.35, keywords:'球员{name}提出转会意向，声称外部俱乐部开出了更好条件', effect:{ loyalty:-12 }, tone:'negative' },
  { id:'EVT_P05', category:'player',  trigger:'',              probability:0.12, keywords:'球员{name}训练中突然开窍，技术动作一点就透，状态大幅提升', effect:{ loyalty:+10, expBonus:1.5 }, tone:'positive' },
  { id:'EVT_P06', category:'player',  trigger:'',              probability:0.10, keywords:'球员{name}参加了省级青少年交流赛并获好成绩，信心大增', effect:{ loyalty:+12, fatigue:+10 }, tone:'positive' },
  { id:'EVT_P07', category:'player',  trigger:'',              probability:0.08, keywords:'球员{name}的家长来访，对俱乐部环境高度赞扬并额外提供赞助', effect:{ loyalty:+15, cash:+5000 }, tone:'positive' },
  { id:'EVT_P08', category:'player',  trigger:'',              probability:0.07, keywords:'球员{name}接受体育媒体采访，提到{club}的训练方式，声望提升', effect:{ prestige:+80 }, tone:'positive' },
  { id:'EVT_P09', category:'player',  trigger:'',              probability:0.10, keywords:'球员{name}与队友发生冲突，训练时间分配不均引发矛盾', effect:{ loyalty:-6 }, tone:'negative' },
  { id:'EVT_P10', category:'player',  trigger:'',              probability:0.08, keywords:'球员{name}生日，队友自发庆祝，球队气氛活跃，全队士气提升', effect:{ loyalty:+5 }, tone:'positive' },
  { id:'EVT_P11', category:'player',  trigger:'prestige>2000', probability:0.12, keywords:'一名天赋出众的14岁少年主动联系{club}，希望加入训练', effect:{ cash:-8000, prestige:+50 }, tone:'neutral' },
  { id:'EVT_P12', category:'player',  trigger:'',              probability:0.08, keywords:'球员{name}学习成绩下滑，家长要求减少训练时间，否则退出', effect:{ loyalty:-10 }, tone:'negative' },
  { id:'EVT_P13', category:'player',  trigger:'',              probability:0.06, keywords:'球员{name}收到国家青少年集训队邀请，归来后带回宝贵经验', effect:{ loyalty:+20, expBonus:2.0 }, tone:'positive' },
  { id:'EVT_P14', category:'player',  trigger:'loyalty>85',    probability:0.18, keywords:'球员{name}放弃另一家俱乐部的高薪邀请，对{club}充满感情', effect:{ loyalty:+10, prestige:+60 }, tone:'positive' },
  { id:'EVT_P15', category:'player',  trigger:'',              probability:0.06, keywords:'球员{name}在社交媒体发布训练视频爆红，吸引大量关注', effect:{ prestige:+120, loyalty:+8 }, tone:'positive' },
  // 财务类
  { id:'EVT_F01', category:'finance', trigger:'prestige>1500', probability:0.18, keywords:'一家本地运动品牌主动联系{club}，希望冠名赞助本赛季', effect:{ cash:+20000, prestige:+100 }, tone:'positive' },
  { id:'EVT_F02', category:'finance', trigger:'cash<20000',    probability:0.28, keywords:'{club}本月现金流告急，部分供应商催款，管理层紧急开会', effect:{ prestige:-50 }, tone:'negative' },
  { id:'EVT_F03', category:'finance', trigger:'week%4==0',     probability:0.22, keywords:'本月场地利用率超出预期，外租收入比计划多出一笔额外收益', effect:{ cash:+8000 }, tone:'positive' },
  { id:'EVT_F04', category:'finance', trigger:'',              probability:0.08, keywords:'税务部门例行检查，发现一处历史账目问题，需补缴罚款', effect:{ cash:-6000 }, tone:'negative' },
  { id:'EVT_F05', category:'finance', trigger:'prestige>3000', probability:0.12, keywords:'一位成功商人看好{club}发展前景，主动提出小额注资合作', effect:{ cash:+50000, prestige:+150 }, tone:'positive' },
  { id:'EVT_F06', category:'finance', trigger:'',              probability:0.10, keywords:'政府体育部门公布青少年体育补贴政策，{club}成功获批专项补贴', effect:{ cash:+15000 }, tone:'positive' },
  { id:'EVT_F07', category:'finance', trigger:'',              probability:0.08, keywords:'一笔场地预订款遭遇退款纠纷，对方拒绝支付违约金', effect:{ cash:-5000 }, tone:'negative' },
  { id:'EVT_F08', category:'finance', trigger:'prestige>1000', probability:0.15, keywords:'某学校希望与{club}合作定期包场开展青少年体验课', effect:{ cash:+12000, prestige:+80 }, tone:'positive' },
  // 设施类
  { id:'EVT_FA01', category:'facility', trigger:'',            probability:0.10, keywords:'暴雨天气导致{club}球场积水，需紧急排水修缮，本周外租受损', effect:{ cash:-4000 }, tone:'negative' },
  { id:'EVT_FA02', category:'facility', trigger:'',            probability:0.08, keywords:'更衣室热水器突发故障，球员训练后无热水可用，需紧急维修', effect:{ cash:-3000, loyalty:-5 }, tone:'negative' },
  { id:'EVT_FA03', category:'facility', trigger:'prestige>1500',probability:0.12,keywords:'一家体育设备公司主动联系{club}，愿以折扣价提供最新训练器材', effect:{ cash:-10000 }, tone:'neutral' },
  { id:'EVT_FA04', category:'facility', trigger:'',            probability:0.07, keywords:'球场灯光系统老化，夜间训练多次出现闪烁故障，需全面更换', effect:{ cash:-8000 }, tone:'negative' },
  { id:'EVT_FA05', category:'facility', trigger:'prestige>1500',probability:0.10,keywords:'地方政府将{club}列为青少年体育示范基地，拨款资助设施升级', effect:{ cash:+25000, prestige:+200 }, tone:'positive' },
  { id:'EVT_FA06', category:'facility', trigger:'',            probability:0.09, keywords:'消防部门年度安检，指出部分设施存在安全隐患，需限期整改', effect:{ cash:-5000 }, tone:'negative' },
  // 赞助商类
  { id:'EVT_S01', category:'sponsor',  trigger:'prestige>1000',probability:0.18, keywords:'本地饮料品牌希望赞助{club}训练服，提供赞助资金和运动饮料', effect:{ cash:+10000, prestige:+60 }, tone:'positive' },
  { id:'EVT_S02', category:'sponsor',  trigger:'prestige>2500',probability:0.12, keywords:'一家知名运动品牌主动提出成为{club}的官方装备赞助商', effect:{ cash:+40000, prestige:+250 }, tone:'positive' },
  { id:'EVT_S03', category:'sponsor',  trigger:'',             probability:0.12, keywords:'原赞助商因自身业务调整提前终止合同，{club}损失预期赞助收入', effect:{ cash:-15000, prestige:-80 }, tone:'negative' },
  { id:'EVT_S04', category:'sponsor',  trigger:'prestige>500', probability:0.15, keywords:'一位热心网球的本地企业家希望赞助天赋最高的球员', effect:{ cash:+8000, loyalty:+10 }, tone:'positive' },
  { id:'EVT_S05', category:'sponsor',  trigger:'',             probability:0.10, keywords:'赞助商对{club}近期赛场表现不满意，威胁削减赞助金额', effect:{ cash:-5000, prestige:-40 }, tone:'negative' },
  { id:'EVT_S06', category:'sponsor',  trigger:'prestige>3500',probability:0.10, keywords:'国际体育经纪公司看中{club}培养体系，主动接触合作意向', effect:{ prestige:+300 }, tone:'positive' },
  // 教练/员工类
  { id:'EVT_ST01', category:'staff',   trigger:'coachFatigue>80',probability:0.45,keywords:'教练{name}因长期高强度执教出现职业倦怠，执教质量有所下滑', effect:{ coachFatigue:-20, coachLoyalty:-8 }, tone:'negative' },
  { id:'EVT_ST02', category:'staff',   trigger:'',             probability:0.08, keywords:'教练{name}参加了国际网球教练培训课程，带回全新训练理念', effect:{ coachLoyalty:+15 }, tone:'positive' },
  { id:'EVT_ST03', category:'staff',   trigger:'',             probability:0.07, keywords:'另一家俱乐部向教练{name}抛来橄榄枝，开出更高薪资', effect:{ coachLoyalty:-15 }, tone:'negative' },
  { id:'EVT_ST04', category:'staff',   trigger:'',             probability:0.08, keywords:'教练{name}带领球员在省级比赛取得佳绩，个人声誉大幅提升', effect:{ coachLoyalty:+20, prestige:+100 }, tone:'positive' },
  { id:'EVT_ST05', category:'staff',   trigger:'',             probability:0.07, keywords:'教练{name}在家长群引发争议，部分家长对其执教方式提出质疑', effect:{ coachLoyalty:-10, prestige:-60 }, tone:'negative' },
]

function pickRandomEvent(state) {
  const { gameState, finance, players, coaches } = state
  const prestige     = gameState?.prestige   ?? 0
  const cash         = finance?.cash         ?? 0
  const week         = gameState?.week        ?? 1
  const fatigue      = players?.length > 0 ? players.reduce((s,p) => s+(p.fatigue||0),0)/players.length : 0
  const loyalty      = players?.length > 0 ? players.reduce((s,p) => s+(p.loyalty||50),0)/players.length : 70
  const coachFatigue = coaches?.length > 0 ? coaches.reduce((s,c) => s+(c.fatigue||0),0)/coaches.length : 0

  const candidates = EVENT_LIBRARY.filter(evt => {
    if (Math.random() > evt.probability) return false
    if (!evt.trigger) return true
    try {
      // eslint-disable-next-line no-new-func
      return new Function('prestige','cash','week','fatigue','loyalty','coachFatigue',
        `return !!(${evt.trigger})`)(prestige, cash, week, fatigue, loyalty, coachFatigue)
    } catch { return false }
  })
  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

// ── applyEventEffect：将 eventLibrary 的 effect 字段映射到 state 变更 ──────
// 返回 { players, coaches, cashDelta, prestigeDelta, newsTx }
function applyEventEffect(effect, players, coaches, targetPlayer, targetCoach) {
  let cashDelta     = 0
  let prestigeDelta = 0
  let newsTx        = null
  const eff = effect || {}

  // 现金
  if (eff.cash) cashDelta += eff.cash

  // 声望
  if (eff.prestige) prestigeDelta += eff.prestige

  // 球员：fatigue / loyalty / health / expBonus
  let updatedPlayers = players
  if (targetPlayer && (eff.fatigue || eff.loyalty || eff.health || eff.expBonus)) {
    updatedPlayers = players.map(p => {
      if (p.id !== targetPlayer.id) return p
      const updated = { ...p }
      if (eff.fatigue)  updated.fatigue  = Math.min(100, Math.max(0, (p.fatigue  || 0) + eff.fatigue))
      if (eff.loyalty)  updated.loyalty  = Math.min(100, Math.max(0, (p.loyalty  || 50) + eff.loyalty))
      if (eff.health)   updated.health   = eff.health
      // expBonus：本周该球员额外经验倍率（临时标记，weekEngine 训练计算时可读取）
      if (eff.expBonus) updated._eventExpBonus = eff.expBonus
      return updated
    })
  }

  // 教练：coachFatigue / coachLoyalty
  let updatedCoaches = coaches
  if (targetCoach && (eff.coachFatigue || eff.coachLoyalty)) {
    updatedCoaches = coaches.map(c => {
      if (c.id !== targetCoach.id) return c
      const updated = { ...c }
      if (eff.coachFatigue) updated.fatigue = Math.min(100, Math.max(0, (c.fatigue || 0) + eff.coachFatigue))
      if (eff.coachLoyalty) updated.loyalty = Math.min(100, Math.max(0, (c.loyalty || 50) + eff.coachLoyalty))
      return updated
    })
  }

  // 现金变动 → 生成 tx 记录
  if (cashDelta !== 0) {
    newsTx = {
      id:       `tx_evt_${Date.now()}`,
      type:     cashDelta > 0 ? 'income' : 'expense',
      category: 'other',
      label:    '随机事件',
      amount:   Math.abs(cashDelta),
    }
  }

  return { updatedPlayers, updatedCoaches, cashDelta, prestigeDelta, newsTx }
}

// ── 疲劳年龄系数 ──────────────────────────────────────
function getFatiguePerHour(age) {
  if (age <= 11) return 20
  if (age <= 14) return 15
  if (age <= 18) return 10
  return 8
}

const DAILY_FATIGUE_RECOVERY = 50

// ── 获取设施疲劳恢复加成 ────────────────────────────
const SERVICE_FATIGUE_RECOVERY = {
  locker:    { 糟糕: 2, 普通: 4, 高级: 6,  顶级: 8  },
  lounge:    { 糟糕: 2, 普通: 5, 高级: 8,  顶级: 12 },
  physio:    { 糟糕: 0, 普通: 3, 高级: 5,  顶级: 8  },
  dormitory: { 糟糕: 3, 普通: 5, 高级: 8,  顶级: 12 },
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

// ── 抗伤病属性 ──────────────────────────────────────
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

// ── 按天模拟疲劳 ────────────────────────────────────
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

function calcPlayerExp(playerId, schedule, coaches, facilityMults, eventExpBonus = 1.0) {
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
      // ✅ 乘以随机事件的经验加成（如 EVT_P05 开窍×1.5，EVT_P13 集训×2.0）
      const totalExp = expPerHour * hours * coachBonus * eventExpBonus
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

// ── 技能检测（自主领悟 + 教练传授）──────────────────
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
    const coachesTeaching = []
    Object.values(schedule).forEach(sessions => {
      sessions.forEach(s => {
        if (!s.playerIds?.includes(player.id)) return
        const coach = coaches.find(c => c.id === s.coachId)
        if (!coach || !coach.skills?.length) return
        if (!coachesTeaching.find(c => c.id === coach.id)) {
          coachesTeaching.push({ coach, sessionType: s.type, hours: s.hours || 1 })
        }
      })
    })

    coachesTeaching.forEach(({ coach, sessionType }) => {
      coach.skills.forEach(skillName => {
        const currentSkills = playerUpdates[player.id]?.skills || player.skills || []
        if (currentSkills.includes(skillName)) return
        if (!canCoachTeach(player, skillName)) return
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

// ── ✅ 新增：计算设施每周维护费 ──────────────────────
// 维护费 = 设施建造价格 × 维护费率（MAINTENANCE_RATE）
// 每周扣款（不是每月），由 weekEngine 在财务结算时统一扣除
function calcFacilityMaintenance(facilities) {
  let totalMaintenance = 0
  const maintenanceDetails = []  // 用于生成财务明细

  facilities.forEach(f => {
    // 空地不产生维护费
    if (f.type === 'empty' || !f.level || !f.type) return

    const priceTable = FACILITY_PRICES[f.type]
    if (!priceTable) return
    const buildPrice = (priceTable[f.level] || 0) * 10000  // 价格表单位是万元

    const rate = MAINTENANCE_RATE[f.type] || 0.10
    // 维护费 = 建造价 × 维护费率 / 52（换算为每周）
    const weeklyMaintenance = Math.round(buildPrice * rate / 52)

    if (weeklyMaintenance > 0) {
      totalMaintenance += weeklyMaintenance
      maintenanceDetails.push({
        name: f.name,
        amount: weeklyMaintenance,
      })
    }
  })

  return { totalMaintenance, maintenanceDetails }
}

// ── 比赛触发 ─────────────────────────────────────────
// ✅ 修改：返回值新增 newHistoryRecords，用于持久化战绩
async function processMatchEvents(state, newWeek, currentPlayers) {
  const { myEntries, allEvents } = state
  const matchNews = []
  const matchTransactions = []
  const newHistoryRecords = []  // ✅ 新增：本周新产生的历史战绩
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
    let totalPrestige = 0
    const resultSummaries = []

    results.forEach(result => {
      totalPrize += result.prize
      totalPrestige += result.prestige || 0
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

    // ✅ 新增：构建历史战绩记录，存入 eventHistory
    const historyRecord = {
      id: `h_${event.id}_${state.gameState.year}_${newWeek}`,
      eventId:    event.id,
      eventName:  event.name,
      level:      event.level,
      levelLabel: event.levelLabel,
      surface:    event.surface,
      year:       state.gameState.year,
      week:       newWeek,
      // 简版摘要（HistoryRow 展示用）
      results: results.map(r => ({
        playerName:   r.playerName,
        round:        r.finalRoundLabel,
        prize:        r.prize,
        points:       r.points,
      })),
      totalPrize,
      totalPrestige,
      // 完整逐轮战报（MatchReportModal 详情用）
      matchResults: results,
    }
    newHistoryRecords.push(historyRecord)

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

  return { updatedPlayers, matchNews, matchTransactions, newHistoryRecords }
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
  const extraFatigueRecovery = getServiceFatigueRecovery(facilities || [])

  // 3. 处理比赛事件
  const {
    updatedPlayers: playersAfterMatch,
    matchNews,
    matchTransactions,
    newHistoryRecords,  // ✅ 新增
  } = await processMatchEvents(state, newWeek, players)

  // 4. 计算每个球员的疲劳、经验、属性、伤病
  const updatedPlayers = playersAfterMatch.map(player => {
    if (player.health === 'major') {
      const majorRecovery = DAILY_FATIGUE_RECOVERY * 7 + extraFatigueRecovery * 7
      return { ...player, fatigue: Math.max(0, Math.round(player.fatigue - majorRecovery)) }
    }

    if (player.inMatch) {
      const matchFatigue = Math.min(100, player.fatigue + 15 - extraFatigueRecovery * 2)
      return { ...player, fatigue: Math.max(0, Math.round(matchFatigue)) }
    }

    const newFatigue = simulateFatigueByDay(
      player.fatigue, player.age, fullSchedule, extraFatigueRecovery
    )
    // ✅ 传入随机事件经验加成（如开窍×1.5，集训×2.0），用完后清除
    const eventExpBonus = player._eventExpBonus || 1.0
    const { techExp, physExp, mentalExp } = calcPlayerExp(player.id, fullSchedule, coaches, facilityMults, eventExpBonus)
    const { updatedAttrs, newPool } = applyExpToPool(player, techExp, physExp, mentalExp)

    let newHealth = player.health
    if (player.health === 'minor' && Math.random() < 0.4) newHealth = 'healthy'
    if (newHealth === 'healthy' && newFatigue >= 85) {
      const injuryChance = calcInjuryChance(player)
      if (Math.random() < injuryChance) newHealth = 'minor'
    }

    // 清除临时标记，避免下周继续生效
    const cleanAttrs = { ...updatedAttrs }
    delete cleanAttrs._eventExpBonus

    return { ...player, ...cleanAttrs, expPool: newPool, fatigue: newFatigue, health: newHealth, _eventExpBonus: undefined }
  })

  // 5. 技能检测（自主领悟 + 教练传授）
  const { skillNews, playerUpdates } = checkSkills(updatedPlayers, coaches, fullSchedule, newWeek)
  const updatedPlayersWithSkills = updatedPlayers.map(p =>
    playerUpdates[p.id] ? { ...p, skills: playerUpdates[p.id].skills } : p
  )

  // 6. 教练合同处理 + 疲劳度更新
  // ✅ 第4条：教练疲劳度 = 球员疲劳逻辑的50%
  const COACH_FATIGUE_PER_HOUR = 4   // 球员约8，教练取50%
  const COACH_FATIGUE_RECOVERY = 25  // 球员约50，教练取50%

  function calcCoachFatigue(coach, schedule) {
    let fatigue = coach.fatigue ?? 0
    const DAYS_KEYS = ['mon','tue','wed','thu','fri','sat','sun']
    DAYS_KEYS.forEach(day => {
      let teachHours = 0
      ;(schedule[day] || []).forEach(s => {
        if (s.coachIds?.includes(coach.id) || s.coachId === coach.id) {
          if (s.type !== 'rest') teachHours += s.hours || 0
        }
      })
      fatigue = fatigue + teachHours * COACH_FATIGUE_PER_HOUR - COACH_FATIGUE_RECOVERY
      fatigue = Math.min(100, Math.max(0, fatigue))
    })
    return Math.round(fatigue)
  }

  const contractNews = []
  const updatedCoaches = []
  coaches.forEach(c => {
    const newWeeksLeft = Math.max(0, c.contractWeeksLeft - 1)
    // ✅ 计算本周教练疲劳变化
    const newFatigue = calcCoachFatigue(c, fullSchedule)

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
      // ✅ 疲劳度过高时发出警告
      if (newFatigue >= 80 && (c.fatigue ?? 0) < 80) {
        contractNews.push({
          id: Date.now() + Math.random(),
          type: 'coach',
          text: `⚠️ 教练${c.name}疲劳度过高（${newFatigue}），建议减少排课。`,
          week: newWeek,
        })
      }
      updatedCoaches.push({ ...c, contractWeeksLeft: newWeeksLeft, fatigue: newFatigue })
    }
  })

  // 7. 财务结算
  // ✅ 使用共用函数 calcRentalParams，与 SchedulePage/ClubSettingsPage 计算完全一致
  const { weekPrivateCounts, weekGroupCounts } = calcRentalParams(schedule, privateLessons)

  const rentalInfo = calcCourtRentalIncome({
    courtCount: clubStats.courtCount,
    prestige: gameState.prestige,
    hourlyRate: settings.courtHourlyRate,
    weekPrivateCounts,
    weekGroupCounts,
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

  // ✅ 新增：计算设施维护费
  const { totalMaintenance, maintenanceDetails } = calcFacilityMaintenance(facilities || [])

  const weekIncome  = rentalInfo.income + privateIncome + groupIncome + prizeIncome
  const weekExpense = coachSalary + insurance + subsidy + totalMaintenance  // ✅ 加入维护费
  const newCash     = finance.cash + weekIncome - weekExpense

  const newTx = [
    { id: `tx_${newWeek}_1`, type: 'income',  category: 'court_rent',    label: '场地外租',   amount: rentalInfo.income },
    { id: `tx_${newWeek}_2`, type: 'income',  category: 'private_cut',   label: '私教分成',   amount: privateIncome     },
    { id: `tx_${newWeek}_3`, type: 'income',  category: 'group_class',   label: '团课收费',   amount: groupIncome       },
    { id: `tx_${newWeek}_4`, type: 'expense', category: 'coach_salary',  label: '教练薪资',   amount: coachSalary       },
    { id: `tx_${newWeek}_5`, type: 'expense', category: 'insurance',     label: '球员保险',   amount: insurance         },
    { id: `tx_${newWeek}_6`, type: 'expense', category: 'subsidy',       label: '赞助球员补助', amount: subsidy          },
    { id: `tx_${newWeek}_7`, type: 'expense', category: 'maintenance',   label: '设施维护费', amount: totalMaintenance  },
    ...matchTransactions,
  ].filter(t => t.amount > 0)

  // 8. 随机事件
  let newRecentNews = [...matchNews, ...skillNews, ...contractNews, ...(state.recentNews || [])].slice(0, 15)
  let finalPlayers  = playersAfterLoyalty

  // ✅ 随机事件：用 try-catch 保护，避免 eventLibrary 异常导致整个 weekEngine 崩溃
  try { if (typeof pickRandomEvent === 'function') {
    const snapState = {
      gameState: { ...gameState, week: newWeek, year: newYear },
      finance:   { ...finance, cash: newCash },
      players:   finalPlayers,
      coaches:   updatedCoaches,
    }
    const evt = pickRandomEvent(snapState)
    if (evt) {
      // 随机选取一名目标球员（player/sponsor 类事件）
      const targetPlayer = finalPlayers.length > 0
        ? finalPlayers[Math.floor(Math.random() * finalPlayers.length)]
        : null
      // 随机选取一名目标教练（staff 类事件）
      const targetCoach = updatedCoaches.length > 0
        ? updatedCoaches[Math.floor(Math.random() * updatedCoaches.length)]
        : null

      // 把 keywords 中的占位符替换为真实名字
      const newsText = evt.keywords
        .replace('{name}',  targetPlayer?.name || targetCoach?.name || '某球员')
        .replace('{club}',  gameState.clubName || '俱乐部')
        .replace('{value}', String(Math.abs(evt.effect?.loyalty || evt.effect?.cash || 10)))

      // 执行 effect
      const applied = applyEventEffect(
        evt.effect, finalPlayers, updatedCoaches, targetPlayer, targetCoach
      )
      finalPlayers   = applied.updatedPlayers
      updatedCoaches = applied.updatedCoaches

      // 声望变动累加
      const newPrestige = Math.max(0, (gameState.prestige || 0) + (applied.prestigeDelta || 0))

      // 现金变动追加 tx
      if (applied.newsTx) newTx.push(applied.newsTx)
      newCash += applied.cashDelta

      // 追加新闻
      newRecentNews = [
        { id: Date.now(), type: evt.category, text: newsText, week: newWeek },
        ...newRecentNews,
      ].slice(0, 15)

      // 更新声望到 gameState（在 return 块里用）
      gameState._eventPrestige = newPrestige
    }
  } } catch(e) { console.warn('[TCM] 随机事件处理失败（不影响游戏）:', e) }

  // ✅ 周汇总只计算常规收支（不含设施升级/建造等即时消费，那些已通过 DEDUCT_CASH 单独扣除）
  const regularTx    = newTx.filter(t => t.category !== 'facility')
  const totalIncome  = regularTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = regularTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  // 每周刷新招募市场
  const newRecruitPlayers = generateRecruitPlayers(newWeek)
  const newRecruitCoaches = generateRecruitCoaches(newWeek)

  // ✅ 新增：将本周新战绩追加到 eventHistory，并保留历史（最多保留100条）
  const existingHistory = state.eventHistory || []
  const updatedEventHistory = [...newHistoryRecords, ...existingHistory].slice(0, 100)

  // ✅ Bug1终极修复：强制清除设施类消费记录，确保不跨周保留
  // 设施升级/建造/维护费通过 DEDUCT_CASH 即时扣款，tx 记录仅当周有效
  const safeTx = newTx.filter(t => t.category !== 'facility')

  return {
    ...state,
    gameState: {
      ...gameState,
      week: newWeek, year: newYear, cash: newCash,
      prestige: gameState._eventPrestige ?? gameState.prestige ?? 0,
      prestigeChange: Math.floor(Math.random() * 10 - 3),
      _eventPrestige: undefined,
    },
    clubStats: { ...state.clubStats, coachCount: updatedCoaches.length },
    players:  finalPlayers,
    coaches:  updatedCoaches,
    finance: {
      ...finance, cash: newCash,
      weekIncome: totalIncome, weekExpense: totalExpense, weekNet: totalIncome - totalExpense,
    },
    transactions:    safeTx,
    // ✅ 追加本周走势数据（最多保留26周）
    weeklyTrend: [
      ...(state.weeklyTrend || []),
      { week: `第${newWeek}周`, income: totalIncome, expense: totalExpense },
    ].slice(-26),
    recentNews:      newRecentNews,
    recruitPlayers:  newRecruitPlayers,
    recruitCoaches:  newRecruitCoaches,
    // ✅ 新增：持久化 eventHistory（不再丢失战绩）
    eventHistory:    updatedEventHistory,
  }
}
