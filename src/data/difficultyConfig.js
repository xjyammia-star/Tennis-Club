// ══════════════════════════════════════════════════════
// 难度初始化配置
// 每种难度定义完整的初始游戏 state
// 被 App.jsx 在新游戏开始时读取
// ══════════════════════════════════════════════════════

// ── 随机生成球员辅助函数 ──────────────────────────────
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const MALE_NAMES = [
  '王浩然','李志远','张宇轩','刘建国','陈伟明','孙俊杰','周晨曦','吴锦涛',
  '郑大鹏','冯凯','林鑫','黄磊','赵博文','徐子豪','何建辉',
]
const FEMALE_NAMES = [
  '王晓雨','李美玲','张静怡','刘梦琪','陈小慧','孙雪','周慧敏','吴婷婷',
  '郑丽华','冯雯雯','林佳慧','黄欣怡','赵紫涵','徐雅琳','何梦瑶',
]

function pickName(gender, used = new Set()) {
  const pool = gender === 'male' ? MALE_NAMES : FEMALE_NAMES
  const available = pool.filter(n => !used.has(n))
  const name = available.length > 0
    ? available[randInt(0, available.length - 1)]
    : pool[randInt(0, pool.length - 1)] + randInt(1, 9)
  used.add(name)
  return name
}

const TALENT_TIERS = [
  { min: 88, label: '万里挑一' },
  { min: 78, label: '天赋异禀' },
  { min: 65, label: '资质优良' },
  { min: 50, label: '平平无奇' },
  { min: 0,  label: '资质平庸' },
]
function talentLabel(t) {
  return (TALENT_TIERS.find(x => t >= x.min) || TALENT_TIERS[TALENT_TIERS.length - 1]).label
}

function randAttr(base, spread = 12) {
  return Math.min(85, Math.max(20, base + randInt(-spread, spread)))
}

// 生成一名随机青少年球员（年龄 13-17）
function makeYoungPlayer(id, gender, talentRange = [55, 85], usedNames = new Set()) {
  const talent = randInt(talentRange[0], talentRange[1])
  const age    = randInt(13, 17)
  const base   = Math.floor(age * 1.8 + talent * 0.25)
  const injuryBase = age <= 14 ? 75 : 65
  return {
    id,
    name:         pickName(gender, usedNames),
    gender,
    age,
    height:       gender === 'male' ? randInt(158, 182) : randInt(153, 170),
    weight:       gender === 'male' ? randInt(50, 75)   : randInt(44, 62),
    familyBg:     ['贫穷','普通','小康','富裕'][randInt(0, 3)],
    isSponsored:  false,
    health:       'healthy',
    fatigue:      randInt(10, 30),
    loyalty:      randInt(65, 85),
    ranking:      null,
    points:       0,
    talent,
    talentLabel:  talentLabel(talent),
    injuryResist: Math.min(90, Math.max(55, randAttr(injuryBase, 8))),
    strength:     randAttr(base * 0.85, 10),
    stamina:      randAttr(base * 0.90, 10),
    agility:      randAttr(base * 0.90, 10),
    pressure:     randAttr(base * 0.75, 10),
    willpower:    randAttr(base * 0.80, 10),
    focus:        randAttr(base * 0.78, 10),
    serve:        randAttr(base * 0.80, 10),
    forehand:     randAttr(base * 0.85, 10),
    backhand:     randAttr(base * 0.80, 10),
    returnServe:  randAttr(base * 0.75, 10),
    volley:       randAttr(base * 0.65, 10),
    footwork:     randAttr(base * 0.82, 10),
    skills:       [],
    preferences:  [],
    expPool:      {},
    inMatch:      false,
    matchEventId: null,
  }
}

