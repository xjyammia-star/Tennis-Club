// src/data/itemDefs.js
// 道具定义库 — 4系列 × 9种 = 36种道具

export const ITEM_CATEGORIES = {
  recovery:  '恢复系列',
  combat:    '竞技系列',
  growth:    '成长系列',
  facility:  '设施系列',
};

export const ITEM_RARITIES = {
  legendary: { label: '传奇', color: '#E8593C', researchWeeks: [14, 18] },
  epic:      { label: '卓越', color: '#7F77DD', researchWeeks: [8, 12]  },
  rare:      { label: '精良', color: '#378ADD', researchWeeks: [5, 8]   },
  common:    { label: '普通', color: '#639922', researchWeeks: [2, 4]   },
};

// effect 字段说明：
//   fatigue:         直接修改球员 fatigue（负数=减少疲劳）
//   fatigueRecoveryPerDay: 每天额外恢复疲劳，持续 duration 周
//   fatigueGainMult: 课程疲劳增量倍率（0.8 = 减少20%）
//   expMult:         本周训练经验倍率
//   expMultWeeks:    expMult 持续周数（不填=本周）
//   skillChanceMult: 技能领悟概率倍率，持续 duration 周
//   extraSkillCheck: 额外触发一次自主领悟检测
//   attrBonus:       随机弱势属性永久+N（概率 attrBonusChance）
//   attrBonusChance: 额外+5 的触发概率
//   targetTrainType: 配合 expMult 使用，限定训练类型（tech/phys/mental）
//   youthOnly:       true = 仅对 18岁以下球员有效
//   combatPower:     比赛战力临时加成（仅比赛周）
//   winProbBonus:    比赛胜率加成（小数，0.05=+5%）
//   tacticsBonus:    战术属性视为+N（持续 duration 周）
//   preventInjury:   true = 本周/本场防止轻伤
//   healAccel:       伤病恢复加速（1=正常，2=两倍速）
//   healAccelWeeks:  healAccel 持续周数
//   loyalty:         忠诚度变化
//   prestige:        赢得比赛后额外声望
//   instantSkill:    true = 立即领悟1个技能（若已有则升级）
//   seasonExpMult:   本赛季训练经验倍率（长期）
//   maintenanceMult: 设施维护费倍率（0.7=减少30%），持续 duration 周
//   maintenanceScope: 'all'|'court'|'gym'|'service' 影响范围
//   facilityRepair:  true = 可将一处糟糕设施修复为普通
//   serviceRecoveryBonus: 服务设施疲劳恢复加成倍率
//   courtEffectBonus:    球场训练效果系数额外+N%
//   operationCostMult:   设施运营成本倍率

