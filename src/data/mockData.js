// 模拟游戏状态数据 — 后续替换为 Supabase 真实数据

export const gameState = {
  clubName: '长青网球俱乐部',
  year: 1,
  week: 1,
  dayOfWeek: '周一',
  cash: 200000,
  prestige: 1000,
  prestigeTitle: '当地闻名',
  prestigeChange: 0,
  difficulty: 'normal',
  clubSize: 'medium',
  loanMonthly: 0,
}

export const clubStats = {
  playerCount: 12,
  playerCapacity: 17,
  coachCount: 4,
  courtCount: 6,
  courtTypes: '普通硬地',
  facilityCount: 3,
}

export const recentNews = [
  {
    id: 1,
    type: 'skill',
    text: '青少年球员王小明在训练中领悟了「上旋月亮」技能，天赋潜力令人期待。',
    week: 1,
  },
  {
    id: 2,
    type: 'finance',
    text: '本周场地外租收入 ¥3,200，略高于预期。',
    week: 1,
  },
  {
    id: 3,
    type: 'player',
    text: '16岁球员陈晓雨连续三周训练，疲劳度已达 72，建议本周安排休息日。',
    week: 1,
  },
]

export const upcomingEvents = [
  { id: 1, name: 'ITF青少年赛（一）', level: 'ITF',  week: 5,  badgeClass: 'badge-blue'  },
  { id: 2, name: '马赛250',            level: '250',  week: 6,  badgeClass: 'badge-green' },
  { id: 3, name: '迈阿密1000赛',       level: '1000', week: 11, badgeClass: 'badge-gold'  },
  { id: 4, name: '法国网球公开赛',      level: '满贯', week: 22, badgeClass: 'badge-gold'  },
]

export const menuItems = [
  { id: 'players',   label: '球员管理',   icon: 'ti-users',              path: '/players'  },
  { id: 'coaches',   label: '教练团队',   icon: 'ti-whistle',            path: '/coaches'  },
  { id: 'schedule',  label: '训练安排',   icon: 'ti-calendar-week',      path: '/schedule' },
  { id: 'facilities',label: '俱乐部设施', icon: 'ti-building-community', path: '/facilities'},
  { id: 'finance',   label: '财务收支',   icon: 'ti-chart-bar',          path: '/finance'  },
  { id: 'events',    label: '赛事管理',   icon: 'ti-trophy',             path: '/events'   },
]

export const navItems = [
  { id: 'home',     label: '主页', icon: 'ti-home',      path: '/'         },
  { id: 'players',  label: '球员', icon: 'ti-users',     path: '/players'  },
  { id: 'events',   label: '赛事', icon: 'ti-calendar',  path: '/events'   },
  { id: 'finance',  label: '财务', icon: 'ti-chart-bar', path: '/finance'  },
  { id: 'settings', label: '设置', icon: 'ti-settings',  path: '/settings' },
]

// 格式化金额
export function formatCash(amount) {
  if (amount >= 10000) {
    return `¥${(amount / 10000).toFixed(amount % 10000 === 0 ? 0 : 1)}万`
  }
  return `¥${amount.toLocaleString()}`
}
