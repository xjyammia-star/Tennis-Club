// ══════════════════════════════════════════════════════
// 比赛模拟引擎 v2
// 负责：生成签表、模拟单场胜负、结算积分/奖金/经验
// ══════════════════════════════════════════════════════

import { calcSkillWinBonus } from '../data/skillDefs'
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

  if (player._itemPowerBonus) power += player._itemPowerBonus

  return Math.max(1, power)
}

// ── 计算对手战力（根据排名推算）────────────────────────
function calcOpponentPower(opponent, maxRanking = 500) {
  const ranking = opponent.ranking || maxRanking
  const base = 85 - (ranking / maxRanking) * 35
  return Math.max(10, base)
}

// ── 模拟比赛比分（3盘2胜或5盘3胜）────────────────────
function simulateScore(winProb, isFiveSet = false) {
  const setsToWin = isFiveSet ? 3 : 2
  const playerSets = []
  const oppSets    = []
  let playerSetWins = 0
  let oppSetWins    = 0

  while (playerSetWins < setsToWin && oppSetWins < setsToWin) {
    const setWinProb = Math.min(0.92, Math.max(0.08, winProb + (Math.random() * 0.2 - 0.1)))
    const playerWinsSet = Math.random() < setWinProb

    let pg, og
    if (playerWinsSet) {
      const patterns = [[6,0],[6,1],[6,2],[6,3],[6,4],[7,5],[7,6]]
      const idx = Math.floor(Math.random() * Math.max(1, patterns.length * (1 - setWinProb + 0.3)))
      const p = patterns[Math.min(idx, patterns.length - 1)]
      pg = p[0]; og = p[1]
      playerSetWins++
    } else {
      const patterns = [[0,6],[1,6],[2,6],[3,6],[4,6],[5,7],[6,7]]
      const idx = Math.floor(Math.random() * Math.max(1, patterns.length * setWinProb))
      const p = patterns[Math.min(idx, patterns.length - 1)]
      pg = p[0]; og = p[1]
      oppSetWins++
    }
    playerSets.push(pg)
    oppSets.push(og)
  }

  const playerWon = playerSetWins >= setsToWin
  return { playerSets, oppSets, playerSetWins, oppSetWins, playerWon }
}

// ── 根据比分生成描述文字 ──────────────────────────────
function generateMatchNarrative(playerName, opponentName, score, winProb) {
  const { playerSets, oppSets, playerWon } = score
  const scoreStr = playerSets.map((g, i) => `${g}-${oppSets[i]}`).join(', ')
  const totalSets = playerSets.length

  if (playerWon) {
    const lostSets = oppSets.filter((g, i) => g > playerSets[i]).length
    if (lostSets === 0) {
      return `${playerName}以 ${scoreStr} 横扫${opponentName}，全程占据主动。`
    } else if (lostSets >= 1 && playerSets[0] < oppSets[0]) {
      return `${playerName}先失一盘后奋起直追，以 ${scoreStr} 逆转${opponentName}。`
    } else if (totalSets === 3 || totalSets === 5) {
      return `${playerName}与${opponentName}苦战${totalSets}盘，最终以 ${scoreStr} 险胜。`
    } else {
      return `${playerName}以 ${scoreStr} 击败${opponentName}，晋级下一轮。`
    }
  } else {
    const lostSets = playerSets.filter((g, i) => g < oppSets[i]).length
    if (playerSets[0] > oppSets[0]) {
      return `${playerName}先赢一盘后体力下滑，以 ${scoreStr} 遗憾不敌${opponentName}。`
    } else if (lostSets === playerSets.length) {
      return `${playerName}以 ${scoreStr} 不敌${opponentName}，发挥欠佳。`
    } else {
      return `${playerName}与${opponentName}鏖战${totalSets}盘，最终以 ${scoreStr} 饮恨出局。`
    }
  }
}

