// ══════════════════════════════════════════════════════
// 随机事件库 — 50条
// category: player / finance / facility / sponsor / staff
// trigger:  "" = 纯随机 | "fatigue>80" | "loyalty<40" |
//           "cash<50000" | "prestige>3000" | "week%4==0" 等
// effect:   对 state 的影响，weekEngine 负责执行
// keywords: 给 AI 的扩写提示，{name}/{value}/{club} 为动态替换占位符
// tone:     positive / negative / neutral
// ══════════════════════════════════════════════════════

export const EVENT_LIBRARY = [

  // ── 球员类（player）× 18 ─────────────────────────────

  {
    id: 'EVT_P01',
    category: 'player',
    trigger: 'fatigue>80',
    probability: 0.6,
    keywords: '球员{name}因长期高强度训练出现膝盖不适，本周被迫减少训练量，疲劳略有缓解但状态下滑',
    effect: { fatigue: -15, loyalty: -5 },
    tone: 'negative',
  },
  {
    id: 'EVT_P02',
    category: 'player',
    trigger: 'fatigue>80',
    probability: 0.4,
    keywords: '球员{name}训练时突然崴脚，送医检查后确认轻微扭伤，需休息两周，忠诚度因得到妥善照顾而提升',
    effect: { fatigue: -30, loyalty: +8, health: 'injured' },
    tone: 'negative',
  },
  {
    id: 'EVT_P03',
    category: 'player',
    trigger: 'loyalty<40',
    probability: 0.5,
    keywords: '球员{name}对训练安排表示不满，私下向队友抱怨，情绪低落，忠诚度进一步下滑',
    effect: { loyalty: -8 },
    tone: 'negative',
  },
  {
    id: 'EVT_P04',
    category: 'player',
    trigger: 'loyalty<30',
    probability: 0.4,
    keywords: '球员{name}提出转会申请，声称外部俱乐部开出了更好的条件，若不挽留将在月底离队',
    effect: { loyalty: -15 },
    tone: 'negative',
  },
  {
    id: 'EVT_P05',
    category: 'player',
    trigger: '',
    probability: 0.15,
    keywords: '球员{name}在训练中突然开窍，某个技术动作一点就透，状态大幅提升，教练称赞其悟性极佳',
    effect: { loyalty: +10, expBonus: 1.5 },
    tone: 'positive',
  },
  {
    id: 'EVT_P06',
    category: 'player',
    trigger: '',
    probability: 0.12,
    keywords: '球员{name}参加了省级青少年网球交流赛并获得好成绩，回来后信心大增，斗志高昂',
    effect: { loyalty: +12, fatigue: +10 },
    tone: 'positive',
  },
  {
    id: 'EVT_P07',
    category: 'player',
    trigger: '',
    probability: 0.10,
    keywords: '球员{name}的家长来访，对俱乐部的训练环境和教练团队表示高度赞扬，并额外提供赞助支持',
    effect: { loyalty: +15, cash: +5000 },
    tone: 'positive',
  },
  {
    id: 'EVT_P08',
    category: 'player',
    trigger: '',
    probability: 0.08,
    keywords: '球员{name}接受了一家体育媒体的采访，提到{club}的训练方式，俱乐部声望小幅提升',
    effect: { prestige: +80 },
    tone: 'positive',
  },
  {
    id: 'EVT_P09',
    category: 'player',
    trigger: '',
    probability: 0.12,
    keywords: '球员{name}与队友发生冲突，起因是训练时间分配不均，队内气氛紧张，两人忠诚度均下降',
    effect: { loyalty: -6 },
    tone: 'negative',
  },
  {
    id: 'EVT_P10',
    category: 'player',
    trigger: '',
    probability: 0.08,
    keywords: '球员{name}生日，队友自发组织了庆祝活动，整个球队气氛活跃，全队忠诚度微幅提升',
    effect: { loyalty: +5 },
    tone: 'positive',
  },
  {
    id: 'EVT_P11',
    category: 'player',
    trigger: 'prestige>2000',
    probability: 0.15,
    keywords: '一名天赋出众的14岁少年主动联系{club}，希望加入训练，需支付一笔引进费用',
    effect: { cash: -8000, prestige: +50 },
    tone: 'neutral',
  },
  {
    id: 'EVT_P12',
    category: 'player',
    trigger: '',
    probability: 0.10,
    keywords: '球员{name}最近学习成绩下滑，家长要求减少训练时间，否则将退出俱乐部，忠诚度受影响',
    effect: { loyalty: -10 },
    tone: 'negative',
  },
  {
    id: 'EVT_P13',
    category: 'player',
    trigger: '',
    probability: 0.08,
    keywords: '球员{name}收到国家青少年集训队的邀请函，短暂离队参加集训，归来后带回宝贵经验，各项能力均有提升',
    effect: { loyalty: +20, expBonus: 2.0 },
    tone: 'positive',
  },
  {
    id: 'EVT_P14',
    category: 'player',
    trigger: '',
    probability: 0.10,
    keywords: '球员{name}在训练中不慎被球击中眼部，检查后无大碍，但引发对训练安全规范的讨论',
    effect: { fatigue: +10, loyalty: -3 },
    tone: 'negative',
  },
  {
    id: 'EVT_P15',
    category: 'player',
    trigger: 'loyalty>85',
    probability: 0.20,
    keywords: '球员{name}主动放弃了另一家俱乐部的高薪邀请，表示对{club}充满感情，忠诚度进一步巩固',
    effect: { loyalty: +10, prestige: +60 },
    tone: 'positive',
  },
  {
    id: 'EVT_P16',
    category: 'player',
    trigger: '',
    probability: 0.08,
    keywords: '球员{name}暗恋同龄队友，训练时频繁分心，近期表现有所下滑，教练私下谈话后情况好转',
    effect: { loyalty: +3, fatigue: +8 },
    tone: 'neutral',
  },
  {
    id: 'EVT_P17',
    category: 'player',
    trigger: '',
    probability: 0.07,
    keywords: '球员{name}在社交媒体上发布了一段训练视频爆红，吸引了大量关注，俱乐部声望提升',
    effect: { prestige: +120, loyalty: +8 },
    tone: 'positive',
  },
  {
    id: 'EVT_P18',
    category: 'player',
    trigger: 'cash<30000',
    probability: 0.25,
    keywords: '由于俱乐部近期经费紧张，球员{name}的训练装备更新被推迟，球员情绪有些低落',
    effect: { loyalty: -8 },
    tone: 'negative',
  },

  // ── 财务类（finance）× 10 ────────────────────────────

  {
    id: 'EVT_F01',
    category: 'finance',
    trigger: 'prestige>1500',
    probability: 0.20,
    keywords: '一家本地运动品牌主动联系{club}，希望冠名赞助本赛季，提供一笔赞助资金',
    effect: { cash: +20000, prestige: +100 },
    tone: 'positive',
  },
  {
    id: 'EVT_F02',
    category: 'finance',
    trigger: 'cash<20000',
    probability: 0.30,
    keywords: '{club}本月现金流告急，部分供应商催款，管理层紧急召开财务会议，讨论削减开支方案',
    effect: { prestige: -50 },
    tone: 'negative',
  },
  {
    id: 'EVT_F03',
    category: 'finance',
    trigger: 'week%4==0',
    probability: 0.25,
    keywords: '本月场地利用率超出预期，外租收入比计划多出一笔额外收益',
    effect: { cash: +8000 },
    tone: 'positive',
  },
  {
    id: 'EVT_F04',
    category: 'finance',
    trigger: '',
    probability: 0.10,
    keywords: '税务部门对{club}进行例行检查，发现一处历史账目问题，需补缴罚款',
    effect: { cash: -6000 },
    tone: 'negative',
  },
  {
    id: 'EVT_F05',
    category: 'finance',
    trigger: 'prestige>3000',
    probability: 0.15,
    keywords: '一位成功商人看好{club}的发展前景，主动提出注资意向，双方洽谈后达成小额股权合作',
    effect: { cash: +50000, prestige: +150 },
    tone: 'positive',
  },
  {
    id: 'EVT_F06',
    category: 'finance',
    trigger: '',
    probability: 0.12,
    keywords: '政府体育部门公布青少年体育发展补贴政策，{club}符合申报条件，成功获批一笔专项补贴',
    effect: { cash: +15000 },
    tone: 'positive',
  },
  {
    id: 'EVT_F07',
    category: 'finance',
    trigger: '',
    probability: 0.10,
    keywords: '一笔场地预订款项遭遇退款纠纷，对方客户拒绝支付违约金，俱乐部损失一笔收入',
    effect: { cash: -5000 },
    tone: 'negative',
  },
  {
    id: 'EVT_F08',
    category: 'finance',
    trigger: 'prestige>1000',
    probability: 0.18,
    keywords: '某学校希望与{club}合作，定期包场开展青少年体验课，签订了一份长期合作协议',
    effect: { cash: +12000, prestige: +80 },
    tone: 'positive',
  },
  {
    id: 'EVT_F09',
    category: 'finance',
    trigger: '',
    probability: 0.08,
    keywords: '俱乐部银行账户遭遇短暂冻结，原因是系统误报可疑交易，解冻后发现小额手续费损失',
    effect: { cash: -2000 },
    tone: 'negative',
  },
  {
    id: 'EVT_F10',
    category: 'finance',
    trigger: '',
    probability: 0.12,
    keywords: '一家外卖平台希望在{club}场地内设置自提点，每月支付场地使用费',
    effect: { cash: +3000 },
    tone: 'positive',
  },

  // ── 设施类（facility）× 8 ────────────────────────────

  {
    id: 'EVT_FA01',
    category: 'facility',
    trigger: '',
    probability: 0.12,
    keywords: '暴雨天气导致{club}球场积水，需紧急排水修缮，本周球场无法正常使用，外租收入受损',
    effect: { cash: -4000, rentalLoss: 0.5 },
    tone: 'negative',
  },
  {
    id: 'EVT_FA02',
    category: 'facility',
    trigger: '',
    probability: 0.10,
    keywords: '更衣室热水器突发故障，球员训练后无热水可用，怨声载道，需紧急维修',
    effect: { cash: -3000, loyalty: -5 },
    tone: 'negative',
  },
  {
    id: 'EVT_FA03',
    category: 'facility',
    trigger: 'prestige>2000',
    probability: 0.15,
    keywords: '一家体育设备公司主动联系{club}，愿意以折扣价提供一批最新训练器材，性价比极高',
    effect: { cash: -10000, facilityBonus: true },
    tone: 'neutral',
  },
  {
    id: 'EVT_FA04',
    category: 'facility',
    trigger: '',
    probability: 0.08,
    keywords: '球场灯光系统老化，夜间训练时多次出现闪烁故障，影响训练效果，需全面更换灯具',
    effect: { cash: -8000 },
    tone: 'negative',
  },
  {
    id: 'EVT_FA05',
    category: 'facility',
    trigger: '',
    probability: 0.10,
    keywords: '相邻地块挂牌出售，面积适合扩建球场，价格合理，是难得的扩张机会',
    effect: { cash: -30000, prestige: +200 },
    tone: 'neutral',
  },
  {
    id: 'EVT_FA06',
    category: 'facility',
    trigger: '',
    probability: 0.12,
    keywords: '消防部门进行年度安检，指出部分设施存在安全隐患，要求限期整改，涉及一笔整改费用',
    effect: { cash: -5000 },
    tone: 'negative',
  },
  {
    id: 'EVT_FA07',
    category: 'facility',
    trigger: 'prestige>1500',
    probability: 0.12,
    keywords: '地方政府将{club}列为青少年体育示范基地，拨款资助部分设施升级改造',
    effect: { cash: +25000, prestige: +200 },
    tone: 'positive',
  },
  {
    id: 'EVT_FA08',
    category: 'facility',
    trigger: '',
    probability: 0.09,
    keywords: '供水管道老化漏水，影响球场和更衣室正常使用，维修人员需停水施工半天',
    effect: { cash: -4500, loyalty: -3 },
    tone: 'negative',
  },

  // ── 赞助商类（sponsor）× 7 ───────────────────────────

  {
    id: 'EVT_S01',
    category: 'sponsor',
    trigger: 'prestige>1000',
    probability: 0.20,
    keywords: '本地饮料品牌希望赞助{club}的训练服，要求在球衣上印制logo，并提供一批运动饮料',
    effect: { cash: +10000, prestige: +60 },
    tone: 'positive',
  },
  {
    id: 'EVT_S02',
    category: 'sponsor',
    trigger: 'prestige>2500',
    probability: 0.15,
    keywords: '一家知名运动品牌主动找上门，提出成为{club}的官方装备赞助商，条件优厚',
    effect: { cash: +40000, prestige: +250 },
    tone: 'positive',
  },
  {
    id: 'EVT_S03',
    category: 'sponsor',
    trigger: '',
    probability: 0.15,
    keywords: '原赞助商因自身业务调整，提前终止赞助合同，{club}损失一笔预期赞助收入',
    effect: { cash: -15000, prestige: -80 },
    tone: 'negative',
  },
  {
    id: 'EVT_S04',
    category: 'sponsor',
    trigger: 'prestige>500',
    probability: 0.18,
    keywords: '一位热心网球的本地企业家希望赞助某位球员，指定为天赋最高的球员提供个人赞助',
    effect: { cash: +8000, loyalty: +10 },
    tone: 'positive',
  },
  {
    id: 'EVT_S05',
    category: 'sponsor',
    trigger: '',
    probability: 0.12,
    keywords: '赞助商对近期{club}在赛场上的表现不满意，威胁削减赞助金额，双方关系趋于紧张',
    effect: { cash: -5000, prestige: -40 },
    tone: 'negative',
  },
  {
    id: 'EVT_S06',
    category: 'sponsor',
    trigger: 'prestige>3500',
    probability: 0.12,
    keywords: '一家国际体育经纪公司看中{club}的培养体系，主动接触合作，愿意协助球员参加更高水平赛事',
    effect: { prestige: +300 },
    tone: 'positive',
  },
  {
    id: 'EVT_S07',
    category: 'sponsor',
    trigger: '',
    probability: 0.10,
    keywords: '某赞助商要求{club}在宣传材料中突出其品牌，双方就合同细节产生分歧，谈判陷入僵局',
    effect: { prestige: -30 },
    tone: 'negative',
  },

  // ── 员工/教练类（staff）× 7 ─────────────────────────

  {
    id: 'EVT_ST01',
    category: 'staff',
    trigger: 'coachFatigue>80',
    probability: 0.50,
    keywords: '教练{name}因长期高强度执教出现职业倦怠，情绪明显低落，执教质量有所下滑，建议适当减负',
    effect: { coachFatigue: -20, coachLoyalty: -8 },
    tone: 'negative',
  },
  {
    id: 'EVT_ST02',
    category: 'staff',
    trigger: '',
    probability: 0.10,
    keywords: '教练{name}参加了一项国际网球教练培训课程，回来后带来全新训练理念，执教能力提升',
    effect: { coachLoyalty: +15, expBonus: 1.2 },
    tone: 'positive',
  },
  {
    id: 'EVT_ST03',
    category: 'staff',
    trigger: '',
    probability: 0.08,
    keywords: '另一家俱乐部向教练{name}抛来橄榄枝，开出更高薪资，教练内心有些动摇，忠诚度下降',
    effect: { coachLoyalty: -15 },
    tone: 'negative',
  },
  {
    id: 'EVT_ST04',
    category: 'staff',
    trigger: 'prestige>2000',
    probability: 0.15,
    keywords: '一位有海外执教经验的高水平教练主动投递简历，表示对{club}的发展方向感兴趣，薪资要求较高',
    effect: { prestige: +50 },
    tone: 'neutral',
  },
  {
    id: 'EVT_ST05',
    category: 'staff',
    trigger: '',
    probability: 0.10,
    keywords: '教练{name}在球员家长群中引发争议，部分家长对其执教方式提出质疑，双方矛盾公开化',
    effect: { coachLoyalty: -10, prestige: -60 },
    tone: 'negative',
  },
  {
    id: 'EVT_ST06',
    category: 'staff',
    trigger: '',
    probability: 0.12,
    keywords: '教练{name}带领的球员在省级比赛中取得佳绩，引发业内关注，其个人声誉大幅提升，执教热情高涨',
    effect: { coachLoyalty: +20, prestige: +100 },
    tone: 'positive',
  },
  {
    id: 'EVT_ST07',
    category: 'staff',
    trigger: '',
    probability: 0.08,
    keywords: '后勤工作人员集体要求涨薪，否则将集体离职，管理层需要在稳定运营和控制成本之间做出抉择',
    effect: { cash: -5000 },
    tone: 'negative',
  },
]

