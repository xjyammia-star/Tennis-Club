import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useGameCtx, manualSave } from '../App'
import { useState } from 'react'

const allNavItems = [
  { id: 'home',          label: '主页总览',   icon: 'ti-home',          path: '/home'          },
  { id: 'players',       label: '球员管理',   icon: 'ti-users',         path: '/players'       },
  { id: 'coaches',       label: '教练团队',   icon: 'ti-user-star',     path: '/coaches'       },
  { id: 'recruit',       label: '招募市场',   icon: 'ti-user-plus',     path: '/recruit'       },
  { id: 'schedule',      label: '训练安排',   icon: 'ti-calendar-week', path: '/schedule'      },
  { id: 'facilities',    label: '俱乐部设施', icon: 'ti-building',      path: '/facilities'    },
  { id: 'events',        label: '赛事管理',   icon: 'ti-trophy',        path: '/events'        },
  { id: 'rankings',      label: '世界排名',   icon: 'ti-list-numbers',  path: '/rankings'      },  // ✅ 新增
  { id: 'finance',       label: '财务收支',   icon: 'ti-chart-bar',     path: '/finance'       },
  { id: 'club-settings', label: '俱乐部设置', icon: 'ti-adjustments',   path: '/club-settings' },
]

export default function Sidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { state, advanceWeek, advancing } = useGameCtx()
  const { gameState } = state
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  async function handleSaveAndExit() {
    setSaving(true)
    await manualSave(state, 1)
    setSaving(false)
    setSaveMsg('已保存')
    setTimeout(() => { setSaveMsg(''); navigate('/landing') }, 800)
  }

  async function handleManualSave() {
    setSaving(true)
    await manualSave(state, 1)
    setSaving(false)
    setSaveMsg('✓ 已保存')
    setTimeout(() => setSaveMsg(''), 2000)
  }

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
          onClick={advanceWeek}
          disabled={advancing}
        >
          <i className="ti ti-arrow-right" aria-hidden="true" />
          {advancing ? '结算中...' : '进入下一周'}
        </button>
        <div className="sidebar-actions">
          <button className="sidebar-save-btn" onClick={handleManualSave} disabled={saving}>
            <i className="ti ti-device-floppy" aria-hidden="true" />
            {saveMsg || '保存进度'}
          </button>
          <button className="sidebar-exit-btn" onClick={handleSaveAndExit} disabled={saving}>
            <i className="ti ti-door-exit" aria-hidden="true" />
            保存并退出
          </button>
        </div>
      </div>
    </aside>
  )
}
