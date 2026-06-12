// ══════════════════════════════════════════════════════
// 难度初始化配置
// 每种难度定义完整的初始游戏 state
// 被 App.jsx 在新游戏开始时读取
// ══════════════════════════════════════════════════════

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const MALE_NAMES = [
  '王浩然','李志远','张宇轩','刘建国','陈伟明','孙俊杰','周晨曦','吴锦涛',
  '郑大鹏','冯凯','林鑫','黄磊','赵博文','徐子豪','何建辉','江文涛','许嘉豪',
]
const FEMALE_NAMES = [
  '王晓雨','李美玲','张静怡','刘梦琪','陈小慧','孙雪','周慧敏','吴婷婷',
  '郑丽华','冯雯雯','林佳慧','黄欣怡','赵紫涵','徐雅琳','何梦瑶','江欣桐','许思涵',
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
  return Math.round(Math.min(85, Math.max(20, base + randInt(-spread, spread))))
}

// 计算初始排名（仅在调用方决定"该球员有排名"后才调用）
// ✅ 排名必须在数据库范围外：成年501+，青少年201+，13岁以下无排名
// prestige 参数仅供 difficultyConfig 内部调用时传入（可选），默认走5%概率
function calcInitialRanking(avgAttr, age, gender) {
  const attrFactor = Math.max(0, Math.min(1, (avgAttr - 20) / 65))
  const ageFactor  = (age - 13) / 10
  const score      = attrFactor * 0.75 + ageFactor * 0.25

  if (age < 14) return null

  if (age < 18) {
    // 青少年 ITF：201~800
    const raw = Math.round(800 - score * 599)
    return Math.max(201, Math.min(800, raw + randInt(-30, 30)))
  }

  if (gender === 'male') {
    // ATP 成年：501~1800
    const raw = Math.round(1800 - score * 1299)
    return Math.max(501, Math.min(1800, raw + randInt(-80, 80)))
  } else {
    // WTA 成年：501~1200
    const raw = Math.round(1200 - score * 699)
    return Math.max(501, Math.min(1200, raw + randInt(-60, 60)))
  }
}

// 决定一名系统生成球员是否拥有排名
// prestige: 俱乐部声望（越高，接触到有排名球员的概率越高）
// 初始建队时无声望参考，传 null 使用固定5%
// 上限25%：即使顶级俱乐部，绝大多数招募对象仍是无排名的青少年苗子
function rollHasRanking(age, prestige = null) {
  if (age < 14) return false  // 13岁以下从不有排名
  const p = prestige === null
    ? 0.05  // 初始建队固定5%
    : Math.min(0.25, 0.03 + prestige / 55000)
  return Math.random() < p
}

// 根据排名计算初始积分（同步版本，用保守参考值）
// 游戏启动时无法调用 API，使用固定参考边界值（与真实数据库接近的保守估算）
// ATP/WTA 第500名约 80 分，ITF 第200名约 20 分
// 公式：points = boundary × (boundaryRank / rank)²，排名越低积分衰减越快
function calcInitialPoints(ranking, age) {
  if (!ranking || ranking <= 0) return 0
  if (age < 14) return 0

  if (age < 18) {
    // ITF青少年：boundary=20分，boundaryRank=200
    const raw = 20 * Math.pow(200 / ranking, 2)
    const jitter = 0.85 + Math.random() * 0.30
    return Math.max(0, Math.round(raw * jitter))
  } else {
    // 成年 ATP/WTA：boundary=80分，boundaryRank=500
    const raw = 80 * Math.pow(500 / ranking, 2)
    const jitter = 0.85 + Math.random() * 0.30
    return Math.max(0, Math.round(raw * jitter))
  }
}