// ── 按 category 分组，供 weekEngine 按权重抽取 ──
export const EVENT_BY_CATEGORY = EVENT_LIBRARY.reduce((acc, evt) => {
  if (!acc[evt.category]) acc[evt.category] = []
  acc[evt.category].push(evt)
  return acc
}, {})

// ── 抽取随机事件（供 weekEngine 调用）──
// state: 当前游戏状态
// 返回被触发的事件（可能为 null）
export function pickRandomEvent(state) {
  const { gameState, finance, players, coaches } = state
  const candidates = EVENT_LIBRARY.filter(evt => {
    // 概率过滤
    if (Math.random() > evt.probability) return false
    // 触发条件过滤
    if (!evt.trigger) return true
    try {
      const prestige  = gameState?.prestige   ?? 0
      const cash      = finance?.cash         ?? 0
      const week      = gameState?.week        ?? 1
      const fatigue   = players.length > 0
        ? players.reduce((s, p) => s + (p.fatigue || 0), 0) / players.length
        : 0
      const loyalty   = players.length > 0
        ? players.reduce((s, p) => s + (p.loyalty || 0), 0) / players.length
        : 70
      const coachFatigue = coaches.length > 0
        ? coaches.reduce((s, c) => s + (c.fatigue || 0), 0) / coaches.length
        : 0
      // eslint-disable-next-line no-new-func
      return new Function(
        'prestige','cash','week','fatigue','loyalty','coachFatigue',
        `return !!(${evt.trigger})`
      )(prestige, cash, week, fatigue, loyalty, coachFatigue)
    } catch {
      return false
    }
  })
  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}
