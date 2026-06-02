import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './LandingPage.module.css'

// ─────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────
function getLocal(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}
function setLocal(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

const ADMIN_EMAIL = 'admin@tennisclub.com'
const ADMIN_PASSWORD = 'admin888'

// ─────────────────────────────────────────────
// 粒子背景
// ─────────────────────────────────────────────
function CourtLines() {
  return (
    <svg className={styles.courtSvg} viewBox="0 0 900 600" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="courtGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* 外框 */}
      <rect x="80" y="80" width="740" height="440" fill="none" stroke="#c9a84c" strokeWidth="1.2" strokeOpacity="0.18" />
      {/* 中线 */}
      <line x1="450" y1="80" x2="450" y2="520" stroke="#c9a84c" strokeWidth="0.8" strokeOpacity="0.12" />
      {/* 发球区横线 */}
      <line x1="80" y1="213" x2="820" y2="213" stroke="#c9a84c" strokeWidth="0.8" strokeOpacity="0.12" />
      <line x1="80" y1="387" x2="820" y2="387" stroke="#c9a84c" strokeWidth="0.8" strokeOpacity="0.12" />
      {/* 发球区中线 */}
      <line x1="220" y1="213" x2="220" y2="387" stroke="#c9a84c" strokeWidth="0.8" strokeOpacity="0.12" />
      <line x1="680" y1="213" x2="680" y2="387" stroke="#c9a84c" strokeWidth="0.8" strokeOpacity="0.12" />
      {/* 底线延伸 */}
      <line x1="80" y1="80" x2="80" y2="520" stroke="#c9a84c" strokeWidth="1.2" strokeOpacity="0.18" />
      <line x1="820" y1="80" x2="820" y2="520" stroke="#c9a84c" strokeWidth="1.2" strokeOpacity="0.18" />
      {/* 发球区竖线 */}
      <line x1="220" y1="80" x2="220" y2="213" stroke="#c9a84c" strokeWidth="0.8" strokeOpacity="0.08" />
      <line x1="220" y1="387" x2="220" y2="520" stroke="#c9a84c" strokeWidth="0.8" strokeOpacity="0.08" />
      <line x1="680" y1="80" x2="680" y2="213" stroke="#c9a84c" strokeWidth="0.8" strokeOpacity="0.08" />
      <line x1="680" y1="387" x2="680" y2="520" stroke="#c9a84c" strokeWidth="0.8" strokeOpacity="0.08" />
      {/* 网 */}
      <line x1="80" y1="300" x2="820" y2="300" stroke="#c9a84c" strokeWidth="1.5" strokeOpacity="0.22" strokeDasharray="4 3" />
      {/* 光晕 */}
      <ellipse cx="450" cy="300" rx="320" ry="200" fill="url(#courtGlow)" />
    </svg>
  )
}

// ─────────────────────────────────────────────
// 登录/注册 弹窗
// ─────────────────────────────────────────────
function AuthModal({ mode: initialMode, onClose, onSuccess }) {
  const [mode, setMode] = useState(initialMode) // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        // 管理员特殊登录
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
          const adminUser = { id: 'admin', email: ADMIN_EMAIL, username: '管理员', isAdmin: true }
          setLocal('tcm_user', adminUser)
          onSuccess(adminUser)
          return
        }
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', email, password })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '登录失败')
        setLocal('tcm_user', data.user)
        onSuccess(data.user)
      } else {
        if (!username.trim()) { setError('请输入用户名'); setLoading(false); return }
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'register', email, password, username })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '注册失败')
        setLocal('tcm_user', data.user)
        onSuccess(data.user)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.authModal} onClick={e => e.stopPropagation()}>
        <div className={styles.authHeader}>
          <div className={styles.authTabs}>
            <button
              className={`${styles.authTab} ${mode === 'login' ? styles.authTabActive : ''}`}
              onClick={() => { setMode('login'); setError('') }}
            >登录</button>
            <button
              className={`${styles.authTab} ${mode === 'register' ? styles.authTabActive : ''}`}
              onClick={() => { setMode('register'); setError('') }}
            >注册</button>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><i className="ti ti-x" /></button>
        </div>

        <form className={styles.authForm} onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className={styles.formGroup}>
              <label>用户名</label>
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="你的游戏名称" maxLength={16} required
              />
            </div>
          )}
          <div className={styles.formGroup}>
            <label>邮箱</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required
            />
          </div>
          <div className={styles.formGroup}>
            <label>密码</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" minLength={6} required
            />
          </div>
          {error && <div className={styles.authError}>{error}</div>}
          <button type="submit" className={styles.authSubmit} disabled={loading}>
            {loading ? '处理中…' : mode === 'login' ? '登录' : '创建账号'}
          </button>
        </form>

        <div className={styles.authFooter}>
          {mode === 'login'
            ? <span>还没有账号？<button onClick={() => { setMode('register'); setError('') }}>立即注册</button></span>
            : <span>已有账号？<button onClick={() => { setMode('login'); setError('') }}>返回登录</button></span>
          }
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 存档列表弹窗
// ─────────────────────────────────────────────
function SaveSlotsModal({ user, onClose, onLoad }) {
  const [saves, setSaves] = useState([null, null, null])
  const [loading, setLoading] = useState(true)
  const [confirmOverwrite, setConfirmOverwrite] = useState(null)

  useEffect(() => {
    async function fetchSaves() {
      try {
        const res = await fetch(`/api/saves?userId=${user.id}`)
        const data = await res.json()
        const slots = [null, null, null]
        if (data.saves) {
          data.saves.forEach(s => { if (s.slot >= 1 && s.slot <= 3) slots[s.slot - 1] = s })
        }
        setSaves(slots)
      } catch {
        setSaves([null, null, null])
      } finally {
        setLoading(false)
      }
    }
    fetchSaves()
  }, [user.id])

  function handleSlotClick(idx, save) {
    if (save) {
      onLoad(save)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.savesModal} onClick={e => e.stopPropagation()}>
        <div className={styles.savesHeader}>
          <span className={styles.savesTitle}>选择存档</span>
          <button className={styles.closeBtn} onClick={onClose}><i className="ti ti-x" /></button>
        </div>

        {loading ? (
          <div className={styles.savesLoading}>读取存档中…</div>
        ) : (
          <div className={styles.saveSlots}>
            {saves.map((save, idx) => (
              <div
                key={idx}
                className={`${styles.saveSlot} ${save ? styles.saveSlotFilled : styles.saveSlotEmpty}`}
                onClick={() => handleSlotClick(idx, save)}
              >
                <div className={styles.saveSlotNum}>存档 {idx + 1}</div>
                {save ? (
                  <>
                    <div className={styles.saveClubName}>{save.club_name}</div>
                    <div className={styles.saveMeta}>
                      <span><i className="ti ti-calendar" /> 第 {save.current_year} 年 第 {save.current_week} 周</span>
                      <span><i className="ti ti-currency-yen" /> ¥{Number(save.funds).toLocaleString()}</span>
                    </div>
                    <div className={styles.saveDate}>
                      {new Date(save.updated_at).toLocaleDateString('zh-CN')} 存档
                    </div>
                    <button className={styles.loadBtn}>继续游戏 <i className="ti ti-arrow-right" /></button>
                  </>
                ) : (
                  <div className={styles.emptySlot}>
                    <i className="ti ti-plus" />
                    <span>空存档</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 游戏说明弹窗
// ─────────────────────────────────────────────
function GuideModal({ onClose }) {
  const sections = [
    { icon: 'ti-users', title: '球员管理', desc: '招募和培养球员，安排训练课程提升属性，关注疲劳和健康状态。天赋越高的球员成长上限越高。' },
    { icon: 'ti-presentation', title: '教练团队', desc: '聘请不同级别的教练，高级教练可提供更多经验加成。注意教练合同到期时间，避免人才流失。' },
    { icon: 'ti-trophy', title: '赛事参与', desc: '报名 ITF 或职业赛事，赢得积分和奖金。球员积分排名影响能参加的赛事级别。' },
    { icon: 'ti-building', title: '设施建设', desc: '升级训练设施提升训练效果，建设服务设施增加收入来源。设施需要定期缴纳维护费。' },
    { icon: 'ti-currency-yen', title: '财务管理', desc: '平衡收入（赛事奖金、赞助商、广告）和支出（教练薪资、设施维护、训练费用）。' },
    { icon: 'ti-calendar-week', title: '周次推进', desc: '每周进行一次结算，自动计算训练效果、资金变化和随机事件。合理规划每周行动。' },
  ]
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.guideModal} onClick={e => e.stopPropagation()}>
        <div className={styles.savesHeader}>
          <span className={styles.savesTitle}>游戏说明</span>
          <button className={styles.closeBtn} onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div className={styles.guideBody}>
          {sections.map((s, i) => (
            <div key={i} className={styles.guideItem}>
              <div className={styles.guideIcon}><i className={`ti ${s.icon}`} /></div>
              <div>
                <div className={styles.guideTitle}>{s.title}</div>
                <div className={styles.guideDesc}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 游戏设置弹窗
// ─────────────────────────────────────────────
function GameSettingsModal({ onClose }) {
  const [notifyFatigue, setNotifyFatigue]   = useState(() => getLocal('tcm_notify_fatigue') ?? true)
  const [notifyContract, setNotifyContract] = useState(() => getLocal('tcm_notify_contract') ?? true)
  const [notifyEvent, setNotifyEvent]       = useState(() => getLocal('tcm_notify_event') ?? true)
  const [notifyRandom, setNotifyRandom]     = useState(() => getLocal('tcm_notify_random') ?? true)
  const [autoAdvance, setAutoAdvance]       = useState(() => getLocal('tcm_auto_advance') ?? false)
  const [showHidden, setShowHidden]         = useState(() => getLocal('tcm_show_hidden') ?? false)

  function saveSettings() {
    setLocal('tcm_notify_fatigue', notifyFatigue)
    setLocal('tcm_notify_contract', notifyContract)
    setLocal('tcm_notify_event', notifyEvent)
    setLocal('tcm_notify_random', notifyRandom)
    setLocal('tcm_auto_advance', autoAdvance)
    setLocal('tcm_show_hidden', showHidden)
    onClose()
  }

  function Toggle({ value, onChange }) {
    return (
      <button
        className={`${styles.toggle} ${value ? styles.toggleOn : ''}`}
        onClick={() => onChange(!value)}
        type="button"
      >
        <span className={styles.toggleThumb} />
      </button>
    )
  }

  const items = [
    { label: '疲劳度预警', desc: '球员疲劳 ≥ 70 时提示', value: notifyFatigue, onChange: setNotifyFatigue },
    { label: '合同到期提醒', desc: '教练合同剩余 ≤ 16 周时提示', value: notifyContract, onChange: setNotifyContract },
    { label: '赛事开始提醒', desc: '赛事开赛前 4 周提示', value: notifyEvent, onChange: setNotifyEvent },
    { label: '随机事件通知', desc: '有新随机事件时显示提示', value: notifyRandom, onChange: setNotifyRandom },
    { label: '自动推进周次', desc: '每次操作后自动进入下一周（慎用）', value: autoAdvance, onChange: setAutoAdvance },
    { label: '显示隐藏属性', desc: '在球员详情中展示天赋数值', value: showHidden, onChange: setShowHidden },
  ]

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.settingsModal} onClick={e => e.stopPropagation()}>
        <div className={styles.savesHeader}>
          <span className={styles.savesTitle}>游戏设置</span>
          <button className={styles.closeBtn} onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div className={styles.settingsList}>
          {items.map((item, i) => (
            <div key={i} className={styles.settingsRow}>
              <div>
                <div className={styles.settingsLabel}>{item.label}</div>
                <div className={styles.settingsDesc}>{item.desc}</div>
              </div>
              <Toggle value={item.value} onChange={item.onChange} />
            </div>
          ))}
        </div>
        <div className={styles.settingsFooter}>
          <button className={styles.saveSettingsBtn} onClick={saveSettings}>保存设置</button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 管理员面板弹窗
// ─────────────────────────────────────────────
function AdminModal({ onClose }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [resetTarget, setResetTarget] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/auth?action=list')
      .then(r => r.json())
      .then(d => { setUsers(d.users || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleReset(userId) {
    if (!newPassword.trim()) { setMsg('请输入新密码'); return }
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resetPassword', userId, newPassword })
    })
    const data = await res.json()
    setMsg(res.ok ? '密码已重置' : data.error || '操作失败')
    setResetTarget(null)
    setNewPassword('')
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.adminModal} onClick={e => e.stopPropagation()}>
        <div className={styles.savesHeader}>
          <span className={styles.savesTitle}>管理员面板</span>
          <button className={styles.closeBtn} onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        {msg && <div className={styles.adminMsg}>{msg}</div>}
        {loading ? <div className={styles.savesLoading}>加载中…</div> : (
          <div className={styles.adminList}>
            <div className={styles.adminListHeader}>
              <span>用户名</span><span>邮箱</span><span>注册时间</span><span>操作</span>
            </div>
            {users.map(u => (
              <div key={u.id} className={styles.adminRow}>
                <span>{u.username}</span>
                <span>{u.email}</span>
                <span>{new Date(u.created_at).toLocaleDateString('zh-CN')}</span>
                <button className={styles.resetBtn} onClick={() => setResetTarget(u.id)}>重置密码</button>
              </div>
            ))}
            {users.length === 0 && <div className={styles.savesLoading}>暂无注册用户</div>}
          </div>
        )}
        {resetTarget && (
          <div className={styles.resetForm}>
            <input
              type="password" placeholder="输入新密码（最少6位）"
              value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className={styles.resetInput}
            />
            <div className={styles.resetActions}>
              <button className={styles.btnCancel} onClick={() => { setResetTarget(null); setNewPassword('') }}>取消</button>
              <button className={styles.authSubmit} onClick={() => handleReset(resetTarget)}>确认重置</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 主界面
// ─────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(() => getLocal('tcm_user'))
  const [modal, setModal] = useState(null) // 'login'|'register'|'saves'|'guide'|'settings'|'admin'

  function handleAuthSuccess(u) {
    setUser(u)
    setModal(null)
  }

  function handleLogout() {
    localStorage.removeItem('tcm_user')
    setUser(null)
  }

  function handleLoadSave(save) {
    setLocal('tcm_current_save', save)
    navigate('/home')
  }

  function handleNewGame() {
    if (!user) { setModal('login'); return }
    setLocal('tcm_current_save', null)
    navigate('/home')
  }

  return (
    <div className={styles.landing}>
      {/* 背景层 */}
      <div className={styles.bg} />
      <CourtLines />
      <div className={styles.vignette} />

      {/* 右上角 登录/用户信息 */}
      <div className={styles.topRight}>
        {user ? (
          <div className={styles.userChip}>
            <i className="ti ti-user" />
            <span>{user.username}</span>
            {user.isAdmin && (
              <button className={styles.adminBtn} onClick={() => setModal('admin')}>
                管理员
              </button>
            )}
            <button className={styles.logoutBtn} onClick={handleLogout}>退出</button>
          </div>
        ) : (
          <div className={styles.authBtns}>
            <button className={styles.loginBtn} onClick={() => setModal('login')}>登录</button>
            <button className={styles.registerBtn} onClick={() => setModal('register')}>注册</button>
          </div>
        )}
      </div>

      {/* 中央标题区 */}
      <div className={styles.hero}>
        <div className={styles.heroEyebrow}>TENNIS CLUB MANAGER</div>
        <h1 className={styles.heroTitle}>
          <span>网球</span>
          <span className={styles.heroTitleGold}>俱乐部</span>
        </h1>
        <div className={styles.heroSubtitle}>经营模拟游戏</div>
        <div className={styles.heroDivider}>
          <span /><i className="ti ti-trophy" /><span />
        </div>
      </div>

      {/* 右下角菜单 */}
      <div className={styles.menuGroup}>
        <button className={styles.menuBtn} onClick={handleNewGame}>
          <span>开始游戏</span>
          <i className="ti ti-arrow-right" />
        </button>
        <button
          className={`${styles.menuBtn} ${styles.menuBtnSecondary}`}
          onClick={() => { if (!user) { setModal('login'); return } setModal('saves') }}
        >
          <span>继续游戏</span>
          <i className="ti ti-arrow-right" />
        </button>
        <button
          className={`${styles.menuBtn} ${styles.menuBtnGhost}`}
          onClick={() => setModal('guide')}
        >
          <span>游戏说明</span>
          <i className="ti ti-info-circle" />
        </button>
        <button
          className={`${styles.menuBtn} ${styles.menuBtnGhost}`}
          onClick={() => setModal('settings')}
        >
          <span>游戏设置</span>
          <i className="ti ti-settings" />
        </button>
      </div>

      {/* 版本信息 */}
      <div className={styles.version}>v0.1.0 Beta · React · Vite · Neon</div>

      {/* 弹窗 */}
      {(modal === 'login' || modal === 'register') && (
        <AuthModal mode={modal} onClose={() => setModal(null)} onSuccess={handleAuthSuccess} />
      )}
      {modal === 'saves' && user && (
        <SaveSlotsModal user={user} onClose={() => setModal(null)} onLoad={handleLoadSave} />
      )}
      {modal === 'guide' && (
        <GuideModal onClose={() => setModal(null)} />
      )}
      {modal === 'settings' && (
        <GameSettingsModal onClose={() => setModal(null)} />
      )}
      {modal === 'admin' && user?.isAdmin && (
        <AdminModal onClose={() => setModal(null)} />
      )}
    </div>
  )
}
