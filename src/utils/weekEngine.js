// ══════════════════════════════════════════════════════
// 「下一周」核心引擎 v2
// 每次点击「进入下一周」时调用，返回新的完整 state
// ══════════════════════════════════════════════════════

import { getClubSettings } from './clubSettings'
import { calcCourtRentalIncome } from './courtRental'
import { generatePrivateLessons } from './privateLesson'
import { SKILL_DEFS, SKILL_NAMES, getSelfLearnChance, canCoachTeach } from '../data/skillDefs'
import { simulateTournament, applyMatchExp, pickEventChampion } from './matchEngine'
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

// ── 获取积分边界值（查询数据库排名末位球员的积分作为上限）──────────────
// 返回 { atpBoundary, wtaBoundary, itfMaleBoundary, itfFemaleBoundary }
// 任一接口失败时使用保守默认值，不阻断招募刷新
async function fetchPointsBoundary() {
  const BASE = '/api/worldplayers'
  const safe = async (url, fallback) => {
    try {
      const res = await fetch(url)
      if (!res.ok) return fallback
      const data = await res.json()
      return typeof data.boundaryPoints === 'number' ? data.boundaryPoints : fallback
    } catch { return fallback }
  }
  const [atpBoundary, wtaBoundary, itfMaleBoundary, itfFemaleBoundary] = await Promise.all([
    safe(`${BASE}?mode=boundary&tour=ATP`,                          80),
    safe(`${BASE}?mode=boundary&tour=WTA`,                          80),
    safe(`${BASE}?mode=boundary&tour=ITF_JUNIOR&gender=male`,       20),
    safe(`${BASE}?mode=boundary&tour=ITF_JUNIOR&gender=female`,     20),
  ])
  return { atpBoundary, wtaBoundary, itfMaleBoundary, itfFemaleBoundary }
}

// ── 根据排名和积分上限计算系统生成球员的初始积分 ───────────────────────
// 原理：排名第(boundaryRank)的球员有 boundaryPoints 分
//       排名越低于 boundaryRank，积分衰减越快（平方反比）
//       公式：points = boundaryPoints × (boundaryRank / rank)²
// 例：ATP末位排名500分80分，排名600 → 80×(500/600)² ≈ 56分
//     排名1000 → 80×(500/1000)² = 20分
//     排名1500 → 80×(500/1500)² ≈ 9分
function calcPointsByRank(rank, boundaryRank, boundaryPoints) {
  if (!rank || rank <= 0) return 0
  if (rank <= boundaryRank) return 0  // 不应生成数据库范围内的球员，防御性处理
  const raw = boundaryPoints * Math.pow(boundaryRank / rank, 2)
  // 加小幅随机浮动 ±15%，避免所有同排名球员积分完全一样
  const jitter = 0.85 + Math.random() * 0.30
  return Math.max(0, Math.round(raw * jitter))
}

