// ══════════════════════════════════════════════════════
// 比赛模拟引擎
// 负责：生成签表、模拟单场胜负、结算积分/奖金/经验
// ══════════════════════════════════════════════════════

import { calcSkillWinBonus } from '../data/skillDefs'

// ── 积分表（真实ATP/WTA规则）─────────────────────────
const POINTS_TABLE = {
  slam:  { champion: 2000, runner_up: 1200, sf: 720, qf: 360, r3: 180, r2: 90,  r1: 45  },
  1000:  { champion: 1000, runner_up: 600,  sf: 360, qf: 180, r3: 90,  r2: 45,  r1: 10  },
  500:   { champion: 500,  runner_up: 300,  sf: 180, qf: 90,  r3: 45,  r2: 20,  r1: 0   },
  250:   { champion: 250,  runner_up: 150,  sf: 90,  qf: 45,  r3: 20,  r2: 10,  r1: 0   },
  itf:   { champion: 200,  runner_up: 120,  sf: 72,  qf: 36,  r3: 0,   r2: 12,  r1: 6   },
}

// ── 奖金表（游戏内金额，ITF无奖金）──────────────────
const PRIZE_TABLE = {
  slam:  { champion: 1000000, runner_up: 500000, sf: 250000, qf: 125000, r3: 60000, r2: 30000, r1: 15000 },
  1000:  { champion: 500000,  runner_up: 250000, sf: 125000, qf: 60000,  r3: 30000, r2: 15000, r1: 7500  },
  500:   { champion: 250000,  runner_up: 125000, sf: 60000,  qf: 30000,  r3: 15000, r2: 7500,  r1: 4000  },
  250:   { champion: 125000,  runner_up: 60000,  sf: 30000,  qf: 15000,  r3: 7500,  r2: 4000,  r1: 0     },
  itf:   { champion: 0, runner_up: 0, sf: 0, qf: 0, r3: 0, r2: 0, r1: 0 },
}

// ── 轮次名称映射 ─────────────────────────────────────
const ROUND_LABELS = {
  r1: '首轮', r2: '第二轮', r3: '第三轮',
  qf: '四分之一决赛', sf: '半决赛', runner_up: '亚军', champion: '冠军',
}

// ── 根据参赛人数推算轮次结构 ─────────────────────────
// 返回按顺序的轮次 key 数组，从首轮到决赛
function getRounds(drawSize) {
  if (drawSize <= 4)  return ['sf', 'runner_up', 'champion']
  if (drawSize <= 8)  return ['qf', 'sf', 'runner_up', 'champion']
  if (drawSize <= 16) return ['r3', 'qf', 'sf', 'runner_up', 'champion']
  if (drawSize <= 32) return ['r2', 'r3', 'qf', 'sf', 'runner_up', 'champion']
  return ['r1', 'r2', 'r3', 'qf', 'sf', 'runner_up', 'champion']
}

// ── 计算我方球员综合战力 ─────────────────────────────
function calcPlayerPower(player) {
  const techAvg   = (player.serve + player.forehand + player.backhand +
                     player.returnServe + player.volley + player.footwork) / 6
  const physAvg   = (player.strength + player.stamina + player.agility) / 3
  const mentalAvg = (player.pressure + player.willpower + player.focus) / 3

  // 基础战力
  let power = techAvg * 0.5 + physAvg * 0.3 + mentalAvg * 0.2

  // 疲劳惩罚
  power -= (player.fatigue || 0) / 10

  // 技能加成（每个技能对应胜率，转换为战力加成）
  const skillBonus = calcSkillWinBonus(player)  // 0.03 ~ 0.21
  power *= (1 + skillBonus)

  // 伤病惩罚
  if (player.health === 'minor') power *= 0.9
  if (player.health === 'major') power *= 0.7

  return Math.max(1, power)
}

// ── 计算对手战力（根据排名推算）────────────────────────
// 排名1 → 战力约85，排名500 → 战力约50，排名1400 → 约35
function calcOpponentPower(opponent, maxRanking = 500) {
  const ranking = opponent.ranking || maxRanking
  const base = 85 - (ranking / maxRanking) * 35
  return Math.max(10, base)
}

