import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useGameCtx, manualSave } from '../App'
import { useState } from 'react'

// ── 存档槽位选择弹窗 ──────────────────────────────────
function SaveSlotModal({ onClose, onSave }) {
  const [slot, setSlot] = useState(1)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleSave() {
    setSaving(true)
    await onSave(slot)
    setMsg(`✓ 已保存到存档 ${slot}`)
    setSaving(false)
    setTimeout(onClose, 1000)
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={modalHeader}>
          <span style={{fontWeight:600,color:'var(--ink)'}}>选择存档槽位</span>
          <button style={closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{display:'flex',gap:8,margin:'12px 0'}}>
          {[1,2,3].map(s => (
            <button key={s} onClick={() => setSlot(s)}
              style={{...slotBtn, ...(slot===s ? slotBtnActive : {})}}>
              存档 {s}
            </button>
          ))}
        </div>
        {msg && <div style={{fontSize:12,color:'#2e6e1a',marginBottom:8}}>{msg}</div>}
        <button style={confirmBtn} onClick={handleSave} disabled={saving}>
          {saving ? '保存中…' : `保存到存档 ${slot}`}
        </button>
      </div>
    </div>
  )
}

// ── 退出游戏弹窗 ──────────────────────────────────────
function ExitModal({ onClose, onSaveExit, onExit }) {
  const [saving, setSaving] = useState(false)

  async function handleSaveExit() {
    setSaving(true)
    await onSaveExit()
    setSaving(false)
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={modalHeader}>
          <span style={{fontWeight:600,color:'var(--ink)'}}>退出游戏</span>
          <button style={closeBtn} onClick={onClose}>✕</button>
        </div>
        <p style={{fontSize:13,color:'var(--ink-mid)',margin:'10px 0 16px'}}>
          是否在退出前保存当前进度？
        </p>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <button style={confirmBtn} onClick={handleSaveExit} disabled={saving}>
            {saving ? '保存中…' : '💾 保存并退出'}
          </button>
          <button style={cancelBtn} onClick={onExit}>
            不保存，直接退出
          </button>
        </div>
      </div>
    </div>
  )
}

// 弹窗样式（inline，不依赖 CSS Module）
const overlay = {
  position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',
  display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999
}
const modal = {
  background:'#fff',borderRadius:14,padding:'20px 24px',
  minWidth:220,maxWidth:300,boxShadow:'0 8px 32px rgba(0,0,0,0.18)'
}
const modalHeader = {
  display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4
}
const closeBtn = {
  background:'none',border:'none',fontSize:16,cursor:'pointer',color:'#8a9688',padding:'0 4px'
}
const slotBtn = {
  flex:1,padding:'10px 0',borderRadius:8,border:'1.5px solid var(--cream-dark)',
  background:'var(--white)',cursor:'pointer',fontSize:13,fontWeight:500,
  color:'var(--ink-mid)',transition:'all 0.15s'
}
const slotBtnActive = {
  borderColor:'var(--gold)',background:'#f5edda',color:'var(--ink)'
}
const confirmBtn = {
  width:'100%',padding:'10px 0',borderRadius:8,border:'none',
  background:'var(--forest)',color:'var(--gold-pale)',
  fontSize:13,fontWeight:500,cursor:'pointer'
}
const cancelBtn = {
  width:'100%',padding:'10px 0',borderRadius:8,
  border:'1px solid var(--cream-dark)',background:'var(--white)',
  color:'var(--ink-muted)',fontSize:13,cursor:'pointer'
}

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
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)

  async function handleSave(slot) {
    await manualSave(state, slot)
  }

  async function handleSaveAndExit() {
    await manualSave(state, 1)
    navigate('/landing')
  }

  function handleExit() {
    navigate('/landing')
  }

  return (
    <>
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
          <button className="sidebar-save-btn" onClick={() => setShowSaveModal(true)}>
            <i className="ti ti-device-floppy" aria-hidden="true" />
            保存进度
          </button>
          <button className="sidebar-exit-btn" onClick={() => setShowExitModal(true)}>
            <i className="ti ti-door-exit" aria-hidden="true" />
            退出游戏
          </button>
        </div>
      </div>
    </aside>

    {showSaveModal && (
      <SaveSlotModal
        onClose={() => setShowSaveModal(false)}
        onSave={handleSave}
      />
    )}
    {showExitModal && (
      <ExitModal
        onClose={() => setShowExitModal(false)}
        onSaveExit={handleSaveAndExit}
        onExit={handleExit}
      />
    )}
    </>
  )
}