// ── 改动3：胜率计算——增强强弱差异，减少以弱胜强概率 ──
// 原公式：winProb = myPower / (myPower + oppPower) * randomFactor（±15%）
// 新公式：对战力比做指数放大，差距越大胜率越悬殊
function calcWinProb(myPower, oppPower) {
  // 用战力比的1.8次方放大强弱差距
  // 战力比 1:1 → 50%；战力比 2:1 → ~77%；战力比 0.5:1 → ~23%
  const ratio = myPower / Math.max(oppPower, 1)
  const amplified = Math.pow(ratio, 1.8)
  let winProb = amplified / (amplified + 1)
  // 随机扰动缩小到 ±8%（原来±15%），减少翻盘概率
  winProb += (Math.random() * 0.16 - 0.08)
  return Math.min(0.93, Math.max(0.07, winProb))
}

// ── 单场比赛模拟 ─────────────────────────────────────
// 改动4：新增比赛中随机事件（伤退/退赛自动晋级）
function simulateMatch(player, opponent, maxRanking, isFiveSet = false) {
  const myPower  = calcPlayerPower(player)
  const oppPower = calcOpponentPower(opponent, maxRanking)

  let winProb = calcWinProb(myPower, oppPower)

  if (player._itemWinProbBonus) {
    winProb = Math.min(0.93, winProb + player._itemWinProbBonus)
  }

  // ── 改动4：随机事件 ──────────────────────────────
  // 3% 概率：对手伤退，我方自动晋级
  if (Math.random() < 0.03) {
    return {
      winner:    'player',
      winProb:   Math.round(winProb * 100),
      myPower:   Math.round(myPower * 10) / 10,
      oppPower:  Math.round(oppPower * 10) / 10,
      score:     { playerSets: [], oppSets: [], playerWon: true },
      specialEvent: 'opp_retired',  // 对手伤退
    }
  }
  // 2% 概率：对手临时退赛（非伤病），我方自动晋级
  if (Math.random() < 0.02) {
    return {
      winner:    'player',
      winProb:   Math.round(winProb * 100),
      myPower:   Math.round(myPower * 10) / 10,
      oppPower:  Math.round(oppPower * 10) / 10,
      score:     { playerSets: [], oppSets: [], playerWon: true },
      specialEvent: 'opp_walkover',  // 对手退赛
    }
  }
  // 1% 概率：我方球员比赛中轻伤，但继续坚持（对胜率有小幅影响）
  let playerInjuredMidMatch = false
  if (Math.random() < 0.01) {
    playerInjuredMidMatch = true
    winProb = Math.max(0.07, winProb - 0.15)
  }

  const score = simulateScore(winProb, isFiveSet)
  const win   = score.playerWon

  return {
    winner:   win ? 'player' : 'opponent',
    winProb:  Math.round(winProb * 100),
    myPower:  Math.round(myPower * 10) / 10,
    oppPower: Math.round(oppPower * 10) / 10,
    score,
    specialEvent: playerInjuredMidMatch ? 'player_injured' : null,
  }
}

// ── 改动1：对手池按赛事级别精确排名范围过滤 ──────────
// 改动5：ITF 完全随机抽取，不按排名加权
function buildOpponentPool(event, worldPlayers, playerGender) {
  if (!worldPlayers || worldPlayers.length === 0) return []

  const genderMap = { male: 'ATP', female: 'WTA' }
  const tour = genderMap[playerGender] || 'ATP'

  // 改动5：ITF 均等概率抽取（直接返回全部池，pickOpponents 里随机打乱）
  if (event.level === 'itf') {
    const itfPool = worldPlayers.filter(wp =>
      wp.tour === 'ITF_JUNIOR' || wp.tour === 'itf_junior'
    )
    return itfPool.length > 0 ? itfPool : worldPlayers.slice(0, 200)
  }

  // 改动1：按赛事级别精确过滤排名范围
  // 大满贯：排名 1-150；1000赛：排名 1-200；500赛：排名 50-350；250赛：排名 100-500
  let pool = worldPlayers.filter(wp =>
    wp.tour === tour || wp.tour === tour.toLowerCase()
  )

  if (pool.length === 0) {
    console.warn(`[matchEngine] tour 过滤后为空（tour=${tour}），使用全部 worldPlayers 兜底`)
    pool = [...worldPlayers]
  }

  const r = wp => wp.ranking || 999
  if (event.level === 'slam')  pool = pool.filter(wp => r(wp) >= 1   && r(wp) <= 150)
  if (event.level === '1000')  pool = pool.filter(wp => r(wp) >= 1   && r(wp) <= 200)
  if (event.level === '500')   pool = pool.filter(wp => r(wp) >= 50  && r(wp) <= 350)
  if (event.level === '250')   pool = pool.filter(wp => r(wp) >= 100 && r(wp) <= 500)

  if (pool.length === 0) pool = [...worldPlayers]

  return pool
}