// 生成教练
function makeCoach(id, level, name, gender = 'male') {
  const LEVEL_MAP = {
    assistant: { levelLabel: '助教',     expBonus: '0%',   salaryRange: [1800, 2200], contractWeeks: 52  },
    normal:    { levelLabel: '普通教练', expBonus: '+3%',  salaryRange: [3500, 4500], contractWeeks: 52  },
    senior:    { levelLabel: '高级教练', expBonus: '+5%',  salaryRange: [5500, 6500], contractWeeks: 104 },
  }
  const cfg = LEVEL_MAP[level] || LEVEL_MAP.normal
  return {
    id,
    name,
    gender,
    age:              randInt(25, 50),
    level,
    levelLabel:       cfg.levelLabel,
    style:            ['strict','free','balanced'][randInt(0, 2)],
    styleLabel:       ['一丝不苟','自由发挥','张弛有度'][randInt(0, 2)],
    expBonus:         cfg.expBonus,
    loyalty:          randInt(65, 80),
    weeklySalary:     randInt(cfg.salaryRange[0], cfg.salaryRange[1]),
    contractWeeksLeft: cfg.contractWeeks,
    specialSkills:    [],
    skills:           [],
    studentCount:     0,
    totalStudents:    level === 'senior' ? 4 : level === 'normal' ? 6 : 8,
    careerHighlight:  level === 'senior'
      ? `前职业球员，最高排名 #${randInt(200, 400)}，执教多年`
      : level === 'normal'
      ? `体育学院网球专业，持有 ITF Level 2 证书`
      : `应届毕业，热情有余、经验不足`,
    bio: level === 'senior'
      ? '资历较深，技术稳健，有一定大赛经验。'
      : level === 'normal'
      ? '执教扎实，适合带领青少年系统训练。'
      : '年轻助教，需资深教练带教，忠诚度高。',
  }
}

// ── 三种难度初始设施 ──────────────────────────────────

const HARD_FACILITIES = [
  // 4片糟糕级硬地
  { id: 'hard_1', type: 'hard_court', category: 'training', name: '硬地球场 1', level: '糟糕', count: 1, mainEffect: '技术 +80%，身体 +40%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_2', type: 'hard_court', category: 'training', name: '硬地球场 2', level: '糟糕', count: 1, mainEffect: '技术 +80%，身体 +40%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_3', type: 'hard_court', category: 'training', name: '硬地球场 3', level: '糟糕', count: 1, mainEffect: '技术 +80%，身体 +40%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_4', type: 'hard_court', category: 'training', name: '硬地球场 4', level: '糟糕', count: 1, mainEffect: '技术 +80%，身体 +40%', icon: 'ti-rectangle', maintenancePaid: true },
  // 1片糟糕级更衣室
  { id: 'locker_1', type: 'locker', category: 'service', name: '更衣室', level: '糟糕', mainEffect: '每天疲劳 -2', icon: 'ti-door', maintenancePaid: true },
  // 1片糟糕级健身房
  { id: 'gym_1', type: 'gym', category: 'training', name: '健身房', level: '糟糕', mainEffect: '身体 +80%，精神 +40%', icon: 'ti-barbell', maintenancePaid: true },
  // 空地
  { id: 'empty_1', type: 'empty', category: 'empty', name: '空地 A', level: null, mainEffect: '可建设新设施（¥10万开发费）', icon: 'ti-square-plus', maintenancePaid: null },
  { id: 'empty_2', type: 'empty', category: 'empty', name: '空地 B', level: null, mainEffect: '可建设新设施（¥10万开发费）', icon: 'ti-square-plus', maintenancePaid: null },
]

