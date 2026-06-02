import { Link, useLocation } from 'react-router-dom'
import { gameState, navItems, menuItems, formatCash, clubStats } from '../data/mockData'

const allNavItems = [
  { id: 'home',     label: '主页总览', icon: 'ti-home',              path: '/'          },
  { id: 'players',  label: '球员管理', icon: 'ti-users',             path: '/players'   },
  { id: 'coaches',  label: '教练团队', icon: 'ti-whistle',           path: '/coaches'   },
  { id: 'schedule', label: '训练安排', icon: 'ti-calendar-week',     path: '/schedule'  },
  { id: 'facilities',label:'俱乐部设施',icon:'ti-building-community',path: '/facilities'},
  { id: 'events',   label: '赛事管理', icon: 'ti-trophy',            path: '/events'    },
  { id: 'finance',  label: '财务收支', icon: 'ti-chart-bar',         path: '/finance'   },
  { id: 'settings', label: '设置',     icon: 'ti-settings',          path: '/settings'  },
]

export default function Sidebar() {
  const { pathname } = useLocation()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-eyebrow">Tennis Club Manager</div>
        <div className="sidebar-club-name">{gameState.clubName}</div>
        <div className="sidebar-round">
          第 {gameState.year} 年 · 第 {gameState.week} 周 · {gameState.dayOfWeek}
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">导航</div>
        {allNavItems.map(item => (
          <Link
            key={item.id}
            to={item.path}
            className={`sidebar-nav-item ${pathname === item.path ? 'active' : ''}`}
          >
            <i className={`ti ${item.icon}`} aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="sidebar-next-week-btn"
          onClick={() => alert('下一周功能开发中…')}
        >
          <i className="ti ti-player-skip-forward" aria-hidden="true" />
          进入下一周
        </button>
      </div>
    </aside>
  )
}