// ── 改动1+2：抽取对手——slam/1000 按排名加权，500/250 均等 ──
// 改动2：冠军候选人按排名加权概率，但排名最高者概率上限 70%
function pickOpponents(pool, count, weighted = false) {
  if (!weighted || pool.length === 0) {
    // 均等概率：直接随机打乱
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }

  // 加权抽取：排名越高（数字越小）权重越大
  // 权重 = 1 / ranking^0.6，避免第1名权重过于悬殊
  const sorted = [...pool].sort((a, b) => (a.ranking || 999) - (b.ranking || 999))
  const weights = sorted.map(wp => 1 / Math.pow(wp.ranking || 999, 0.6))
  const totalWeight = weights.reduce((s, w) => s + w, 0)

  const selected = []
  const usedIdx  = new Set()

  for (let pick = 0; pick < Math.min(count, sorted.length); pick++) {
    let rand = Math.random() * totalWeight
    // 已选过的权重归零
    let cumulative = 0
    let chosen = -1
    for (let i = 0; i < sorted.length; i++) {
      if (usedIdx.has(i)) continue
      cumulative += weights[i]
      if (rand <= cumulative) { chosen = i; break }
    }
    if (chosen === -1) {
      // 兜底：找第一个未选的
      for (let i = 0; i < sorted.length; i++) {
        if (!usedIdx.has(i)) { chosen = i; break }
      }
    }
    if (chosen >= 0) { selected.push(sorted[chosen]); usedIdx.add(chosen) }
  }

  return selected
}

// ── 改动2：从世界球员中按加权概率决定赛事冠军 ──────────
// 排名越高概率越大，但最高概率不超过 70%
export function pickEventChampion(worldPlayers) {
  if (!worldPlayers || worldPlayers.length === 0) return null

  const sorted = [...worldPlayers].sort((a, b) => (a.ranking || 999) - (b.ranking || 999))

  // 按排名分配概率：第1名 ~35%，第2名 ~20%，以此类推（快速衰减）
  const weights = sorted.map((_, i) => 1 / Math.pow(i + 1, 1.4))
  const totalWeight = weights.reduce((s, w) => s + w, 0)

  // 确保第1名概率不超过 70%
  const maxProb = 0.70
  const normalizedWeights = weights.map(w => {
    const p = w / totalWeight
    return Math.min(p, maxProb)
  })
  const adjustedTotal = normalizedWeights.reduce((s, w) => s + w, 0)

  let rand = Math.random() * adjustedTotal
  let cumulative = 0
  for (let i = 0; i < sorted.length; i++) {
    cumulative += normalizedWeights[i]
    if (rand <= cumulative) return sorted[i].name
  }
  return sorted[0].name
}