const NORMAL_FACILITIES = [
  // 6片普通级硬地
  { id: 'hard_1', type: 'hard_court', category: 'training', name: '硬地球场 1', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_2', type: 'hard_court', category: 'training', name: '硬地球场 2', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_3', type: 'hard_court', category: 'training', name: '硬地球场 3', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_4', type: 'hard_court', category: 'training', name: '硬地球场 4', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_5', type: 'hard_court', category: 'training', name: '硬地球场 5', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_6', type: 'hard_court', category: 'training', name: '硬地球场 6', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  // 普通级更衣室 + 健身房 + 休息室
  { id: 'locker_1', type: 'locker',  category: 'service',  name: '更衣室', level: '普通', mainEffect: '每天疲劳 -4', icon: 'ti-door',         maintenancePaid: true },
  { id: 'gym_1',    type: 'gym',     category: 'training', name: '健身房', level: '普通', mainEffect: '身体 +100%，精神 +50%', icon: 'ti-barbell',  maintenancePaid: true },
  { id: 'lounge_1', type: 'lounge',  category: 'service',  name: '休息室', level: '普通', mainEffect: '每天疲劳 -5', icon: 'ti-sofa',         maintenancePaid: true },
  // 空地
  { id: 'empty_1', type: 'empty', category: 'empty', name: '空地 A', level: null, mainEffect: '可建设新设施（¥10万开发费）', icon: 'ti-square-plus', maintenancePaid: null },
  { id: 'empty_2', type: 'empty', category: 'empty', name: '空地 B', level: null, mainEffect: '可建设新设施（¥10万开发费）', icon: 'ti-square-plus', maintenancePaid: null },
]

const EASY_FACILITIES = [
  // 6片普通级硬地
  { id: 'hard_1', type: 'hard_court', category: 'training', name: '硬地球场 1', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_2', type: 'hard_court', category: 'training', name: '硬地球场 2', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_3', type: 'hard_court', category: 'training', name: '硬地球场 3', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_4', type: 'hard_court', category: 'training', name: '硬地球场 4', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_5', type: 'hard_court', category: 'training', name: '硬地球场 5', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_6', type: 'hard_court', category: 'training', name: '硬地球场 6', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  // 2片普通级红土
  { id: 'clay_1', type: 'clay_court', category: 'training', name: '红土球场 1', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'clay_2', type: 'clay_court', category: 'training', name: '红土球场 2', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  // 普通级更衣室 + 健身房 + 休息室 + 宿舍
  { id: 'locker_1',    type: 'locker',    category: 'service',  name: '更衣室', level: '普通', mainEffect: '每天疲劳 -4', icon: 'ti-door',         maintenancePaid: true },
  { id: 'gym_1',       type: 'gym',       category: 'training', name: '健身房', level: '普通', mainEffect: '身体 +100%，精神 +50%', icon: 'ti-barbell',  maintenancePaid: true },
  { id: 'lounge_1',    type: 'lounge',    category: 'service',  name: '休息室', level: '普通', mainEffect: '每天疲劳 -5', icon: 'ti-sofa',         maintenancePaid: true },
  { id: 'dormitory_1', type: 'dormitory', category: 'service',  name: '宿舍',   level: '普通', mainEffect: '每天疲劳 -5，创收', icon: 'ti-bed',      maintenancePaid: true },
  // 空地
  { id: 'empty_1', type: 'empty', category: 'empty', name: '空地 A', level: null, mainEffect: '可建设新设施（¥10万开发费）', icon: 'ti-square-plus', maintenancePaid: null },
]

// ── 主函数：根据难度生成完整初始 state ──────────────
export function buildInitialState(difficulty, baseState) {
  // ✅ 问题2修复：normalize 难度值，防止大小写或空值导致始终走 easy 分支
  const d = (difficulty || 'normal').toLowerCase().trim()
  if (d !== difficulty) {
    console.warn('[buildInitialState] 难度值已 normalize:', difficulty, '->', d)
  }
  difficulty = d
  const usedNames = new Set()

  // ── 困难 ──────────────────────────────────────────
  if (difficulty === 'hard') {
    // 6名随机青少年球员（天赋偏低，50-75）
    const players = Array.from({ length: 6 }, (_, i) => {
      const gender = i % 2 === 0 ? 'male' : 'female'
      return makeYoungPlayer(i + 1, gender, [50, 75], usedNames)
    })
    const coaches = [
      makeCoach(1, 'assistant', '陈文博', 'male'),
      makeCoach(2, 'normal',   '王志明', 'male'),
    ]
    const facilities = HARD_FACILITIES
    const courtCount = 4
    return {
      ...baseState,
      gameState: {
        ...baseState.gameState,
        difficulty:     'hard',
        clubSize:       'small',
        cash:           100000,
        prestige:       0,
        prestigeTitle:  '默默无闻',
        loanMonthly:    5000,
      },
      clubStats: {
        ...baseState.clubStats,
        playerCount:    players.length,
        playerCapacity: 10,
        coachCount:     coaches.length,
        courtCount,
        courtTypes:     '糟糕硬地',
        facilityCount:  facilities.filter(f => f.type !== 'empty').length,
      },
      players,
      coaches,
      facilities,
      schedule:     { mon:[], tue:[], wed:[], thu:[], fri:[], sat:[], sun:[] },
      transactions: [],
      recentNews:   [{
        id: 1, type: 'player',
        text: '欢迎来到困难模式！资金紧张，贷款压力大，每一分钱都要用在刀刃上。',
        week: 1,
      }],
    }
  }

  // ── 普通 ──────────────────────────────────────────
  if (difficulty === 'normal') {
    // 12名随机青少年球员（天赋中等，55-80）
    const players = Array.from({ length: 12 }, (_, i) => {
      const gender = i % 2 === 0 ? 'male' : 'female'
      return makeYoungPlayer(i + 1, gender, [55, 80], usedNames)
    })
    const coaches = [
      makeCoach(1, 'assistant', '陈文博', 'male'),
      makeCoach(2, 'assistant', '赵磊',   'male'),
      makeCoach(3, 'normal',   '李梅',   'female'),
      makeCoach(4, 'normal',   '王志明', 'male'),
    ]
    const facilities = NORMAL_FACILITIES
    const courtCount = 6
    return {
      ...baseState,
      gameState: {
        ...baseState.gameState,
        difficulty:     'normal',
        clubSize:       'medium',
        cash:           200000,
        prestige:       1000,
        prestigeTitle:  '当地闻名',
        loanMonthly:    0,
      },
      clubStats: {
        ...baseState.clubStats,
        playerCount:    players.length,
        playerCapacity: 18,
        coachCount:     coaches.length,
        courtCount,
        courtTypes:     '普通硬地',
        facilityCount:  facilities.filter(f => f.type !== 'empty').length,
      },
      players,
      coaches,
      facilities,
      schedule:     { mon:[], tue:[], wed:[], thu:[], fri:[], sat:[], sun:[] },
      transactions: [],
      recentNews:   [{
        id: 1, type: 'player',
        text: '欢迎来到普通模式！拥有一支小有规模的球队，合理规划经营策略，逐步走向顶峰。',
        week: 1,
      }],
    }
  }

  // ── 简单 ──────────────────────────────────────────
  // 16名随机青少年球员（天赋偏高，65-90）
  const players = Array.from({ length: 16 }, (_, i) => {
    const gender = i % 2 === 0 ? 'male' : 'female'
    return makeYoungPlayer(i + 1, gender, [65, 90], usedNames)
  })
  const coaches = [
    makeCoach(1, 'assistant', '陈文博',  'male'),
    makeCoach(2, 'assistant', '赵磊',    'male'),
    makeCoach(3, 'normal',   '李梅',    'female'),
    makeCoach(4, 'normal',   '王志明',  'male'),
    makeCoach(5, 'normal',   '孙丽华',  'female'),
    makeCoach(6, 'senior',   '张国强',  'male'),
  ]
  const facilities = EASY_FACILITIES
  const courtCount = 8
  return {
    ...baseState,
    gameState: {
      ...baseState.gameState,
      difficulty:     'easy',
      clubSize:       'medium',
      cash:           500000,
      prestige:       3000,
      prestigeTitle:  '省内知名',
      loanMonthly:    0,
    },
    clubStats: {
      ...baseState.clubStats,
      playerCount:    players.length,
      playerCapacity: 24,
      coachCount:     coaches.length,
      courtCount,
      courtTypes:     '普通硬地 + 红土',
      facilityCount:  facilities.filter(f => f.type !== 'empty').length,
    },
    players,
    coaches,
    facilities,
    schedule:     { mon:[], tue:[], wed:[], thu:[], fri:[], sat:[], sun:[] },
    transactions: [],
    recentNews:   [{
      id: 1, type: 'player',
      text: '欢迎来到简单模式！资金充裕，设施完善，带领俱乐部走向辉煌！',
      week: 1,
    }],
  }
}