// ── 单场比赛模拟 ─────────────────────────────────────
// 返回 { winner: 'player'|'opponent', winProb, myPower, oppPower }
function simulateMatch(player, opponent, maxRanking) {
  const myPower  = calcPlayerPower(player)
  const oppPower = calcOpponentPower(opponent, maxRanking)

  // 基础胜率
  let winProb = myPower / (myPower + oppPower)

  // 随机波动 ±15%（模拟发挥好/差）
  const randomFactor = 1 + (Math.random() * 0.30 - 0.15)
  winProb = Math.min(0.95, Math.max(0.05, winProb * randomFactor))

  const win = Math.random() < winProb

  return {
    winner:  win ? 'player' : 'opponent',
    winProb: Math.round(winProb * 100),
    myPower:  Math.round(myPower * 10) / 10,
    oppPower: Math.round(oppPower * 10) / 10,
  }
}

// ── 生成对手池（从 worldPlayers 中按赛事规则筛选）──────
function buildOpponentPool(event, worldPlayers, playerGender) {
  const genderMap = { male: 'ATP', female: 'WTA' }
  const tour = genderMap[playerGender] || 'ATP'

  let pool = worldPlayers.filter(wp => wp.tour === tour || wp.tour === 'ITF_JUNIOR')

  // 按赛事级别筛选排名范围
  if (event.level === 'slam')  pool = pool.filter(wp => wp.ranking <= 150)
  if (event.level === '1000')  pool = pool.filter(wp => wp.ranking <= 300)
  if (event.level === '500')   pool = pool.filter(wp => wp.ranking <= 500)
  if (event.level === '250')   pool = pool.filter(wp => wp.ranking <= 500)
  if (event.level === 'itf')   pool = worldPlayers.filter(wp => wp.tour === 'ITF_JUNIOR')

  return pool
}

// ── 随机抽取不重复对手 ───────────────────────────────
function pickOpponents(pool, count) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// ── 单名球员完整赛事模拟 ─────────────────────────────
// 模拟从首轮打到淘汰或夺冠
// 返回 { finalRound, matchResults, points, prize, expGained }
function simulatePlayerTournament(player, event, opponents) {
  const levelKey = event.level
  const pointsTable = POINTS_TABLE[levelKey] || POINTS_TABLE['250']
  const prizeTable  = PRIZE_TABLE[levelKey]  || PRIZE_TABLE['250']
  const maxRanking  = event.level === 'itf' ? 400 : (event.level === 'slam' ? 150 : 500)

  // 根据对手数量决定轮次
  const drawSize = Math.min(opponents.length + 1, 32)
  const rounds = getRounds(drawSize)

  let currentRound = 0
  let eliminated = false
  const matchResults = []

  // 为每个轮次分配一个对手
  for (let i = 0; i < rounds.length - 1; i++) {
    // 最后两个 key 是 runner_up（决赛）和 champion（冠军）
    // 实际对战轮次 = rounds 除最后一个
  }

  // 逐轮模拟
  for (let i = 0; i < rounds.length; i++) {
    const roundKey = rounds[i]

    // champion 轮不需要再打，只是标记
    if (roundKey === 'champion') {
      matchResults.push({ round: roundKey, result: 'champion', opponent: null })
      break
    }

    // 从对手池取一个对手
    const opponent = opponents[i] || opponents[opponents.length - 1]
    const result   = simulateMatch(player, opponent, maxRanking)

    matchResults.push({
      round:       roundKey,
      roundLabel:  ROUND_LABELS[roundKey],
      result:      result.winner === 'player' ? 'win' : 'lose',
      opponent:    { name: opponent.name, ranking: opponent.ranking, nationality: opponent.nationality },
      winProb:     result.winProb,
      myPower:     result.myPower,
      oppPower:    result.oppPower,
    })

    if (result.winner !== 'player') {
      eliminated = true
      // 出局时记录最终轮次（第一轮出局 = r1，第二轮出局 = r2，以此类推）
      break
    }
  }

  // 确定最终成绩 key
  let finalRound = 'r1'
  if (!eliminated) {
    finalRound = 'champion'
  } else {
    const lastMatch = matchResults[matchResults.length - 1]
    finalRound = lastMatch.round
  }

  // 决赛负 = 亚军
  if (eliminated && matchResults.length > 0) {
    const lastRound = matchResults[matchResults.length - 1].round
    if (lastRound === 'runner_up') finalRound = 'runner_up'
  }

  const points = pointsTable[finalRound] || 0
  const prize  = prizeTable[finalRound]  || 0

  // 比赛经验（每场比赛50点，按技术20%/身体20%/精神60%分配）
  const matchCount = matchResults.filter(m => m.result === 'win').length +
                     (eliminated ? 1 : 0)  // 包含出局那场
  const expGained = matchCount * 50

  return {
    finalRound,
    finalRoundLabel: ROUND_LABELS[finalRound] || finalRound,
    matchResults,
    points,
    prize,
    expGained,
    eliminated,
  }
}

