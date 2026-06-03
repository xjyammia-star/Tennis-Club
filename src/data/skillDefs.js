// ══════════════════════════════════════════════════════
// 技能完整定义文件
// 每个技能包含：名称、胜率加成、教练传授要求、自主领悟要求
// ══════════════════════════════════════════════════════

export const SKILL_DEFS = {

  侧旋发球: {
    name: '侧旋发球',
    winRateBonus: 0.05,           // 比赛胜率加成 +5%
    coachRequire: {               // 教练传授：球员需满足以下属性
      serve:   50,
      talent:  70,
      focus:   70,
    },
    selfLearnMinTalent: 70,       // 自主领悟最低天赋要求
    selfLearnAttrs: {             // 自主领悟属性要求（同教练传授）
      serve:   50,
      focus:   70,
    },
    // 自主领悟概率公式：(40 - (100 - 天赋)) % = 天赋 - 60，最低1%
    learnChanceFormula: (talent) => Math.max(0.01, (talent - 60) / 100),
  },

  小球突袭: {
    name: '小球突袭',
    winRateBonus: 0.08,
    coachRequire: {
      forehand: 50,
      volley:   70,
      focus:    70,
      talent:   70,
      agility:  70,
      footwork: 70,
    },
    selfLearnMinTalent: 80,
    selfLearnAttrs: {
      forehand: 50,
      volley:   70,
      focus:    70,
      agility:  70,
      footwork: 70,
    },
    learnChanceFormula: (talent) => Math.max(0.01, (talent - 60) / 100),
  },

  上旋月亮: {
    name: '上旋月亮',
    winRateBonus: 0.08,
    coachRequire: {
      forehand:  40,
      pressure:  50,
      willpower: 50,
      talent:    50,
    },
    selfLearnMinTalent: 70,
    selfLearnAttrs: {
      forehand:  40,
      pressure:  50,
      willpower: 50,
    },
    learnChanceFormula: (talent) => Math.max(0.01, (talent - 60) / 100),
  },

  大力奇迹: {
    name: '大力奇迹',
    winRateBonus: 0.05,
    coachRequire: {
      strength:      70,
      stamina:       70,
      injuryResist:  60,
      talent:        40,
      focus:         60,
      forehand:      70,
      serve:         70,
    },
    selfLearnMinTalent: 50,
    selfLearnAttrs: {
      strength:     70,
      stamina:      70,
      injuryResist: 60,
      focus:        60,
      forehand:     70,
      serve:        70,
    },
    // 领悟概率 = 天赋值%
    learnChanceFormula: (talent) => talent / 100,
  },

  极限救球: {
    name: '极限救球',
    winRateBonus: 0.05,
    coachRequire: {
      stamina:      70,
      agility:      70,
      injuryResist: 60,
      willpower:    70,
      footwork:     70,
      focus:        70,
    },
    selfLearnMinTalent: 50,
    selfLearnAttrs: {
      stamina:      70,
      agility:      70,
      injuryResist: 60,
      willpower:    70,
      footwork:     70,
      focus:        70,
    },
    learnChanceFormula: (talent) => talent / 100,
  },

  底线无敌: {
    name: '底线无敌',
    winRateBonus: 0.03,
    coachRequire: {
      stamina:  60,
      strength: 70,
      focus:    70,
      forehand: 70,
    },
    selfLearnMinTalent: 50,
    selfLearnAttrs: {
      stamina:  60,
      strength: 70,
      focus:    70,
      forehand: 70,
    },
    // 领悟概率 = 天赋值%
    learnChanceFormula: (talent) => talent / 100,
  },
}

// 技能名称列表（用于遍历）
export const SKILL_NAMES = Object.keys(SKILL_DEFS)

// ── 检查球员是否满足教练传授条件 ──────────────────────
export function canCoachTeach(player, skillName) {
  const def = SKILL_DEFS[skillName]
  if (!def) return false
  if (player.skills?.includes(skillName)) return false  // 已有该技能
  const req = def.coachRequire
  return Object.entries(req).every(([attr, minVal]) => {
    if (attr === 'talent') return (player.talent || 0) >= minVal
    return (player[attr] || 0) >= minVal
  })
}

// ── 检查球员是否满足自主领悟条件，并返回领悟概率 ─────
// 返回 0 表示不满足条件，>0 表示概率
export function getSelfLearnChance(player, skillName) {
  const def = SKILL_DEFS[skillName]
  if (!def) return 0
  if (player.skills?.includes(skillName)) return 0  // 已有该技能
  if ((player.talent || 0) < def.selfLearnMinTalent) return 0

  // 检查属性要求
  const attrsMet = Object.entries(def.selfLearnAttrs).every(([attr, minVal]) => {
    return (player[attr] || 0) >= minVal
  })
  if (!attrsMet) return 0

  return def.learnChanceFormula(player.talent || 0)
}

// ── 计算球员所有技能的总胜率加成 ─────────────────────
export function calcSkillWinBonus(player) {
  const skills = player.skills || []
  return skills.reduce((total, skillName) => {
    const def = SKILL_DEFS[skillName]
    return total + (def?.winRateBonus || 0)
  }, 0)
}