function makeYoungPlayer(id, gender, talentRange = [55, 85], usedNames = new Set()) {
  const talent = randInt(talentRange[0], talentRange[1])
  const age    = randInt(13, 17)

  // ✅ 修复a：资质越好 → base越高 → 属性越好
  // 提高 talent 权重（原0.25 → 0.45），减少年龄权重，确保资质差异明显体现在属性上
  const base = Math.floor(age * 1.5 + talent * 0.45)

  // 属性随机幅度随资质收窄：天才球员属性更稳定，普通球员更随机
  const spread = talent >= 78 ? 6 : talent >= 65 ? 9 : 12

  const injuryBase = age <= 14 ? 75 : 65

  const serve       = randAttr(base * 0.80, spread)
  const forehand    = randAttr(base * 0.85, spread)
  const backhand    = randAttr(base * 0.80, spread)
  const returnServe = randAttr(base * 0.75, spread)
  const volley      = randAttr(base * 0.65, spread)
  const footwork    = randAttr(base * 0.82, spread)
  const strength    = randAttr(base * 0.85, spread)
  const stamina     = randAttr(base * 0.90, spread)
  const agility     = randAttr(base * 0.90, spread)
  const pressure    = randAttr(base * 0.75, spread)
  const willpower   = randAttr(base * 0.80, spread)
  const focus       = randAttr(base * 0.78, spread)

  // ✅ 修复b + c：属性均值决定排名，男女排名区间分开
  const avgAttr = Math.round(
    (serve + forehand + backhand + returnServe + volley + footwork +
     strength + stamina + agility + pressure + willpower + focus) / 12
  )
  // ✅ 只有5%概率拥有排名（初始建队无声望参考，用固定保守概率）
  // 绝大多数初始球员是未经历系统赛事的青少年苗子，没有正式排名
  const ranking = rollHasRanking(age, null)
    ? calcInitialRanking(avgAttr, age, gender)
    : null

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
    ranking,
    points:       calcInitialPoints(ranking, age),
    talent,
    talentLabel:  talentLabel(talent),
    injuryResist: Math.min(90, Math.max(55, randAttr(injuryBase, 8))),
    serve, forehand, backhand, returnServe, volley, footwork,
    strength, stamina, agility, pressure, willpower, focus,
    skills:       [],
    preferences:  [],
    expPool:      {},
    inMatch:      false,
    matchEventId: null,
  }
}

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
    age:               randInt(25, 50),
    level,
    levelLabel:        cfg.levelLabel,
    style:             ['strict','free','balanced'][randInt(0, 2)],
    styleLabel:        ['一丝不苟','自由发挥','张弛有度'][randInt(0, 2)],
    expBonus:          cfg.expBonus,
    loyalty:           randInt(65, 80),
    weeklySalary:      randInt(cfg.salaryRange[0], cfg.salaryRange[1]),
    contractWeeksLeft: cfg.contractWeeks,
    specialSkills:     [],
    skills:            [],
    studentCount:      0,
    totalStudents:     level === 'senior' ? 4 : level === 'normal' ? 6 : 8,
    careerHighlight:   level === 'senior'
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

