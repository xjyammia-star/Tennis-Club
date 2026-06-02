import { useLocation } from 'react-router-dom'
import { gameState, clubStats, formatCash } from '../data/mockData'

const pageTitles = {
  '/':           '主页总览',
  '/players':    '球员管理',
  '/coaches':    '教练团队',
  '/schedule':   '训练安排',
  '/facilities': '俱乐部设施',
  '/events':     '赛事管理',
  '/finance':    '财务收支',
  '/settings':   '设置',
}

export default function Topbar() {
  const { pathname } = useLocation()
  const title = pageTitles[pathname] || '网球俱乐部经营'

  return (
    <div className="topbar">
      <div className="topbar-title">{title}</div>
      <div className="topbar-kpis">
        <div className="topbar-kpi">
          <span className="topbar-kpi-val">{formatCash(gameState.cash)}</span>
          <span className="topbar-kpi-label">资金</span>
        </div>
        <div className="topbar-kpi">
          <span className="topbar-kpi-val">{gameState.prestige.toLocaleString()}</span>
          <span className="topbar-kpi-label">声望</span>
        </div>
        <div className="topbar-kpi">
          <span className="topbar-kpi-val">{clubStats.playerCount} 人</span>
          <span className="topbar-kpi-label">球员</span>
        </div>
        <div className="topbar-kpi">
          <span className="topbar-kpi-val">{clubStats.courtCount} 片</span>
          <span className="topbar-kpi-label">球场</span>
        </div>
      </div>
    </div>
  )
}
