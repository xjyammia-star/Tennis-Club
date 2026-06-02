import { Link, useLocation } from 'react-router-dom'
import { navItems } from '../data/mockData'

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
