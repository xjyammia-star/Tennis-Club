import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useGameCtx, manualSave } from '../App'

const navItems = [
  { id: 'home',     label: '主页', icon: 'ti-home',          path: '/home'     },
  { id: 'players',  label: '球员', icon: 'ti-users',         path: '/players'  },
  { id: 'schedule', label: '训练', icon: 'ti-calendar-week', path: '/schedule' },
  { id: 'events',   label: '赛事', icon: 'ti-trophy',        path: '/events'   },
]

// 更多菜单里的页面入口
const morePages = [
  { id: 'facilities',    label: '设施', icon: 'ti-building',      path: '/facilities'    },
  { id: 'coaches',       label: '教练', icon: 'ti-user-star',     path: '/coaches'       },
  { id: 'recruit',       label: '招募', icon: 'ti-user-plus',     path: '/recruit'       },
  { id: 'finance',       label: '财务', icon: 'ti-chart-bar',     path: '/finance'       },
  { id: 'rankings',      label: '排名', icon: 'ti-list-numbers',  path: '/rankings'      },
  { id: 'club-settings', label: '设置', icon: 'ti-adjustments',   path: '/club-settings' },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { state } = useGameCtx()
  const [showMore, setShowMore]   = useState(false)
  const [showSave, setShowSave]   = useState(false)
  const [showExit, setShowExit]   = useState(false)
  const [saveSlot, setSaveSlot]   = useState(1)
  const [saving,   setSaving]     = useState(false)
  const [saveMsg,  setSaveMsg]    = useState('')

  const moreActive = morePages.some(p => p.path === pathname)

  async function handleSave() {
    setSaving(true)
    await manualSave(state, saveSlot)
    setSaveMsg(`✓ 已保存到存档 ${saveSlot}`)
    setSaving(false)
    setTimeout(() => { setSaveMsg(''); setShowSave(false) }, 1200)
  }

  async function handleSaveExit() {
    setSaving(true)
    await manualSave(state, 1)
    setSaving(false)
    navigate('/landing')
  }

  return (
    <>
      <nav className="bottom-nav">
        {navItems.map(item => {
          const isActive = pathname === item.path
          return (
            <Link key={item.id} to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}>
              <i className={`ti ${item.icon}`} aria-hidden="true" />
              <span>{item.label}</span>
              <div className="nav-dot" />
            </Link>
          )
        })}

        {/* 更多按钮 */}
        <button
          className={`nav-item ${moreActive || showMore ? 'active' : ''}`}
          onClick={() => setShowMore(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <i className="ti ti-dots" aria-hidden="true" />
          <span>更多</span>
          <div className="nav-dot" />
        </button>
      </nav>

      {/* 更多菜单弹出层 */}
      {showMore && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 998,
            background: 'rgba(10,20,10,0.45)',
          }}
          onClick={() => setShowMore(false)}
        >
          <div
            style={{
              position: 'absolute', bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))',
              left: 0, right: 0,
              background: '#fff',
              borderRadius: '16px 16px 0 0',
              padding: '16px 16px 8px',
              boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* 页面入口网格 */}
            <div style={{ fontSize: 11, color: '#8a9688', letterSpacing: '0.08em', marginBottom: 10, textTransform: 'uppercase' }}>
              更多页面
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
              {morePages.map(p => (
                <Link key={p.id} to={p.path}
                  onClick={() => setShowMore(false)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    padding: '10px 4px',
                    background: pathname === p.path ? 'rgba(28,58,26,0.08)' : '#f0ece3',
                    borderRadius: 10,
                    color: pathname === p.path ? '#1c3a1a' : '#4a5a48',
                    textDecoration: 'none', fontSize: 11, fontWeight: 500,
                  }}
                >
                  <i className={`ti ${p.icon}`} style={{ fontSize: 20 }} />
                  {p.label}
                </Link>
              ))}
            </div>

            {/* 分隔线 */}
            <div style={{ height: 1, background: '#e8e2d6', margin: '0 -16px 12px' }} />

            {/* 保存 & 退出 */}
            <div style={{ fontSize: 11, color: '#8a9688', letterSpacing: '0.08em', marginBottom: 10, textTransform: 'uppercase' }}>
              游戏管理
            </div>
            <div style={{ display: 'flex', gap: 8, paddingBottom: 8 }}>
              <button
                onClick={() => { setShowMore(false); setShowSave(true) }}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '12px 0', borderRadius: 10, border: '1.5px solid #e8e2d6',
                  background: '#fff', color: '#1c3a1a', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <i className="ti ti-device-floppy" style={{ fontSize: 16 }} /> 保存进度
              </button>
              <button
                onClick={() => { setShowMore(false); setShowExit(true) }}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '12px 0', borderRadius: 10, border: '1.5px solid #e8e2d6',
                  background: '#fff', color: '#e05a2b', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <i className="ti ti-door-exit" style={{ fontSize: 16 }} /> 退出游戏
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 保存弹窗 */}
      {showSave && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999 }}
          onClick={() => setShowSave(false)}>
          <div style={{ background:'#fff',borderRadius:14,padding:'20px 24px',minWidth:240,maxWidth:300 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
              <span style={{ fontWeight:600, color:'#1a2a18' }}>选择存档槽位</span>
              <button style={{ background:'none',border:'none',fontSize:16,cursor:'pointer',color:'#8a9688' }}
                onClick={() => setShowSave(false)}>✕</button>
            </div>
            <div style={{ display:'flex',gap:8,marginBottom:12 }}>
              {[1,2,3].map(s => (
                <button key={s} onClick={() => setSaveSlot(s)}
                  style={{
                    flex:1, padding:'10px 0', borderRadius:8,
                    border: saveSlot===s ? '1.5px solid #c9a84c' : '1.5px solid #e8e2d6',
                    background: saveSlot===s ? '#f5edda' : '#fff',
                    cursor:'pointer', fontSize:13, fontWeight:500,
                    color: saveSlot===s ? '#1a2a18' : '#4a5a48',
                  }}>
                  存档 {s}
                </button>
              ))}
            </div>
            {saveMsg && <div style={{ fontSize:12,color:'#2e6e1a',marginBottom:8 }}>{saveMsg}</div>}
            <button
              onClick={handleSave} disabled={saving}
              style={{ width:'100%',padding:'11px 0',borderRadius:8,border:'none',background:'#1c3a1a',color:'#f5edda',fontSize:13,fontWeight:600,cursor:'pointer' }}>
              {saving ? '保存中…' : `保存到存档 ${saveSlot}`}
            </button>
          </div>
        </div>
      )}

      {/* 退出弹窗 */}
      {showExit && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999 }}
          onClick={() => setShowExit(false)}>
          <div style={{ background:'#fff',borderRadius:14,padding:'20px 24px',minWidth:240,maxWidth:300 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8 }}>
              <span style={{ fontWeight:600,color:'#1a2a18' }}>退出游戏</span>
              <button style={{ background:'none',border:'none',fontSize:16,cursor:'pointer',color:'#8a9688' }}
                onClick={() => setShowExit(false)}>✕</button>
            </div>
            <p style={{ fontSize:13,color:'#4a5a48',margin:'8px 0 16px',lineHeight:1.5 }}>
              是否在退出前保存当前进度？
            </p>
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              <button onClick={handleSaveExit} disabled={saving}
                style={{ width:'100%',padding:'11px 0',borderRadius:8,border:'none',background:'#1c3a1a',color:'#f5edda',fontSize:13,fontWeight:600,cursor:'pointer' }}>
                {saving ? '保存中…' : '💾 保存并退出'}
              </button>
              <button onClick={() => navigate('/landing')}
                style={{ width:'100%',padding:'11px 0',borderRadius:8,border:'1px solid #e8e2d6',background:'#fff',color:'#8a9688',fontSize:13,cursor:'pointer' }}>
                不保存，直接退出
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