export const ITEM_DEFS = [

  // ─────────────── 恢复系列 ───────────────

  {
    id: 'ITEM_R01',
    category: 'recovery',
    rarity: 'legendary',
    name: '全能恢复针',
    description: '顶级运动医学结晶。使用后立即消除大量疲劳、清除轻伤，并激活本周超量训练恢复机制。',
    price: 15000,
    researchWeeks: 14,
    maxStock: 2,
    cooldownWeeks: 3,
    duration: 0,
    effect: {
      fatigue: -40,
      healAccel: 999,       // 立即消除轻伤（用极大值处理）
      healAccelWeeks: 1,
      expMult: 1.3,
    },
  },
  {
    id: 'ITEM_R02',
    category: 'recovery',
    rarity: 'epic',
    name: '深度修复舱',
    description: '专业理疗设备配套使用的高浓度修复液，显著加速肌肉和伤病的恢复速度。',
    price: 7000,
    researchWeeks: 10,
    maxStock: 3,
    cooldownWeeks: 2,
    duration: 2,
    effect: {
      fatigue: -30,
      healAccel: 2,
      healAccelWeeks: 2,
    },
  },
  {
    id: 'ITEM_R03',
    category: 'recovery',
    rarity: 'epic',
    name: '肌肉松弛膏',
    description: '涂抹后持续释放活性成分，大幅降低训练带来的肌肉疲劳积累。',
    price: 5000,
    researchWeeks: 8,
    maxStock: 4,
    cooldownWeeks: 1,
    duration: 2,
    effect: {
      fatigueRecoveryPerDay: 8,
      fatigueGainMult: 0.8,
    },
  },
  {
    id: 'ITEM_R04',
    category: 'recovery',
    rarity: 'rare',
    name: '高效营养补剂',
    description: '科学配比的运动营养品，即时补充能量并提升本周训练吸收效率。',
    price: 2500,
    researchWeeks: 6,
    maxStock: 5,
    cooldownWeeks: 0,
    duration: 0,
    effect: {
      fatigue: -20,
      expMult: 1.1,
    },
  },
  {
    id: 'ITEM_R05',
    category: 'recovery',
    rarity: 'rare',
    name: '快速恢复贴',
    description: '贴片式透皮给药，缓解肌肉酸痛，加速轻伤部位的血液循环。',
    price: 1800,
    researchWeeks: 5,
    maxStock: 5,
    cooldownWeeks: 0,
    duration: 0,
    effect: {
      fatigue: -15,
      healAccel: 2,
      healAccelWeeks: 1,
    },
  },
  {
    id: 'ITEM_R06',
    category: 'recovery',
    rarity: 'rare',
    name: '睡眠增强剂',
    description: '改善睡眠质量的天然配方，持续提升每日自然恢复效率。',
    price: 2000,
    researchWeeks: 6,
    maxStock: 5,
    cooldownWeeks: 0,
    duration: 3,
    effect: {
      fatigueRecoveryPerDay: 5,
    },
  },
  {
    id: 'ITEM_R07',
    category: 'recovery',
    rarity: 'common',
    name: '能量饮料',
    description: '赛前或训练前饮用，快速提神，轻微缓解疲劳状态。',
    price: 600,
    researchWeeks: 3,
    maxStock: 5,
    cooldownWeeks: 0,
    duration: 0,
    effect: {
      fatigue: -8,
    },
  },
  {
    id: 'ITEM_R08',
    category: 'recovery',
    rarity: 'common',
    name: '基础营养包',
    description: '每日膳食补充套餐，球员感受到俱乐部的细心照料，忠诚度微升。',
    price: 500,
    researchWeeks: 2,
    maxStock: 5,
    cooldownWeeks: 0,
    duration: 0,
    effect: {
      fatigue: -6,
      loyalty: 2,
    },
  },
  {
    id: 'ITEM_R09',
    category: 'recovery',
    rarity: 'common',
    name: '冰敷理疗套装',
    description: '训练后冰敷处理，减少炎症反应，防止轻度过度使用引发轻伤。',
    price: 800,
    researchWeeks: 3,
    maxStock: 5,
    cooldownWeeks: 0,
    duration: 0,
    effect: {
      fatigue: -10,
      preventInjury: true,
    },
  },

  // ─────────────── 竞技系列 ───────────────

  {
    id: 'ITEM_C01',
    category: 'combat',
    rarity: 'legendary',
    name: '冠军基因激活剂',
    description: '顶级运动科学的结晶，激活球员的竞技潜能上限，在重要赛事中爆发出超常水准。',
    price: 18000,
    researchWeeks: 16,
    maxStock: 1,
    cooldownWeeks: 4,
    duration: 0,
    combatOnly: true,
    effect: {
      combatPower: 18,
      winProbBonus: 0.15,
      prestige: 50,          // 赢得比赛后额外声望
    },
  },
  {
    id: 'ITEM_C02',
    category: 'combat',
    rarity: 'epic',
    name: '心流专注药水',
    description: '帮助球员快速进入心流状态，比赛中判断更准确，心理承压能力大幅提升。',
    price: 8000,
    researchWeeks: 11,
    maxStock: 2,
    cooldownWeeks: 2,
    duration: 0,
    combatOnly: true,
    effect: {
      combatPower: 12,
      winProbBonus: 0.10,
    },
  },
  {
    id: 'ITEM_C03',
    category: 'combat',
    rarity: 'epic',
    name: '战术模拟手册',
    description: '系统性的赛前分析资料，帮助球员更好地阅读比赛，战术理解持续提升。',
    price: 6000,
    researchWeeks: 9,
    maxStock: 3,
    cooldownWeeks: 3,
    duration: 4,
    effect: {
      tacticsBonus: 15,
    },
  },
  {
    id: 'ITEM_C04',
    category: 'combat',
    rarity: 'rare',
    name: '比赛专用球拍',
    description: '针对比赛场地和球员技术特点定制的高性能球拍，临场发挥更稳定。',
    price: 3000,
    researchWeeks: 7,
    maxStock: 3,
    cooldownWeeks: 0,
    duration: 0,
    combatOnly: true,
    effect: {
      combatPower: 8,
      winProbBonus: 0.05,
    },
  },
  {
    id: 'ITEM_C05',
    category: 'combat',
    rarity: 'rare',
    name: '心理激励贴纸',
    description: '强烈刺激球员求胜欲，临场战斗力大幅提升，但强迫使用可能引发轻微抵触。',
    price: 2000,
    researchWeeks: 5,
    maxStock: 4,
    cooldownWeeks: 0,
    duration: 0,
    combatOnly: true,
    effect: {
      combatPower: 6,
      loyalty: -2,
    },
  },
  {
    id: 'ITEM_C06',
    category: 'combat',
    rarity: 'rare',
    name: '赛前热身包',
    description: '专业赛前热身套餐，包含肌肉激活和神经系统唤醒方案，消除赛前疲劳。',
    price: 2200,
    researchWeeks: 6,
    maxStock: 4,
    cooldownWeeks: 0,
    duration: 0,
    combatOnly: true,
    effect: {
      fatigue: -10,
      combatPower: 5,
    },
  },
  {
    id: 'ITEM_C07',
    category: 'combat',
    rarity: 'common',
    name: '加强型球弦',
    description: '更高张力、更佳弹性的球弦，临场击球力量和控制感均有改善。',
    price: 900,
    researchWeeks: 3,
    maxStock: 5,
    cooldownWeeks: 0,
    duration: 0,
    combatOnly: true,
    effect: {
      combatPower: 3,
      winProbBonus: 0.02,
    },
  },
  {
    id: 'ITEM_C08',
    category: 'combat',
    rarity: 'common',
    name: '护腕套装',
    description: '专业护腕保护手腕关节，降低比赛中受伤风险，击球更有信心。',
    price: 700,
    researchWeeks: 2,
    maxStock: 5,
    cooldownWeeks: 0,
    duration: 0,
    combatOnly: true,
    effect: {
      combatPower: 2,
      preventInjury: true,
    },
  },
  {
    id: 'ITEM_C09',
    category: 'combat',
    rarity: 'common',
    name: '比赛能量棒',
    description: '换边休息时补充能量，缓解比赛中的体能消耗，保持竞技状态。',
    price: 500,
    researchWeeks: 2,
    maxStock: 5,
    cooldownWeeks: 0,
    duration: 0,
    combatOnly: true,
    effect: {
      fatigue: -5,
      combatPower: 2,
    },
  },

  // ─────────────── 成长系列 ───────────────

  {
    id: 'ITEM_G01',
    category: 'growth',
    rarity: 'legendary',
    name: '天赋觉醒石',
    description: '传说中的训练圣物，能瞬间唤醒球员的深层技能记忆。使用后立即领悟一个技能，并激活本赛季的训练超频模式。',
    price: 20000,
    researchWeeks: 18,
    maxStock: 1,
    cooldownWeeks: 0,   // 不可叠加，每人只能用一次
    duration: 0,
    effect: {
      instantSkill: true,
      seasonExpMult: 1.2,
    },
  },
  {
    id: 'ITEM_G02',
    category: 'growth',
    rarity: 'epic',
    name: '神经重塑液',
    description: '促进神经元连接重塑，持续提升技能形成速度，训练吸收效率同步提高。',
    price: 9000,
    researchWeeks: 12,
    maxStock: 2,
    cooldownWeeks: 4,
    duration: 4,
    effect: {
      skillChanceMult: 2.0,
      expMult: 1.15,
      expMultWeeks: 4,
    },
  },
  {
    id: 'ITEM_G03',
    category: 'growth',
    rarity: 'epic',
    name: '爆发训练剂',
    description: '超载训练激活剂，显著提升短期训练经验增益，但同时增加疲劳积累风险。',
    price: 6500,
    researchWeeks: 10,
    maxStock: 3,
    cooldownWeeks: 2,
    duration: 2,
    effect: {
      expMult: 1.3,
      expMultWeeks: 2,
      fatigueGainMult: 1.15,
    },
  },
  {
    id: 'ITEM_G04',
    category: 'growth',
    rarity: 'rare',
    name: '属性强化胶囊',
    description: '精准强化球员最薄弱的属性维度，有小概率触发超常发育。',
    price: 3500,
    researchWeeks: 8,
    maxStock: 3,
    cooldownWeeks: 0,
    duration: 0,
    effect: {
      attrBonus: 3,
      attrBonusChance: 0.15,   // 15%概率额外+5
    },
  },
  {
    id: 'ITEM_G05',
    category: 'growth',
    rarity: 'rare',
    name: '专项训练手册',
    description: '针对特定训练类型的系统化教程，集中提升目标技术、体能或心理方向的经验效率。',
    price: 2800,
    researchWeeks: 7,
    maxStock: 4,
    cooldownWeeks: 0,
    duration: 3,
    effect: {
      expMult: 1.2,
      expMultWeeks: 3,
      targetTrainType: 'choose',  // 购买时玩家选择 tech/phys/mental
    },
  },
  {
    id: 'ITEM_G06',
    category: 'growth',
    rarity: 'rare',
    name: '记忆强化补剂',
    description: '短效记忆增强配方，大幅提升本周技能形成窗口，并额外触发一次自主领悟检测。',
    price: 2200,
    researchWeeks: 6,
    maxStock: 4,
    cooldownWeeks: 0,
    duration: 0,
    effect: {
      skillChanceMult: 1.5,
      extraSkillCheck: true,
    },
  },
  {
    id: 'ITEM_G07',
    category: 'growth',
    rarity: 'common',
    name: '初级训练强化液',
    description: '运动前饮用，轻度提升本周训练的经验吸收效率。',
    price: 1000,
    researchWeeks: 4,
    maxStock: 5,
    cooldownWeeks: 0,
    duration: 0,
    effect: {
      expMult: 1.1,
    },
  },
  {
    id: 'ITEM_G08',
    category: 'growth',
    rarity: 'common',
    name: '平衡发展套餐',
    description: '均衡营养+训练辅助方案，自动向球员相对薄弱的方向倾斜经验分配。',
    price: 800,
    researchWeeks: 3,
    maxStock: 5,
    cooldownWeeks: 0,
    duration: 0,
    effect: {
      expMult: 1.05,
      balanceBoost: true,   // 偏低属性方向额外+5%
    },
  },
  {
    id: 'ITEM_G09',
    category: 'growth',
    rarity: 'common',
    name: '青训加速包',
    description: '专为青少年球员设计的成长套餐，对成年球员无效。',
    price: 600,
    researchWeeks: 3,
    maxStock: 5,
    cooldownWeeks: 0,
    duration: 0,
    effect: {
      expMult: 1.15,
      youthOnly: true,     // age < 18 才有效
    },
  },

  // ─────────────── 设施系列 ───────────────

  {
    id: 'ITEM_F01',
    category: 'facility',
    rarity: 'legendary',
    name: '纳米修复液',
    description: '前沿纳米技术材料，喷涂后自主修复微小损伤。可将一处糟糕设施直接恢复为普通状态，同时大幅降低全场本月维护成本。',
    price: 16000,
    researchWeeks: 15,
    maxStock: 1,
    cooldownWeeks: 4,
    duration: 4,
    effect: {
      maintenanceMult: 0.5,
      maintenanceScope: 'all',
      facilityRepair: true,
    },
  },
  {
    id: 'ITEM_F02',
    category: 'facility',
    rarity: 'epic',
    name: '高分子涂层剂',
    description: '特殊高分子涂层大幅降低球场表面磨损速度，显著延长维护周期。',
    price: 7500,
    researchWeeks: 11,
    maxStock: 2,
    cooldownWeeks: 4,
    duration: 8,
    effect: {
      maintenanceMult: 0.7,
      maintenanceScope: 'court',
      courtEffectBonus: 0,  // 球场本身损耗减半（由持续时间控制）
    },
  },
  {
    id: 'ITEM_F03',
    category: 'facility',
    rarity: 'epic',
    name: '全场能量优化包',
    description: '通过改善室内空气循环和温湿度控制，让球员在服务设施中的恢复效率大幅提升。',
    price: 6000,
    researchWeeks: 9,
    maxStock: 2,
    cooldownWeeks: 3,
    duration: 4,
    effect: {
      serviceRecoveryBonus: 1.3,
    },
  },
  {
    id: 'ITEM_F04',
    category: 'facility',
    rarity: 'rare',
    name: '场地养护套装',
    description: '专业球场维护工具包，降低单块球场本月维护开支，同时提升训练效果系数。',
    price: 3000,
    researchWeeks: 7,
    maxStock: 3,
    cooldownWeeks: 0,
    duration: 4,
    effect: {
      maintenanceMult: 0.6,
      maintenanceScope: 'court',
      courtEffectBonus: 5,
    },
  },
  {
    id: 'ITEM_F05',
    category: 'facility',
    rarity: 'rare',
    name: '设备润滑保养包',
    description: '定期保养健身器械和理疗设备，降低耗损、提升使用效果。',
    price: 2500,
    researchWeeks: 6,
    maxStock: 3,
    cooldownWeeks: 0,
    duration: 4,
    effect: {
      maintenanceMult: 0.75,
      maintenanceScope: 'gym',
      courtEffectBonus: 5,
    },
  },
  {
    id: 'ITEM_F06',
    category: 'facility',
    rarity: 'rare',
    name: '环境净化系统',
    description: '改善更衣室和休息室的空气质量与环境舒适度，提升球员在服务设施中的每日恢复量。',
    price: 2800,
    researchWeeks: 7,
    maxStock: 3,
    cooldownWeeks: 0,
    duration: 8,
    effect: {
      serviceRecoveryBonus: 1.15,
    },
  },
  {
    id: 'ITEM_F07',
    category: 'facility',
    rarity: 'common',
    name: '球场补丁套件',
    description: '快速修补球场表面小损伤，降低本周维护费用。',
    price: 900,
    researchWeeks: 3,
    maxStock: 5,
    cooldownWeeks: 0,
    duration: 1,
    effect: {
      maintenanceMult: 0.8,
      maintenanceScope: 'court',
    },
  },
  {
    id: 'ITEM_F08',
    category: 'facility',
    rarity: 'common',
    name: '基础清洁套装',
    description: '定期深度清洁全场设施，维护成本微降，球员感受到良好的训练环境，忠诚度小幅提升。',
    price: 700,
    researchWeeks: 3,
    maxStock: 5,
    cooldownWeeks: 0,
    duration: 1,
    effect: {
      maintenanceMult: 0.9,
      maintenanceScope: 'all',
      loyalty: 1,            // 对所有球员+1
    },
  },
  {
    id: 'ITEM_F09',
    category: 'facility',
    rarity: 'common',
    name: '节能改造包',
    description: '对水电系统进行简单节能改造，持续降低设施运营成本。',
    price: 1000,
    researchWeeks: 4,
    maxStock: 5,
    cooldownWeeks: 0,
    duration: 4,
    effect: {
      operationCostMult: 0.92,
    },
  },
];

// 按分类快速检索
export const getItemsByCategory = (category) =>
  ITEM_DEFS.filter(item => item.category === category);

// 按稀有度快速检索
export const getItemsByRarity = (rarity) =>
  ITEM_DEFS.filter(item => item.rarity === rarity);

// 按 ID 检索
export const getItemById = (id) =>
  ITEM_DEFS.find(item => item.id === id);