// ── 设施配置 ──────────────────────────────────────────
const HARD_FACILITIES = [
  { id: 'hard_1', type: 'hard_court', category: 'training', name: '硬地球场 1', level: '糟糕', count: 1, mainEffect: '技术 +80%，身体 +40%',   icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_2', type: 'hard_court', category: 'training', name: '硬地球场 2', level: '糟糕', count: 1, mainEffect: '技术 +80%，身体 +40%',   icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_3', type: 'hard_court', category: 'training', name: '硬地球场 3', level: '糟糕', count: 1, mainEffect: '技术 +80%，身体 +40%',   icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_4', type: 'hard_court', category: 'training', name: '硬地球场 4', level: '糟糕', count: 1, mainEffect: '技术 +80%，身体 +40%',   icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'locker_1', type: 'locker',   category: 'service',  name: '更衣室',     level: '糟糕', mainEffect: '每天疲劳 -2', icon: 'ti-door',         maintenancePaid: true },
  { id: 'gym_1',    type: 'gym',      category: 'training', name: '健身房',     level: '糟糕', mainEffect: '身体 +80%，精神 +40%', icon: 'ti-barbell', maintenancePaid: true },
  { id: 'empty_1', type: 'empty', category: 'empty', name: '空地 A', level: null, mainEffect: '可建设新设施（¥10万开发费）', icon: 'ti-square-plus', maintenancePaid: null },
  { id: 'empty_2', type: 'empty', category: 'empty', name: '空地 B', level: null, mainEffect: '可建设新设施（¥10万开发费）', icon: 'ti-square-plus', maintenancePaid: null },
]

const NORMAL_FACILITIES = [
  { id: 'hard_1', type: 'hard_court', category: 'training', name: '硬地球场 1', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_2', type: 'hard_court', category: 'training', name: '硬地球场 2', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_3', type: 'hard_court', category: 'training', name: '硬地球场 3', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_4', type: 'hard_court', category: 'training', name: '硬地球场 4', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_5', type: 'hard_court', category: 'training', name: '硬地球场 5', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_6', type: 'hard_court', category: 'training', name: '硬地球场 6', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'locker_1', type: 'locker',  category: 'service',  name: '更衣室', level: '普通', mainEffect: '每天疲劳 -4', icon: 'ti-door',    maintenancePaid: true },
  { id: 'gym_1',    type: 'gym',     category: 'training', name: '健身房', level: '普通', mainEffect: '身体 +100%，精神 +50%', icon: 'ti-barbell', maintenancePaid: true },
  { id: 'lounge_1', type: 'lounge',  category: 'service',  name: '休息室', level: '普通', mainEffect: '每天疲劳 -5', icon: 'ti-sofa',    maintenancePaid: true },
  { id: 'empty_1', type: 'empty', category: 'empty', name: '空地 A', level: null, mainEffect: '可建设新设施（¥10万开发费）', icon: 'ti-square-plus', maintenancePaid: null },
  { id: 'empty_2', type: 'empty', category: 'empty', name: '空地 B', level: null, mainEffect: '可建设新设施（¥10万开发费）', icon: 'ti-square-plus', maintenancePaid: null },
]

const EASY_FACILITIES = [
  { id: 'hard_1', type: 'hard_court', category: 'training', name: '硬地球场 1', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_2', type: 'hard_court', category: 'training', name: '硬地球场 2', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_3', type: 'hard_court', category: 'training', name: '硬地球场 3', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_4', type: 'hard_court', category: 'training', name: '硬地球场 4', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_5', type: 'hard_court', category: 'training', name: '硬地球场 5', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'hard_6', type: 'hard_court', category: 'training', name: '硬地球场 6', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'clay_1', type: 'clay_court', category: 'training', name: '红土球场 1', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'clay_2', type: 'clay_court', category: 'training', name: '红土球场 2', level: '普通', count: 1, mainEffect: '技术 +100%，身体 +50%', icon: 'ti-rectangle', maintenancePaid: true },
  { id: 'locker_1',    type: 'locker',    category: 'service',  name: '更衣室', level: '普通', mainEffect: '每天疲劳 -4', icon: 'ti-door',    maintenancePaid: true },
  { id: 'gym_1',       type: 'gym',       category: 'training', name: '健身房', level: '普通', mainEffect: '身体 +100%，精神 +50%', icon: 'ti-barbell', maintenancePaid: true },
  { id: 'lounge_1',    type: 'lounge',    category: 'service',  name: '休息室', level: '普通', mainEffect: '每天疲劳 -5', icon: 'ti-sofa',    maintenancePaid: true },
  { id: 'dormitory_1', type: 'dormitory', category: 'service',  name: '宿舍',   level: '普通', mainEffect: '每天疲劳 -5，创收', icon: 'ti-bed', maintenancePaid: true },
  { id: 'empty_1', type: 'empty', category: 'empty', name: '空地 A', level: null, mainEffect: '可建设新设施（¥10万开发费）', icon: 'ti-square-plus', maintenancePaid: null },
]

// ══════════════════════════════════════════════════════
// 主函数：根据难度和游戏年限生成完整初始 state
// ══════════════════════════════════════════════════════
export function buildInitialState(difficulty, baseState, gameDuration = 20, clubName = '长青网球俱乐部') {
  const d = (difficulty || 'normal').toLowerCase().trim()
  difficulty = d
  const usedNames = new Set()

  const endYear = 1 + (Number(gameDuration) || 20)

  // ── 困难 ──────────────────────────────────────────
  if (difficulty === 'hard') {
    const INIT_CASH = 100000
    const players = Array.from({ length: 6 }, (_, i) =>
      makeYoungPlayer(i + 1, i % 2 === 0 ? 'male' : 'female', [50, 75], usedNames)
    )
    const coaches = [
      makeCoach(1, 'assistant', '陈文博', 'male'),
      makeCoach(2, 'normal',   '王志明', 'male'),
    ]
    return {
      ...baseState,
      gameState: {
        ...baseState.gameState,
        clubName,
        difficulty:    'hard',
        clubSize:      'small',
        cash:          INIT_CASH,   // ✅ 保留 gameState.cash 供兼容
        prestige:      0,
        prestigeTitle: '默默无闻',
        loanMonthly:   5000,
        endYear,
        gameDuration,
      },
      // ✅ 修复：同步设置 finance.cash，weekEngine 和 FinancePage 都读这个字段
      finance: {
        ...baseState.finance,
        cash: INIT_CASH,
        weekIncome: 0,
        weekExpense: 0,
        weekNet: 0,
      },
      clubStats: {
        ...baseState.clubStats,
        playerCount:    players.length,
        playerCapacity: 10,
        coachCount:     coaches.length,
        courtCount:     4,
        courtTypes:     '糟糕硬地',
        facilityCount:  HARD_FACILITIES.filter(f => f.type !== 'empty').length,
      },
      players,
      coaches,
      facilities:   HARD_FACILITIES,
      schedule:     { mon:[], tue:[], wed:[], thu:[], fri:[], sat:[], sun:[] },
      transactions: [],
      weeklyTrend:  [],
      recentNews:   [{ id: 1, type: 'player', text: '欢迎来到困难模式！资金紧张，贷款压力大，每一分钱都要用在刀刃上。', week: 1 }],
      // ── 装备系统初始状态 ──
      research: {
        points: 0,
        pointsPerWeek: 2,       // 困难模式研发慢
        activeProjects: [],
        completedItems: [],
      },
      inventory: [],
      activeFacilityItems: [],
    }
  }

  // ── 普通 ──────────────────────────────────────────
  if (difficulty === 'normal') {
    const INIT_CASH = 200000
    const players = Array.from({ length: 12 }, (_, i) =>
      makeYoungPlayer(i + 1, i % 2 === 0 ? 'male' : 'female', [55, 80], usedNames)
    )
    const coaches = [
      makeCoach(1, 'assistant', '陈文博', 'male'),
      makeCoach(2, 'assistant', '赵磊',   'male'),
      makeCoach(3, 'normal',   '李梅',   'female'),
      makeCoach(4, 'normal',   '王志明', 'male'),
    ]
    return {
      ...baseState,
      gameState: {
        ...baseState.gameState,
        clubName,
        difficulty:    'normal',
        clubSize:      'medium',
        cash:          INIT_CASH,
        prestige:      1000,
        prestigeTitle: '当地闻名',
        loanMonthly:   0,
        endYear,
        gameDuration,
      },
      // ✅ 修复：同步设置 finance.cash
      finance: {
        ...baseState.finance,
        cash: INIT_CASH,
        weekIncome: 0,
        weekExpense: 0,
        weekNet: 0,
      },
      clubStats: {
        ...baseState.clubStats,
        playerCount:    players.length,
        playerCapacity: 18,
        coachCount:     coaches.length,
        courtCount:     6,
        courtTypes:     '普通硬地',
        facilityCount:  NORMAL_FACILITIES.filter(f => f.type !== 'empty').length,
      },
      players,
      coaches,
      facilities:   NORMAL_FACILITIES,
      schedule:     { mon:[], tue:[], wed:[], thu:[], fri:[], sat:[], sun:[] },
      transactions: [],
      weeklyTrend:  [],
      recentNews:   [{ id: 1, type: 'player', text: '欢迎来到普通模式！拥有一支小有规模的球队，合理规划经营策略，逐步走向顶峰。', week: 1 }],
      // ── 装备系统初始状态 ──
      research: {
        points: 0,
        pointsPerWeek: 3,       // 普通模式研发速度
        activeProjects: [],
        completedItems: [],
      },
      inventory: [],
      activeFacilityItems: [],
    }
  }

  // ── 简单 ──────────────────────────────────────────
  const INIT_CASH = 500000
  const players = Array.from({ length: 16 }, (_, i) =>
    makeYoungPlayer(i + 1, i % 2 === 0 ? 'male' : 'female', [65, 90], usedNames)
  )
  const coaches = [
    makeCoach(1, 'assistant', '陈文博',  'male'),
    makeCoach(2, 'assistant', '赵磊',    'male'),
    makeCoach(3, 'normal',   '李梅',    'female'),
    makeCoach(4, 'normal',   '王志明',  'male'),
    makeCoach(5, 'normal',   '孙丽华',  'female'),
    makeCoach(6, 'senior',   '张国强',  'male'),
  ]
  return {
    ...baseState,
    gameState: {
      ...baseState.gameState,
      clubName,
      difficulty:    'easy',
      clubSize:      'medium',
      cash:          INIT_CASH,
      prestige:      3000,
      prestigeTitle: '省内知名',
      loanMonthly:   0,
      endYear,
      gameDuration,
    },
    // ✅ 修复：同步设置 finance.cash
    finance: {
      ...baseState.finance,
      cash: INIT_CASH,
      weekIncome: 0,
      weekExpense: 0,
      weekNet: 0,
    },
    clubStats: {
      ...baseState.clubStats,
      playerCount:    players.length,
      playerCapacity: 24,
      coachCount:     coaches.length,
      courtCount:     8,
      courtTypes:     '普通硬地 + 红土',
      facilityCount:  EASY_FACILITIES.filter(f => f.type !== 'empty').length,
    },
    players,
    coaches,
    facilities:   EASY_FACILITIES,
    schedule:     { mon:[], tue:[], wed:[], thu:[], fri:[], sat:[], sun:[] },
    transactions: [],
    weeklyTrend:  [],
    recentNews:   [{ id: 1, type: 'player', text: '欢迎来到简单模式！资金充裕，设施完善，带领俱乐部走向辉煌！', week: 1 }],
    // ── 装备系统初始状态 ──
    research: {
      points: 0,
      pointsPerWeek: 4,         // 简单模式研发最快
      activeProjects: [],
      completedItems: [],
    },
    inventory: [],
    activeFacilityItems: [],
  }
}
