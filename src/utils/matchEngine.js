// ══════════════════════════════════════════════════════
// 比赛模拟引擎
// 负责：生成签表、模拟单场胜负、结算积分/奖金/经验
// ══════════════════════════════════════════════════════

import { calcSkillWinBonus } from '../data/skillDefs'
// ✅ 问题4修复：从独立常量文件导入，不再从 weekEngine 导入，消除循环依赖
import { MATCH_EXP, MATCH_ATTR_DIST } from '../data/gameConstants'

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

  let power = techAvg * 0.5 + physAvg * 0.3 + mentalAvg * 0.2
  power -= (player.fatigue || 0) / 10

  const skillBonus = calcSkillWinBonus(player)
  power *= (1 + skillBonus)

  if (player.health === 'minor') power *= 0.9
  if (player.health === 'major') power *= 0.7

  return Math.max(1, power)
}

// ── 计算对手战力（根据排名推算）────────────────────────
function calcOpponentPower(opponent, maxRanking = 500) {
  const ranking = opponent.ranking || maxRanking
  const base = 85 - (ranking / maxRanking) * 35
  return Math.max(10, base)
}

// ── 单场比赛模拟 ─────────────────────────────────────
function simulateMatch(player, opponent, maxRanking) {
  const myPower  = calcPlayerPower(player)
  const oppPower = calcOpponentPower(opponent, maxRanking)

  let winProb = myPower / (myPower + oppPower)
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

// ── 生成对手池 ───────────────────────────────────────
function buildOpponentPool(event, worldPlayers, playerGender) {
  const genderMap = { male: 'ATP', female: 'WTA' }
  const tour = genderMap[playerGender] || 'ATP'

  let pool = worldPlayers.filter(wp => wp.tour === tour || wp.tour === 'ITF_JUNIOR')

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
function simulatePlayerTournament(player, event, opponents) {
  const levelKey = event.level
  const pointsTable = POINTS_TABLE[levelKey] || POINTS_TABLE['250']
  const prizeTable  = PRIZE_TABLE[levelKey]  || PRIZE_TABLE['250']
  const maxRanking  = event.level === 'itf' ? 400 : (event.level === 'slam' ? 150 : 500)

  // drawSize 由外层按赛事级别传入，直接用对手数推算
  const drawSize = opponents.length + 1
  const rounds = getRounds(drawSize)

  let eliminated = false
  const matchResults = []

  for (let i = 0; i < rounds.length; i++) {
    const roundKey = rounds[i]

    if (roundKey === 'champion') {
      matchResults.push({ round: roundKey, result: 'champion', opponent: null })
      break
    }

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
      break
    }
  }

  let finalRound = 'r1'
  if (!eliminated) {
    finalRound = 'champion'
  } else {
    const lastMatch = matchResults[matchResults.length - 1]
    finalRound = lastMatch.round
  }

  if (eliminated && matchResults.length > 0) {
    const lastRound = matchResults[matchResults.length - 1].round
    if (lastRound === 'runner_up') finalRound = 'runner_up'
  }

  const points = pointsTable[finalRound] || 0
  const prize  = prizeTable[finalRound]  || 0

  const matchCount = matchResults.filter(m => m.result === 'win').length +
                     (eliminated ? 1 : 0)
  const expGained = matchCount * MATCH_EXP

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

// ── 赛事级别对应签位数 ───────────────────────────────
// slam: 128签(7轮，r1起), 500/1000: 64签(7轮，r1起)
// 250/itf: 32签(6轮，r2起)
const DRAW_SIZE_BY_LEVEL = {
  slam: 128, '1000': 64, '500': 64, '250': 32, itf: 32,
}

// ── 主函数：模拟一场赛事所有我方参赛球员 ──────────────
export function simulateTournament(players, event, worldPlayers) {
  return players.map(player => {
    const pool = buildOpponentPool(event, worldPlayers, player.gender)

    const drawSize   = DRAW_SIZE_BY_LEVEL[event.level] || 32
    const rounds     = getRounds(drawSize)
    const neededOpps = rounds.length - 1

    if (pool.length === 0) {
      const fallbackOpponents = Array(neededOpps).fill(null).map((_, i) => ({
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

    const opponents = pickOpponents(pool, neededOpps)

    return {
      playerId:   player.id,
      playerName: player.name,
      ...simulatePlayerTournament(player, event, opponents),
    }
  })
}

// ── 根据比赛经验更新球员经验池 ───────────────────────
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

  const newPool = { ...(player.expPool || {}) }
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