// ── 单名球员完整赛事模拟 ─────────────────────────────
function simulatePlayerTournament(player, event, opponents, drawSize) {
  const levelKey    = event.level
  const pointsTable = POINTS_TABLE[levelKey] || POINTS_TABLE['250']
  const prizeTable  = PRIZE_TABLE[levelKey]  || PRIZE_TABLE['250']
  const maxRanking  = event.level === 'itf' ? 400 : (event.level === 'slam' ? 150 : 500)

  const rounds = getRounds(drawSize)

  let eliminated = false
  const matchResults = []
  const specialEvents = []  // 本场赛事中发生的随机事件

  for (let i = 0; i < rounds.length; i++) {
    const roundKey = rounds[i]

    if (roundKey === 'champion') {
      matchResults.push({ round: roundKey, result: 'champion', opponent: null })
      break
    }

    const opponent  = opponents[i] || opponents[opponents.length - 1]
    const isFiveSet = event.level === 'slam' && roundKey === 'sf'
    const result    = simulateMatch(player, opponent, maxRanking, isFiveSet)

    // 处理随机事件叙述
    let narrative = ''
    if (result.specialEvent === 'opp_retired') {
      narrative = `${opponent.name}在比赛中途因伤退赛，${player.name}自动晋级。`
    } else if (result.specialEvent === 'opp_walkover') {
      narrative = `${opponent.name}因故退出本场比赛，${player.name}获得轮空晋级。`
    } else if (result.specialEvent === 'player_injured') {
      narrative = generateMatchNarrative(player.name, opponent.name, result.score, result.winProb / 100)
        + `（${player.name}赛中受伤，带伤坚持出赛）`
    } else {
      narrative = generateMatchNarrative(player.name, opponent.name, result.score, result.winProb / 100)
    }

    if (result.specialEvent) specialEvents.push({ round: roundKey, type: result.specialEvent })

    matchResults.push({
      round:        roundKey,
      roundLabel:   ROUND_LABELS[roundKey],
      result:       result.winner === 'player' ? 'win' : 'lose',
      opponent:     { name: opponent.name, ranking: opponent.ranking, nationality: opponent.nationality },
      winProb:      result.winProb,
      myPower:      result.myPower,
      oppPower:     result.oppPower,
      score:        result.score,
      narrative,
      specialEvent: result.specialEvent || null,
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
    finalRound = matchResults[matchResults.length - 1].round
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
    specialEvents,
    points,
    prize,
    expGained,
    eliminated,
  }
}

// ── 赛事级别对应签位数 ───────────────────────────────
const DRAW_SIZE_BY_LEVEL = {
  slam: 128, '1000': 64, '500': 64, '250': 32, itf: 32,
}

// ── 主函数：模拟一场赛事所有我方参赛球员 ──────────────
export function simulateTournament(players, event, worldPlayers) {
  // 改动1：slam/1000 加权抽取对手，500/250/itf 均等抽取
  const useWeighted = event.level === 'slam' || event.level === '1000'

  return players.map(player => {
    const pool = buildOpponentPool(event, worldPlayers, player.gender)

    const drawSize   = DRAW_SIZE_BY_LEVEL[event.level] || 32
    const rounds     = getRounds(drawSize)
    const neededOpps = rounds.filter(r => r !== 'runner_up' && r !== 'champion').length

    if (pool.length === 0) {
      const FALLBACK_NAMES = [
        'A.Garcia','B.Smith','C.Johnson','D.Martinez','E.Williams',
        'F.Brown','G.Davis','H.Wilson','I.Anderson','J.Taylor',
      ]
      const fallbackOpponents = Array(neededOpps).fill(null).map((_, i) => ({
        id:          `fallback_${i}`,
        name:        FALLBACK_NAMES[i % FALLBACK_NAMES.length],
        ranking:     150 + i * 20,
        nationality: '未知',
        tour:        'ATP',
      }))
      console.warn(`[matchEngine] pool 为空，使用 fallback 对手 (level=${event.level})`)
      return {
        playerId:   player.id,
        playerName: player.name,
        ...simulatePlayerTournament(player, event, fallbackOpponents, drawSize),
      }
    }

    const opponents = pickOpponents(pool, neededOpps, useWeighted)

    return {
      playerId:   player.id,
      playerName: player.name,
      ...simulatePlayerTournament(player, event, opponents, drawSize),
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