// ── 生成招募球员（每周5人，async）─────────────────────────────────────
// 每次刷新时：
//   1. 从数据库获取4条积分边界值（ATP/WTA/ITF男/ITF女末位积分）
//   2. 尝试从数据库拉取1~2名真实球员（按声望加权概率）
//   3. 其余名额生成系统虚构球员，排名在数据库范围外，积分不超过边界
async function generateRecruitPlayers(currentWeek, prestige = 0) {
  const TOTAL = 5
  const allSkills = Object.keys(SKILL_DEFS)

  // 1. 获取积分边界
  const { atpBoundary, wtaBoundary, itfMaleBoundary, itfFemaleBoundary } =
    await fetchPointsBoundary()

  // 2. 决定本周是否出现真实球员，最多2名
  //    出现概率随声望上升，声望0约5%，声望5000约40%
  const realPlayerCount = (() => {
    const baseProb = Math.min(0.40, 0.05 + prestige / 15000)
    let count = 0
    for (let i = 0; i < 2; i++) {
      if (Math.random() < baseProb) count++
    }
    return count
  })()

  // 3. 从数据库拉取真实球员（按声望决定可见范围 + 加权随机）
  let realPlayers = []
  if (realPlayerCount > 0) {
    try {
      const res = await fetch(
        `/api/worldplayers?mode=recruit&prestige=${prestige}&count=${realPlayerCount}`
      )
      if (res.ok) {
        const data = await res.json()
        // 将数据库真实球员转换为招募市场格式
        realPlayers = (data.players || []).map((p, i) => {
          const isItf = p.tour === 'ITF_JUNIOR'
          // 真实球员直接使用数据库中的排名和积分
          // 属性根据排名反推：排名越高属性越好
          const rankScore = isItf
            ? Math.max(0, Math.min(1, (200 - p.ranking) / 200))
            : Math.max(0, Math.min(1, (500 - p.ranking) / 500))
          const inferredBase = Math.round(40 + rankScore * 45) // 40~85
          const spread = 8
          return {
            id:          90000 + currentWeek * 10 + i,
            name:        p.name,
            gender:      p.gender,
            age:         p.age || (isItf ? randInt(14, 18) : randInt(19, 28)),
            height:      p.gender === 'male' ? randInt(175, 198) : randInt(165, 180),
            weight:      p.gender === 'male' ? randInt(68, 88)   : randInt(55, 70),
            familyBg:    '普通',
            nationality: p.nationality || '',
            currentClub: '职业巡回赛',
            talent:      Math.round(60 + rankScore * 30),  // 60~90
            talentLabel: getTalentLabel(Math.round(60 + rankScore * 30)),
            health:      'healthy',
            // ✅ 直接使用数据库真实排名和积分
            ranking:     p.ranking,
            points:      p.points || 0,
            isRealPlayer: true,  // 标记为真实球员，供 RecruitPage 展示特殊标志
            tour:        p.tour,
            injuryResist: randInt(45, 70),
            strength:    randAttr(inferredBase * 0.85, spread),
            stamina:     randAttr(inferredBase * 0.90, spread),
            agility:     randAttr(inferredBase * 0.88, spread),
            serve:       randAttr(inferredBase * 0.82, spread),
            forehand:    randAttr(inferredBase * 0.85, spread),
            backhand:    randAttr(inferredBase * 0.80, spread),
            footwork:    randAttr(inferredBase * 0.85, spread),
            pressure:    randAttr(inferredBase * 0.78, spread),
            willpower:   randAttr(inferredBase * 0.80, spread),
            focus:       randAttr(inferredBase * 0.82, spread),
            skills:      [],
            note:        `职业球员，ATP/WTA 排名 #${p.ranking}，现役职业选手。`,
            joinFee:     0,
            expPool:     {},
            fatigue:     randInt(20, 50),
            loyalty:     randInt(50, 70),  // 真实职业球员忠诚度偏低（职业习惯）
            isSponsored: false,
            inMatch:     false,
            matchEventId: null,
          }
        })
      }
    } catch (e) {
      console.warn('[TCM] 真实球员招募拉取失败，跳过:', e)
      realPlayers = []
    }
  }

  // 4. 生成剩余名额的系统虚构球员
  const syntheticCount = TOTAL - realPlayers.length
  const syntheticPlayers = []

  for (let i = 0; i < syntheticCount; i++) {
    const gender  = Math.random() < 0.5 ? 'male' : 'female'
    const name    = gender === 'male'
      ? randName(MALE_SURNAMES, MALE_GIVEN)
      : randName(FEMALE_SURNAMES, FEMALE_GIVEN)
    const age     = randInt(13, 24)
    const talent  = randInt(55, 92)
    const familyBg = FAMILY_BG_LIST[randInt(0, 3)]

    const baseStat = Math.floor(age * 1.8 + talent * 0.3)
    const hasSkill = talent >= 75 && Math.random() < 0.4
    const skills   = hasSkill ? [allSkills[randInt(0, allSkills.length - 1)]] : []

    const injuryBase   = age <= 11 ? 85 : age <= 14 ? 75 : age <= 18 ? 65 : 50
    const injuryResist = Math.min(99, Math.max(30, randAttr(injuryBase, 8)))
    const joinFee      = familyBg === '贫穷' ? 500 : 0

    // ✅ 排名必须在数据库范围外（避免与真实球员冲突）
    // 18岁及以上：ATP/WTA 范围外，排名从 501 起
    // 14-17岁（ITF青少年）：ITF 范围外，排名从 201 起
    // 13岁或无排名：无排名（太小，尚未进入任何系统排名）
    let ranking = null
    let points  = 0

    if (age >= 18) {
      // 成年球员，ATP/WTA 范围外
      // 属性好的排名好一点（501~800），属性差的排名更靠后（501~2000）
      const attrScore = talent / 92  // 0~1
      const rankMin = 501
      const rankMax = Math.round(2000 - attrScore * 1000)  // 1000~2000
      ranking = randInt(rankMin, Math.max(rankMin + 50, rankMax))
      // 积分：以ATP/WTA末位积分为上限，按平方反比衰减
      const boundary    = gender === 'male' ? atpBoundary : wtaBoundary
      const boundaryRnk = gender === 'male' ? 500         : 500
      points = calcPointsByRank(ranking, boundaryRnk, boundary)

    } else if (age >= 14) {
      // 青少年，ITF 范围外，排名从 201 起
      const attrScore = talent / 92
      const rankMin = 201
      const rankMax = Math.round(800 - attrScore * 400)  // 400~800
      ranking = randInt(rankMin, Math.max(rankMin + 50, rankMax))
      // 积分：以ITF末位积分为上限，按平方反比衰减
      const boundary    = gender === 'male' ? itfMaleBoundary : itfFemaleBoundary
      const boundaryRnk = 200
      points = calcPointsByRank(ranking, boundaryRnk, boundary)

    }
    // age < 14：ranking=null，points=0（太小，尚无排名）

    syntheticPlayers.push({
      id:          200 + currentWeek * 10 + i,
      name,
      gender,
      age,
      height:      gender === 'male' ? randInt(160, 195) : randInt(155, 178),
      weight:      gender === 'male' ? randInt(58, 90)   : randInt(48, 70),
      familyBg,
      currentClub: Math.random() < 0.4 ? '其他俱乐部' : '无',
      talent,
      talentLabel: getTalentLabel(talent),
      health:      'healthy',
      ranking,
      points,
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
      expPool:     {},
      pressure:    randAttr(baseStat * 0.75, 12),
      willpower:   randAttr(baseStat * 0.80, 12),
      focus:       randAttr(baseStat * 0.78, 12),
      fatigue:     randInt(10, 40),
      loyalty:     randInt(60, 85),
      isSponsored: false,
      inMatch:     false,
      matchEventId: null,
    })
  }

  // 5. 合并真实球员和虚构球员，随机打乱顺序（不让真实球员固定出现在头部）
  const combined = [...realPlayers, ...syntheticPlayers]
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]]
  }
  return combined
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
// ✅ 修复：新增 playerId 参数，只统计该球员实际参与的课程时长
// 修复前：把当天所有课程时长全部累加，导致疲劳被严重高估，无法正常恢复
function simulateFatigueByDay(startFatigue, age, schedule, extraRecoveryPerDay = 0, playerId = null, fatigueGainMult = 1.0) {
  const DAYS_KEYS = ['mon','tue','wed','thu','fri','sat','sun']
  const fatiguePerHour = getFatiguePerHour(age)
  let fatigue = startFatigue

  DAYS_KEYS.forEach(day => {
    const sessions = schedule[day] || []
    let trainingHours = 0
    sessions.forEach(s => {
      if (s.type !== 'match' && s.type !== 'rest') {
        // ✅ 关键修复：如果传入了 playerId，只统计该球员实际参与的课程
        if (playerId !== null) {
          const inSession = s.playerIds?.includes(playerId) || s.playerId === playerId
          if (!inSession) return
        }
        trainingHours += s.hours || 0
      }
    })
    // ✅ 道具：fatigueGainMult 可降低疲劳增量（如肌肉松弛膏 ×0.8）
    const fatigueGain = trainingHours * fatiguePerHour * fatigueGainMult
    fatigue = fatigue + fatigueGain - DAILY_FATIGUE_RECOVERY - extraRecoveryPerDay
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
    // 道具：技能领悟概率倍率 + 额外检测机会
    const skillChanceMult   = player.activeItems?.reduce((m, ai) => m * (ai.effect?.skillChanceMult || 1), 1) ?? 1
    const extraSkillCheck   = player._extraSkillCheck === true
    const hasInstantSkill   = player.activeItems?.some(ai => ai.effect?.instantSkill) ?? false

    // instantSkill 道具：立即领悟一个球员还没有的技能（随机）
    if (hasInstantSkill) {
      const known = player.skills || []
      const unknown = SKILL_NAMES.filter(s => !known.includes(s))
      if (unknown.length > 0) {
        const picked = unknown[Math.floor(Math.random() * unknown.length)]
        if (!playerUpdates[player.id]) playerUpdates[player.id] = { skills: [...known] }
        if (!playerUpdates[player.id].skills.includes(picked)) {
          playerUpdates[player.id].skills.push(picked)
          skillNews.push({
            id: Date.now() + Math.random(),
            type: 'skill',
            text: `${player.name}使用了天赋觉醒石，瞬间领悟了「${picked}」技能！`,
            week: newWeek,
          })
        }
      }
    }

    // 1. 自主领悟（含道具倍率 + 额外检测机会）
    const selfLearnRuns = extraSkillCheck ? 2 : 1   // 额外检测道具触发两次
    for (let run = 0; run < selfLearnRuns; run++) {
      SKILL_NAMES.forEach(skillName => {
        const chance = getSelfLearnChance(player, skillName)
        if (chance <= 0) return
        // ✅ 概率降低一半，再乘以道具加成
        if (Math.random() < chance * 0.5 * skillChanceMult) {
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
    }

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
        // ✅ 概率降低一半，再乘以道具加成：私教 0.15，团课 0.025
        const teachChance = (sessionType === 'private' ? 0.15 : 0.025) * skillChanceMult
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

    const participatingPlayers = updatedPlayers.filter(p => entry.playerIds.includes(p.id))

    // ── 按性别分组，男女独立跑签表 ──────────────────────
    const malePlayers   = participatingPlayers.filter(p => p.gender === 'male')
    const femalePlayers = participatingPlayers.filter(p => p.gender === 'female')
    // 有哪些性别分组就跑哪些（可能只有男、只有女、或男女都有）
    const genderGroups = []
    if (malePlayers.length > 0)   genderGroups.push({ gender: 'male',   players: malePlayers })
    if (femalePlayers.length > 0) genderGroups.push({ gender: 'female', players: femalePlayers })

    // ── 按性别分别拉取世界球员 ──────────────────────────
    // 使用一个 Map 缓存，避免同一性别重复请求
    const worldPlayersByGender = {}
    for (const { gender } of genderGroups) {
      if (worldPlayersByGender[gender]) continue
      let worldPlayers = []
      try {
        const url = `/api/worldplayers?level=${event.level}&gender=${gender}`
        const res = await fetch(url)
        if (!res.ok) {
          console.warn(`[weekEngine] worldplayers API 返回非200: ${res.status} ${res.statusText}`)
        } else {
          const data = await res.json()
          worldPlayers = data.players || []
          if (worldPlayers.length === 0) {
            console.warn(`[weekEngine] worldplayers 返回空数组，level=${event.level} gender=${gender}`)
          } else {
            console.log(`[weekEngine] worldplayers 获取成功(${gender}): ${worldPlayers.length} 人，前3: ${
              worldPlayers.slice(0, 3).map(p => `${p.name}(${p.tour})`).join(', ')
            }`)
          }
        }
      } catch (err) {
        console.warn('[weekEngine] 获取世界球员失败，使用虚拟对手:', err)
      }
      worldPlayersByGender[gender] = worldPlayers
    }

    // ── 各性别组独立模拟 ────────────────────────────────
    let allResults     = []
    let maleChampion   = null   // 男子冠军
    let femaleChampion = null   // 女子冠军
    let totalPrize     = 0
    let totalPrestige  = 0
    const resultSummaries = []

    for (const { gender, players: gPlayers } of genderGroups) {
      const worldPlayers = worldPlayersByGender[gender] || []

      // 道具：叠加竞技系列加成（临时字段，matchEngine 读取后不持久化）
      const boostedPlayers = gPlayers.map(p => {
        const combatItems = (p.activeItems || []).filter(ai =>
          ai.duration === 'event' || (typeof ai.duration === 'number' && ai.duration > 0)
        )
        let powerBonus    = 0
        let winProbBonus  = 0
        let extraPrestige = 0
        combatItems.forEach(ai => {
          const eff = ai.effect || {}
          if (eff.combatPower)  powerBonus   += eff.combatPower
          if (eff.winProbBonus) winProbBonus += eff.winProbBonus
          if (eff.prestige)     extraPrestige = eff.prestige
          if (eff.tacticsBonus) powerBonus   += eff.tacticsBonus * 0.3
        })
        if (powerBonus === 0 && winProbBonus === 0 && extraPrestige === 0) return p
        return { ...p, _itemPowerBonus: powerBonus, _itemWinProbBonus: winProbBonus, _itemExtraPrestige: extraPrestige }
      })

      const results = simulateTournament(boostedPlayers, event, worldPlayers)

      // 结算积分/奖金/经验
      results.forEach(result => {
        totalPrize    += result.prize
        totalPrestige += result.prestige || 0
        const player = updatedPlayers.find(p => p.id === result.playerId)
        if (player) {
          const newPoints = (player.points || 0) + result.points
          const { updatedAttrs, newPool } = applyMatchExp(player, result.expGained)
          const extraPrestige = (player._itemExtraPrestige || 0) *
            (result.matchResults?.filter(m => m.result === 'win').length || 0)
          totalPrestige += extraPrestige
          updatedPlayers = updatedPlayers.map(p =>
            p.id !== result.playerId ? p : {
              ...p, ...updatedAttrs, expPool: newPool,
              points: newPoints, inMatch: false, matchEventId: null,
            }
          )
        }
        resultSummaries.push(`${result.playerName} ${result.finalRoundLabel}`)
      })

      // 确定本性别组冠军：优先我方球员，否则用加权概率从世界球员中决出
      const ourChampion = results.find(r => r.finalRound === 'champion')
      let champion = ourChampion?.playerName || null
      if (!champion) {
        // 冠军只从符合本赛事排名范围的球员里选（和参赛对手池一致）
        const genderMap = { male: 'ATP', female: 'WTA' }
        const tour = genderMap[gender] || 'ATP'
        let championPool = worldPlayers.filter(wp =>
          wp.tour === tour || wp.tour === tour.toLowerCase()
        )
        if (championPool.length === 0) championPool = [...worldPlayers]
        // 按赛事级别过滤排名范围
        const r = wp => wp.ranking || 999
        if (event.level === 'slam')  championPool = championPool.filter(wp => r(wp) >= 1   && r(wp) <= 150)
        if (event.level === '1000')  championPool = championPool.filter(wp => r(wp) >= 1   && r(wp) <= 200)
        if (event.level === '500')   championPool = championPool.filter(wp => r(wp) >= 50  && r(wp) <= 350)
        if (event.level === '250')   championPool = championPool.filter(wp => r(wp) >= 100 && r(wp) <= 500)
        if (event.level === 'itf')   championPool = worldPlayers.filter(wp =>
          wp.tour === 'ITF_JUNIOR' || wp.tour === 'itf_junior'
        )
        if (championPool.length === 0) championPool = [...worldPlayers]
        champion = pickEventChampion(championPool)
      }

      if (gender === 'male')   maleChampion   = champion
      if (gender === 'female') femaleChampion = champion

      allResults = allResults.concat(results)

      // 改动4：把本赛事中发生的随机事件写入新闻
      results.forEach(result => {
        ;(result.specialEvents || []).forEach(evt => {
          const roundLabel = { r1:'首轮',r2:'第二轮',r3:'第三轮',qf:'四分之一决赛',sf:'半决赛' }[evt.round] || evt.round
          let evtText = ''
          if (evt.type === 'opp_retired')
            evtText = `【${event.name}】${result.playerName}的对手在${roundLabel}中途因伤退赛，${result.playerName}自动晋级！`
          else if (evt.type === 'opp_walkover')
            evtText = `【${event.name}】${result.playerName}的对手在${roundLabel}退赛，${result.playerName}获得轮空晋级。`
          else if (evt.type === 'player_injured')
            evtText = `【${event.name}】${result.playerName}在${roundLabel}赛中受伤，带伤坚持完成了比赛。`
          if (evtText) {
            matchNews.push({
              id: Date.now() + Math.random(),
              type: 'injury',
              text: evtText,
              week: newWeek,
            })
          }
        })
      })
    }

    if (totalPrize > 0) {
      matchTransactions.push({
        id: `tx_match_${event.id}_${newWeek}`,
        type: 'income', category: 'prize',
        label: `${event.name}奖金`, amount: totalPrize,
      })
    }

    // 构建历史战绩记录（男女冠军分别存储）
    const historyRecord = {
      id: `h_${event.id}_${state.gameState.year}_${newWeek}`,
      eventId:       event.id,
      eventName:     event.name,
      level:         event.level,
      levelLabel:    event.levelLabel,
      surface:       event.surface,
      year:          state.gameState.year,
      week:          newWeek,
      maleChampion,    // ✅ 男子冠军
      femaleChampion,  // ✅ 女子冠军
      // 兼容旧代码：champion 取两个中有值的那个（或男子优先）
      champion: maleChampion || femaleChampion || null,
      results: allResults.map(r => ({
        playerName:   r.playerName,
        round:        r.finalRoundLabel,
        prize:        r.prize,
        points:       r.points,
        matchResults: r.matchResults,
      })),
      totalPrize,
      totalPrestige,
      matchResults: allResults,
    }
    newHistoryRecords.push(historyRecord)

    // 新闻文本区分男女冠军
    const championText = [
      maleChampion   ? `男子冠军：${maleChampion}`   : null,
      femaleChampion ? `女子冠军：${femaleChampion}` : null,
    ].filter(Boolean).join('，')

    matchNews.push({
      id: Date.now() + Math.random(),
      type: 'event',
      text: `【${event.name}】结果出炉：${resultSummaries.join('，')}。${championText ? championText + '。' : ''}总奖金 ¥${totalPrize.toLocaleString()}。`,
      week: newWeek,
      matchResults: allResults,
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
  let extraFatigueRecovery = getServiceFatigueRecovery(facilities || [])

  // ── 道具：全场能量优化包 / 环境净化系统 → 服务设施恢复加成 ──
  ;(state.activeFacilityItems || []).forEach(item => {
    const eff = item.effect || {}
    if (eff.serviceRecoveryBonus && eff.serviceRecoveryBonus > 1) {
      extraFatigueRecovery = Math.round(extraFatigueRecovery * eff.serviceRecoveryBonus)
    }
  })

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

    // ── 道具效果：汇总本球员当前所有生效中的 activeItems ──
    const activeItems = player.activeItems || []
    let itemExpMult           = 1.0   // 经验倍率叠加
    let itemFatigueFlat       = 0     // 即时疲劳修正（负数=减疲劳）
    let itemFatigueRecovery   = 0     // 每天额外恢复加成
    let itemFatigueGainMult   = 1.0   // 疲劳增量倍率
    let itemHealAccel         = 1     // 伤病恢复加速倍率
    let itemHealInstant       = false // 是否立即消除轻伤
    let itemSkillChanceMult   = 1.0   // 技能领悟概率倍率
    let itemExtraSkillCheck   = false // 额外触发一次技能检测
    let itemLoyaltyDelta      = 0     // 忠诚度即时变化
    let itemAttrBonus         = null  // { amount, extraChance } 弱势属性强化
    let itemBalanceBoost      = false // 均衡发展：偏低属性额外+5%
    let itemTargetTrainType   = null  // 指定训练类型经验加成

    activeItems.forEach(ai => {
      const eff = ai.effect || {}
      // 即时效果（duration:0）已在 USE_ITEM 时记录，本周首次推进时执行一次
      // 持续效果（duration>0 或 'event'）每周都叠加
      const isInstant = ai.duration === 0

      if (eff.expMult)             itemExpMult           *= eff.expMult
      if (eff.seasonExpMult)       itemExpMult           *= eff.seasonExpMult
      if (eff.fatigueRecoveryPerDay) itemFatigueRecovery += eff.fatigueRecoveryPerDay
      if (eff.fatigueGainMult)     itemFatigueGainMult   *= eff.fatigueGainMult
      if (eff.skillChanceMult)     itemSkillChanceMult   *= eff.skillChanceMult
      if (eff.extraSkillCheck)     itemExtraSkillCheck    = true
      if (eff.balanceBoost)        itemBalanceBoost       = true
      if (eff.targetTrainType && eff.targetTrainType !== 'choose') itemTargetTrainType = eff.targetTrainType

      // 即时效果：只在道具使用当周（usedWeek === newWeek-1，即上周使用本周首次结算）生效一次
      // 用 usedWeek 比较：使用时 week=W，下一周推进时 newWeek=W+1，所以 usedWeek === newWeek-1
      const isFirstWeek = ai.usedWeek === newWeek - 1
      if (isFirstWeek || isInstant) {
        if (eff.fatigue)           itemFatigueFlat      += eff.fatigue
        if (eff.loyalty)           itemLoyaltyDelta     += eff.loyalty
        if (eff.attrBonus)         itemAttrBonus         = { amount: eff.attrBonus, extraChance: eff.attrBonusChance || 0 }
        if (eff.healAccel >= 100)  itemHealInstant       = true
        else if (eff.healAccel > 1) itemHealAccel        = Math.max(itemHealAccel, eff.healAccel)
        if (eff.instantSkill)      itemExtraSkillCheck   = true  // instantSkill 由 checkSkills 处理
      }
    })

    // ✅ 修复：传入 player.id，确保只统计该球员实际参与的课程时长
    // 同时叠加道具的每天额外恢复和疲劳增量倍率
    const totalExtraRecovery = extraFatigueRecovery + itemFatigueRecovery
    let newFatigue = simulateFatigueByDay(
      player.fatigue, player.age, fullSchedule, totalExtraRecovery, player.id,
      itemFatigueGainMult  // 新增第6个参数，疲劳增量倍率
    )
    // 叠加即时疲劳修正（如恢复针 -40）
    if (itemFatigueFlat !== 0) {
      newFatigue = Math.min(100, Math.max(0, newFatigue + itemFatigueFlat))
    }

    // ✅ 传入随机事件经验加成 + 道具经验加成，两者叠乘
    const eventExpBonus = player._eventExpBonus || 1.0
    const totalExpMult  = eventExpBonus * itemExpMult
    const { techExp: rawTech, physExp: rawPhys, mentalExp: rawMental } =
      calcPlayerExp(player.id, fullSchedule, coaches, facilityMults, totalExpMult)

    // 均衡发展道具：让偏低方向额外+5%
    let techExp = rawTech, physExp = rawPhys, mentalExp = rawMental
    if (itemBalanceBoost) {
      const avgAttr = (
        (player.serve + player.forehand + player.backhand + player.footwork) / 4 +
        (player.strength + player.stamina + player.agility) / 3 +
        (player.pressure + player.willpower + player.focus) / 3
      ) / 3
      const techAvg   = (player.serve + player.forehand + player.backhand + player.footwork) / 4
      const physAvg   = (player.strength + player.stamina + player.agility) / 3
      const mentalAvg = (player.pressure + player.willpower + player.focus) / 3
      if (techAvg   < avgAttr) techExp   *= 1.05
      if (physAvg   < avgAttr) physExp   *= 1.05
      if (mentalAvg < avgAttr) mentalExp *= 1.05
    }
    // 专项训练手册：指定方向额外×1.2（在 itemExpMult 基础上再乘）
    if (itemTargetTrainType === 'tech')   techExp   *= 1.2
    if (itemTargetTrainType === 'phys')   physExp   *= 1.2
    if (itemTargetTrainType === 'mental') mentalExp *= 1.2

    const { updatedAttrs, newPool } = applyExpToPool(player, techExp, physExp, mentalExp)

    // 改动6：收集本周属性成长（有提升的属性）供新闻通知
    const attrGrowths = Object.entries(updatedAttrs)
      .filter(([k, v]) => typeof v === 'number' && v > (player[k] || 0))
      .map(([k, v]) => ({ attr: k, from: player[k] || 0, to: v }))
    if (attrGrowths.length > 0) {
      player._attrGrowthsThisWeek = attrGrowths
    }

    // 弱势属性强化胶囊：立即永久+N（触发一次）
    if (itemAttrBonus) {
      const allAttrs = [...TECH_ATTRS, ...PHYS_ATTRS, ...MENTAL_ATTRS]
      // 找到球员最弱的属性
      const weakest = allAttrs.reduce((w, a) => (player[a] || 0) < (player[w] || 0) ? a : w, allAttrs[0])
      const bonus = itemAttrBonus.amount + (Math.random() < itemAttrBonus.extraChance ? 5 : 0)
      updatedAttrs[weakest] = Math.min(99, (updatedAttrs[weakest] ?? player[weakest] ?? 0) + bonus)
    }

    let newHealth = player.health
    // 道具立即消除轻伤
    if (itemHealInstant && newHealth === 'minor') newHealth = 'healthy'
    // 伤病自然恢复（加速倍率）
    if (newHealth === 'minor' && Math.random() < 0.4 * itemHealAccel) newHealth = 'healthy'
    if (newHealth === 'healthy' && newFatigue >= 85) {
      const injuryChance = calcInjuryChance(player)
      if (Math.random() < injuryChance) newHealth = 'minor'
    }

    // 忠诚度即时变化（来自道具）
    const newLoyalty = itemLoyaltyDelta !== 0
      ? Math.min(100, Math.max(0, (player.loyalty || 50) + itemLoyaltyDelta))
      : player.loyalty

    // 清除临时标记，避免下周继续生效
    const cleanAttrs = { ...updatedAttrs }
    delete cleanAttrs._eventExpBonus

    // 清除已过期的道具效果
    const cleanActiveItems = activeItems.filter(item => {
      if (item.duration === 'event') return player.inMatch === true
      if (typeof item.duration === 'number' && item.duration > 0) {
        return (newWeek - item.usedWeek) < item.duration
      }
      return false  // duration: 0 的即时效果用完即清
    })

    // 把需要额外技能检测的标记写回球员（供步骤5读取）
    const extraSkillFlag = (itemExtraSkillCheck || activeItems.some(ai => ai.effect?.instantSkill))
      ? { _extraSkillCheck: true } : {}

    return {
      ...player, ...cleanAttrs,
      expPool:     newPool,
      fatigue:     newFatigue,
      health:      newHealth,
      loyalty:     newLoyalty,
      activeItems: cleanActiveItems,
      _eventExpBonus: undefined,
      ...extraSkillFlag,
    }
  })

  // 5. 技能检测（自主领悟 + 教练传授）
  const { skillNews, playerUpdates } = checkSkills(updatedPlayers, coaches, fullSchedule, newWeek)
  const updatedPlayersWithSkills = updatedPlayers.map(p =>
    playerUpdates[p.id] ? { ...p, skills: playerUpdates[p.id].skills } : p
  )

  // 改动6：收集本周属性成长新闻（每个球员有提升就汇报）
  const ATTR_LABEL = {
    serve: '发球', forehand: '正手', backhand: '反手', returnServe: '接发球',
    volley: '截击', footwork: '脚步', strength: '力量', stamina: '体力',
    agility: '灵活性', pressure: '抗压', willpower: '意志力', focus: '专注力',
  }
  const attrGrowthNews = []
  updatedPlayers.forEach(player => {
    const growths = player._attrGrowthsThisWeek
    if (!growths || growths.length === 0) return
    const desc = growths.map(g => `${ATTR_LABEL[g.attr] || g.attr} ${g.from}→${g.to}`).join('、')
    attrGrowthNews.push({
      id:   `growth_${player.id}_${newWeek}`,
      type: 'growth',
      text: `${player.name} 本周属性提升：${desc}`,
      week: newWeek,
      playerId: player.id,
    })
  })

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
  let updatedCoaches = []
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
  const { totalMaintenance: rawMaintenance, maintenanceDetails } = calcFacilityMaintenance(facilities || [])

  // ── 道具：设施系列道具对维护费的折扣 ──────────────────
  let maintenanceMult = 1.0
  let operationCostMult = 1.0
  ;(state.activeFacilityItems || []).forEach(item => {
    const eff = item.effect || {}
    if (eff.maintenanceMult) {
      // 按 scope 决定折扣力度：'all' 全额折扣，'court'/'gym' 折扣一半（只影响部分）
      const scope = eff.maintenanceScope || 'all'
      if (scope === 'all') {
        maintenanceMult *= eff.maintenanceMult
      } else {
        // court/gym/service 范围：按比例估算约占总维护费 50%，折扣打在该部分
        const partialDiscount = 1 - (1 - eff.maintenanceMult) * 0.5
        maintenanceMult *= partialDiscount
      }
    }
    if (eff.operationCostMult) operationCostMult *= eff.operationCostMult
  })
  const totalMaintenance = Math.round(rawMaintenance * maintenanceMult * operationCostMult)

  const weekIncome  = rentalInfo.income + privateIncome + groupIncome + prizeIncome
  const weekExpense = coachSalary + insurance + subsidy + totalMaintenance  // ✅ 加入维护费
  let newCash       = finance.cash + weekIncome - weekExpense

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
  let newRecentNews = [...matchNews, ...skillNews, ...attrGrowthNews, ...contractNews, ...(state.recentNews || [])].slice(0, 20)
  let finalPlayers  = playersAfterLoyalty

  let eventPrestigeDelta = 0
  let lastEvent = null  // ✅ 本周触发的随机事件，单独存储供 WeekSummary 专门展示
  // ✅ 随机事件：外层概率门槛 25%，约每3-4周触发一次
  try { if (Math.random() < 0.25 && typeof pickRandomEvent === 'function') {
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

      // 追加新闻（保留进 recentNews 作为历史记录）
      newRecentNews = [
        { id: Date.now(), type: evt.category, text: newsText, week: newWeek },
        ...newRecentNews,
      ].slice(0, 15)

      // ✅ 单独记录本周随机事件，供 WeekSummary 专门展示（不受8条限制影响）
      lastEvent = { type: evt.category, text: newsText, week: newWeek, effect: evt.effect }

      // 记录声望变动（用独立变量，避免修改 const gameState）
      eventPrestigeDelta = applied.prestigeDelta || 0
    }
  } } catch(e) { console.warn('[TCM] 随机事件处理失败（不影响游戏）:', e) }

  // ✅ 周汇总只计算常规收支（不含设施升级/建造等即时消费，那些已通过 DEDUCT_CASH 单独扣除）
  const regularTx    = newTx.filter(t => t.category !== 'facility')
  const totalIncome  = regularTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = regularTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  // ── 研发系统：每周推进 ──────────────────────────────
  const currentResearch = state.research || {
    points: 0, pointsPerWeek: 3, activeProjects: [], completedItems: [],
  }

  // ── 研发点数：按俱乐部实力多维度计算 ──────────────────
  // 基础
  let earnedPoints = 10

  // 教练贡献（按级别）
  const COACH_RESEARCH_POINTS = { assistant: 0, normal: 5, senior: 12, elite: 20 }
  ;(state.coaches || []).forEach(c => {
    earnedPoints += COACH_RESEARCH_POINTS[c.level] || 0
  })

  // 设施贡献（按等级，糟糕等级不贡献）
  const FACILITY_RESEARCH_POINTS = { 普通: 3, 高级: 8, 顶级: 15 }
  ;(state.facilities || []).forEach(f => {
    if (f.type === 'empty' || !f.level) return
    earnedPoints += FACILITY_RESEARCH_POINTS[f.level] || 0
  })

  // 声望：每满1000额外+5点
  earnedPoints += Math.floor((gameState?.prestige || 0) / 1000) * 5

  // 比赛胜利：本周每场胜利+8点（从 newHistoryRecords 里统计）
  const weekWins = newHistoryRecords.reduce((total, record) => {
    return total + (record.matchResults || []).reduce((t, r) => {
      return t + (r.matchResults || []).filter(m => m.result === 'win').length
    }, 0)
  }, 0)
  earnedPoints += weekWins * 8

  // 点数上限 2000
  const newPoints = Math.min(2000, (currentResearch.points || 0) + earnedPoints)

  // 推进所有进行中项目，判断是否完成
  const researchNews   = []
  let newActiveProjects = []
  let newCompletedItems = [...(currentResearch.completedItems || [])]

  for (const proj of (currentResearch.activeProjects || [])) {
    const newProgress = (proj.progressWeeks || 0) + 1
    if (newProgress >= proj.requiredWeeks) {
      // 研发完成，加入已完成列表（避免重复）
      if (!newCompletedItems.includes(proj.itemId)) {
        newCompletedItems.push(proj.itemId)
      }
      researchNews.push({
        id:   Date.now() + Math.random(),
        type: 'research',
        text: `🔬 研发完成！新道具已解锁，可在装备店购买。`,
        week: newWeek,
      })
    } else {
      newActiveProjects.push({ ...proj, progressWeeks: newProgress })
    }
  }

  const updatedResearch = {
    ...currentResearch,
    points:         newPoints,
    activeProjects: newActiveProjects,
    completedItems: newCompletedItems,
  }

  // 把研发新闻合并进本周动态
  newRecentNews = [...researchNews, ...newRecentNews].slice(0, 15)

  // ── 设施道具过期清理 ──────────────────────────────
  const updatedFacilityItems = (state.activeFacilityItems || []).filter(item => {
    if (item.duration === 'event') return true  // 赛事道具由比赛系统管理
    if (typeof item.duration === 'number' && item.duration > 0) {
      return (newWeek - item.usedWeek) < item.duration
    }
    return false  // duration: 0 的即时道具不保留
  })

  // 每周刷新招募市场（async：需获取数据库积分边界 + 可能拉取真实球员）
  const prestige = gameState?.prestige || 0
  const newRecruitPlayers = await generateRecruitPlayers(newWeek, prestige)
  const newRecruitCoaches = generateRecruitCoaches(newWeek)

  // ✅ 新增：将本周新战绩追加到 eventHistory，并保留历史（最多保留100条）
  const existingHistory = state.eventHistory || []
  const updatedEventHistory = [...newHistoryRecords, ...existingHistory].slice(0, 100)

  // 清除球员身上的临时标记（不持久化到存档）
  const cleanedFinalPlayers = finalPlayers.map(p => {
    if (!p._attrGrowthsThisWeek) return p
    const { _attrGrowthsThisWeek, ...rest } = p
    return rest
  })

  // ✅ Bug1最终修复：把本周产生的设施消费记录（_week === 当前周）带入新周
  // 下一周推进时，weekEngine 重建 newTx 不含 facility，所以它们自然消失
  // 这样：升级当周可见 → 下一周自动消失，无需任何过滤
  const thisWeekFacilityTx = (state.transactions || []).filter(
    t => t.category === 'facility' && (t._week === undefined || t._week === gameState.week)
  )
  const finalTx = [...newTx, ...thisWeekFacilityTx]

  return {
    ...state,
    gameState: {
      ...gameState,
      week: newWeek, year: newYear, cash: newCash,
      prestige: Math.max(0, (gameState.prestige || 0) + eventPrestigeDelta),
      prestigeChange: Math.floor(Math.random() * 10 - 3),
    },
    clubStats: { ...state.clubStats, coachCount: updatedCoaches.length },
    players:  cleanedFinalPlayers,
    coaches:  updatedCoaches,
    finance: {
      ...finance, cash: newCash,
      weekIncome: totalIncome, weekExpense: totalExpense, weekNet: totalIncome - totalExpense,
    },
    transactions:    finalTx,
    // ✅ 追加本周走势数据（最多保留26周）
    weeklyTrend: [
      ...(state.weeklyTrend || []),
      { week: `第${newWeek}周`, income: totalIncome, expense: totalExpense },
    ].slice(-26),
    recentNews:      newRecentNews,
    lastEvent:       lastEvent,       // ✅ 本周随机事件，null 表示本周无事件
    recruitPlayers:  newRecruitPlayers,
    recruitCoaches:  newRecruitCoaches,
    // ✅ 新增：持久化 eventHistory（不再丢失战绩）
    eventHistory:    updatedEventHistory,
    // ── 装备系统 ──
    research:            updatedResearch,
    activeFacilityItems: updatedFacilityItems,
  }
}
