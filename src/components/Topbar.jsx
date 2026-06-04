import { useLocation } from 'react-router-dom'

const pageTitles = {
  '/home':          '主页总览',
  '/players':       '球员管理',
  '/coaches':       '教练团队',
  '/recruit':       '招募市场',
  '/schedule':      '训练安排',
  '/facilities':    '俱乐部设施',
  '/events':        '赛事管理',
  '/finance':       '财务收支',
  '/rankings':      '世界排名',
  '/club-settings': '俱乐部经营',
  '/settings':      '设置',
}

export default function Topbar() {
  const { pathname } = useLocation()

  return (
    <div className="topbar">
      <div className="topbar-title">{pageTitles[pathname] || '网球俱乐部经营'}</div>
    </div>
  )
}
