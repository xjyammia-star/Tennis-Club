import { Link, useLocation } from 'react-router-dom'

const navItems = [
  { id: 'home',          label: '主页', icon: 'ti-home',          path: '/home'          },
  { id: 'players',       label: '球员', icon: 'ti-users',         path: '/players'       },
  { id: 'rankings',      label: '排名', icon: 'ti-list-numbers',  path: '/rankings'      },  // ✅ 新增（替换赛事，赛事移到侧边栏）
  { id: 'finance',       label: '财务', icon: 'ti-chart-bar',     path: '/finance'       },
  { id: 'club-settings', label: '经营', icon: 'ti-adjustments',   path: '/club-settings' },
]

export default function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav className="bottom-nav">
      {navItems.map(item => {
        const isActive = pathname === item.path
        return (
          <Link
            key={item.id}
            to={item.path}
            className={`nav-item ${isActive ? 'active' : ''}`}
          >
            <i className={`ti ${item.icon}`} aria-hidden="true" />
            <span>{item.label}</span>
            <div className="nav-dot" />
          </Link>
        )
      })}
    </nav>
  )
}
