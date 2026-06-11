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

  // ── 道具：竞技系列战力加成（_itemPowerBonus 由 weekEngine 临时写入）──
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
    // 每盘胜率略有波动（模拟状态起伏）
    const setWinProb = Math.min(0.92, Math.max(0.08, winProb + (Math.random() * 0.2 - 0.1)))
    const playerWinsSet = Math.random() < setWinProb

    // 生成比分
    let pg, og  // player games, opponent games
    if (playerWinsSet) {
      // 赢的一方得分模式
      const patterns = [[6,0],[6,1],[6,2],[6,3],[6,4],[7,5],[7,6]]
      // 胜率越高越容易赢得漂亮
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
    // 分析胜利方式
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

// ── 单场比赛模拟 ─────────────────────────────────────
function simulateMatch(player, opponent, maxRanking, isFiveSet = false) {
  const myPower  = calcPlayerPower(player)
  const oppPower = calcOpponentPower(opponent, maxRanking)

  let winProb = myPower / (myPower + oppPower)
  const randomFactor = 1 + (Math.random() * 0.30 - 0.15)
  winProb = Math.min(0.95, Math.max(0.05, winProb * randomFactor))

  // ── 道具：竞技系列胜率加成（_itemWinProbBonus 由 weekEngine 临时写入）──
  if (player._itemWinProbBonus) {
    winProb = Math.min(0.95, winProb + player._itemWinProbBonus)
  }

  const score = simulateScore(winProb, isFiveSet)
  const win   = score.playerWon

  return {
    winner:   win ? 'player' : 'opponent',
    winProb:  Math.round(winProb * 100),
    myPower:  Math.round(myPower * 10) / 10,
    oppPower: Math.round(oppPower * 10) / 10,
    score,
  }
}

// ── 生成对手池 ───────────────────────────────────────
function buildOpponentPool(event, worldPlayers, playerGender) {
  if (!worldPlayers || worldPlayers.length === 0) return []

  const genderMap = { male: 'ATP', female: 'WTA' }
  const tour = genderMap[playerGender] || 'ATP'

  // ITF 赛事单独处理
  if (event.level === 'itf') {
    const itfPool = worldPlayers.filter(wp =>
      wp.tour === 'ITF_JUNIOR' || wp.tour === 'itf_junior'
    )
    return itfPool.length > 0 ? itfPool : worldPlayers.slice(0, 100)
  }

  // 先按 tour 精确过滤
  let pool = worldPlayers.filter(wp =>
    wp.tour === tour || wp.tour === tour.toLowerCase()
  )

  // tour 过滤失败时兜底：直接用全部 worldPlayers（数据库返回的已经按 level 限制了排名）
  if (pool.length === 0) {
    console.warn(`[matchEngine] tour 过滤后为空（tour=${tour}），使用全部 worldPlayers 兜底`)
    pool = [...worldPlayers]
  }

  // 按赛事级别限制排名范围
  if (event.level === 'slam')  pool = pool.filter(wp => (wp.ranking || 999) <= 150)
  if (event.level === '1000')  pool = pool.filter(wp => (wp.ranking || 999) <= 300)
  // 500/250 已经在 API 层限制了 rankingLimit=500，这里不再重复过滤

  // 如果过滤后还是空，再次兜底用全部
  if (pool.length === 0) pool = [...worldPlayers]

  return pool
}

// ── 随机抽取不重复对手 ───────────────────────────────
function pickOpponents(pool, count) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// ── 单名球员完整赛事模拟 ─────────────────────────────
// drawSize 由外层直接传入，确保轮次结构正确
function simulatePlayerTournament(player, event, opponents, drawSize) {
  const levelKey = event.level
  const pointsTable = POINTS_TABLE[levelKey] || POINTS_TABLE['250']
  const prizeTable  = PRIZE_TABLE[levelKey]  || PRIZE_TABLE['250']
  const maxRanking  = event.level === 'itf' ? 400 : (event.level === 'slam' ? 150 : 500)

  const rounds = getRounds(drawSize)

  let eliminated = false
  const matchResults = []

  for (let i = 0; i < rounds.length; i++) {
    const roundKey = rounds[i]

    if (roundKey === 'champion') {
      matchResults.push({ round: roundKey, result: 'champion', opponent: null })
      break
    }

    const opponent   = opponents[i] || opponents[opponents.length - 1]
    // 大满贯决赛用5盘3胜
    const isFiveSet  = event.level === 'slam' && roundKey === 'sf'
    const result     = simulateMatch(player, opponent, maxRanking, isFiveSet)
    const narrative  = generateMatchNarrative(player.name, opponent.name, result.score, result.winProb / 100)

    matchResults.push({
      round:       roundKey,
      roundLabel:  ROUND_LABELS[roundKey],
      result:      result.winner === 'player' ? 'win' : 'lose',
      opponent:    { name: opponent.name, ranking: opponent.ranking, nationality: opponent.nationality },
      winProb:     result.winProb,
      myPower:     result.myPower,
      oppPower:    result.oppPower,
      score:       result.score,      // { playerSets, oppSets }
      narrative,                      // 描述文字
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
const DRAW_SIZE_BY_LEVEL = {
  slam: 128, '1000': 64, '500': 64, '250': 32, itf: 32,
}

// ── 主函数：模拟一场赛事所有我方参赛球员 ──────────────
export function simulateTournament(players, event, worldPlayers) {
  return players.map(player => {
    const pool = buildOpponentPool(event, worldPlayers, player.gender)

    const drawSize = DRAW_SIZE_BY_LEVEL[event.level] || 32
    const rounds   = getRounds(drawSize)
    // runner_up 和 champion 都不需要真实对手，只统计需要实际对打的轮次
    const neededOpps = rounds.filter(r => r !== 'runner_up' && r !== 'champion').length

    if (pool.length === 0) {
      // API 完全失败时的最终兜底，用随机风格名字替代"对手N"
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

    const opponents = pickOpponents(pool, neededOpps)

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
