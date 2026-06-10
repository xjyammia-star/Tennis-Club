import { Link, useLocation } from 'react-router-dom'

// 移动端底部导航 5 个核心入口
// 其余页面（教练、招募、设施、财务、排名、经营）通过主页功能菜单或设置进入
// 每个图标下有文字标签，active 时高亮
const navItems = [
  { id: 'home',     label: '主页', icon: 'ti-home',          path: '/home'     },
  { id: 'players',  label: '球员', icon: 'ti-users',         path: '/players'  },
  { id: 'schedule', label: '训练', icon: 'ti-calendar-week', path: '/schedule' },
  { id: 'events',   label: '赛事', icon: 'ti-trophy',        path: '/events'   },
  { id: 'shop',     label: '装备', icon: 'ti-shopping-bag',  path: '/shop'     },
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