// ── 主函数：模拟一场赛事所有我方参赛球员 ──────────────
// players:     我方参赛球员数组
// event:       赛事对象 { id, name, level, ... }
// worldPlayers: 数据库世界球员数组（已按规则筛选）
// 返回数组：每个参赛球员的完整结果
export function simulateTournament(players, event, worldPlayers) {
  return players.map(player => {
    // 为该球员生成对手（按性别筛选）
    const pool = buildOpponentPool(event, worldPlayers, player.gender)

    if (pool.length === 0) {
      // 没有合适对手：默认给一个中等水平虚拟对手
      const fallbackOpponents = Array(7).fill(null).map((_, i) => ({
        id: `fallback_${i}`,
        name: `对手${i + 1}`,
        ranking: 200 + i * 30,
        nationality: '未知',
        tour: 'ATP',
      }))
      return {
        playerId:   player.id,
        playerName: player.name,
        ...simulatePlayerTournament(player, event, fallbackOpponents),
      }
    }

    // 随机抽取7个对手（足够打到决赛）
    const opponents = pickOpponents(pool, 7)

    return {
      playerId:   player.id,
      playerName: player.name,
      ...simulatePlayerTournament(player, event, opponents),
    }
  })
}

// ── 根据比赛经验更新球员经验池 ───────────────────────
// 每场比赛50经验：技术20%/身体20%/精神60%
import { MATCH_EXP, MATCH_ATTR_DIST } from './weekEngine'

const MATCH_TECH_ATTRS   = ['serve','forehand','backhand','returnServe','volley','footwork']
const MATCH_PHYS_ATTRS   = ['strength','stamina','agility']
const MATCH_MENTAL_ATTRS = ['pressure','willpower','focus']

function getMatchExpThreshold(val) {
  if (val < 50) return 200
  if (val < 70) return 400
  if (val < 90) return 700
  return 1000
}

export function applyMatchExp(player, expGained) {
  if (!expGained) return { updatedAttrs: {}, newPool: player.expPool || {} }

  const pool = { ...(player.expPool || {}) }
  const newPool = { ...pool }
  const updatedAttrs = {}

  const techExp   = expGained * MATCH_ATTR_DIST.tech
  const physExp   = expGained * MATCH_ATTR_DIST.phys
  const mentalExp = expGained * MATCH_ATTR_DIST.mental

  const applyToAttr = (exp, attrList) => {
    if (exp <= 0) return
    const attr = attrList[Math.floor(Math.random() * attrList.length)]
    newPool[attr] = (newPool[attr] || 0) + exp
    const cur = updatedAttrs[attr] ?? player[attr] ?? 0
    if (newPool[attr] >= getMatchExpThreshold(cur)) {
      newPool[attr] -= getMatchExpThreshold(cur)
      updatedAttrs[attr] = Math.min(99, cur + 1)
    }
  }

  applyToAttr(techExp,   MATCH_TECH_ATTRS)
  applyToAttr(physExp,   MATCH_PHYS_ATTRS)
  applyToAttr(mentalExp, MATCH_MENTAL_ATTRS)

  return { updatedAttrs, newPool }
}
