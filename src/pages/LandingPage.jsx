import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './LandingPage.module.css'

function getLocal(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}
function setLocal(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

const ADMIN_EMAIL    = 'admin@tennisclub.com'
const ADMIN_PASSWORD = 'admin888'

// ── 难度配置 ─────────────────────────────────────────
// ✅ 新增：三种难度的完整初始状态说明
const DIFFICULTY_CONFIG = {
  easy: {
    label:    '简单',
    icon:     'ti-leaf',
    color:    '#2a8a3a',
    tagColor: '#e8f5e2',
    desc:     '适合初次体验，资金充裕，更容易发展壮大',
    details: [
      { icon: 'ti-rectangle',     text: '6片普通硬地球场' },
      { icon: 'ti-currency-yen',  text: '起始资金 ¥50万' },
      { icon: 'ti-user-star',     text: '2名高级教练 + 1名普通教练' },
      { icon: 'ti-users',         text: '8名青少年球员（含2名天赋型）' },
      { icon: 'ti-building',      text: '健身房 + 会议室 + 更衣室' },
      { icon: 'ti-trending-up',   text: '经验值 +20%，伤病概率 -30%' },
    ],
  },
  normal: {
    label:    '普通',
    icon:     'ti-tennis',
    color:    '#c9a84c',
    tagColor: '#fef3d8',
    desc:     '平衡的游戏体验，需要合理规划经营策略',
    details: [
      { icon: 'ti-rectangle',     text: '4片普通硬地球场' },
      { icon: 'ti-currency-yen',  text: '起始资金 ¥20万' },
      { icon: 'ti-user-star',     text: '1名高级教练 + 2名普通教练' },
      { icon: 'ti-users',         text: '6名球员（结构混合）' },
      { icon: 'ti-building',      text: '健身房 + 会议室' },
      { icon: 'ti-trending-up',   text: '标准经验值和伤病概率' },
    ],
  },
  hard: {
    label:    '困难',
    icon:     'ti-flame',
    color:    '#c0392b',
    tagColor: '#fdecea',
    desc:     '挑战模式，资金紧张，需要精打细算才能生存',
    details: [
      { icon: 'ti-rectangle',     text: '2片普通硬地球场' },
      { icon: 'ti-currency-yen',  text: '起始资金 ¥8万 + 银行贷款 ¥5万/月' },
      { icon: 'ti-user-star',     text: '1名普通教练 + 1名助教' },
      { icon: 'ti-users',         text: '4名球员（天赋参差不齐）' },
      { icon: 'ti-building',      text: '仅有空地（需自行建设）' },
      { icon: 'ti-trending-up',   text: '经验值 -10%，伤病概率 +20%' },
    ],
  },
}

// ── 背景网球场线条 ────────────────────────────────────
function CourtLines() {
  return (
    <svg className={styles.courtSvg} viewBox="0 0 900 600" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="courtGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#c9a84c" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="80"  y="80"  width="740" height="440" fill="none" stroke="#c9a84c" strokeWidth="1.2" strokeOpacity="0.18" />
      <line x1="450" y1="80"  x2="450" y2="520" stroke="#c9a84c" strokeWidth="0.8" strokeOpacity="0.12" />
      <line x1="80"  y1="213" x2="820" y2="213" stroke="#c9a84c" strokeWidth="0.8" strokeOpacity="0.12" />
      <line x1="80"  y1="387" x2="820" y2="387" stroke="#c9a84c" strokeWidth="0.8" strokeOpacity="0.12" />
      <line x1="220" y1="213" x2="220" y2="387" stroke="#c9a84c" strokeWidth="0.8" strokeOpacity="0.12" />
      <line x1="680" y1="213" x2="680" y2="387" stroke="#c9a84c" strokeWidth="0.8" strokeOpacity="0.12" />
      <line x1="80"  y1="80"  x2="80"  y2="520" stroke="#c9a84c" strokeWidth="1.2" strokeOpacity="0.18" />
      <line x1="820" y1="80"  x2="820" y2="520" stroke="#c9a84c" strokeWidth="1.2" strokeOpacity="0.18" />
      <line x1="220" y1="80"  x2="220" y2="213" stroke="#c9a84c" strokeWidth="0.8" strokeOpacity="0.08" />
      <line x1="220" y1="387" x2="220" y2="520" stroke="#c9a84c" strokeWidth="0.8" strokeOpacity="0.08" />
      <line x1="680" y1="80"  x2="680" y2="213" stroke="#c9a84c" strokeWidth="0.8" strokeOpacity="0.08" />
      <line x1="680" y1="387" x2="680" y2="520" stroke="#c9a84c" strokeWidth="0.8" strokeOpacity="0.08" />
      <line x1="80"  y1="300" x2="820" y2="300" stroke="#c9a84c" strokeWidth="1.5" strokeOpacity="0.22" strokeDasharray="4 3" />
      <ellipse cx="450" cy="300" rx="320" ry="200" fill="url(#courtGlow)" />
    </svg>
  )
}

// ── 登录/注册弹窗 ─────────────────────────────────────
function AuthModal({ mode: initialMode, onClose, onSuccess }) {
  const [mode, setMode]       = useState(initialMode)
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
          const adminUser = { id: 'admin', email: ADMIN_EMAIL, username: '管理员', isAdmin: true }
          setLocal('tcm_user', adminUser)
          onSuccess(adminUser)
          return
        }
        const res  = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login', email, password }) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '登录失败')
        setLocal('tcm_user', data.user)
        onSuccess(data.user)
      } else {
        if (!username.trim()) { setError('请输入用户名'); setLoading(false); return }
        const res  = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'register', email, password, username }) })
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
            <button className={`${styles.authTab} ${mode === 'login'    ? styles.authTabActive : ''}`} onClick={() => { setMode('login');    setError('') }}>登录</button>
            <button className={`${styles.authTab} ${mode === 'register' ? styles.authTabActive : ''}`} onClick={() => { setMode('register'); setError('') }}>注册</button>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <form className={styles.authForm} onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className={styles.formGroup}>
              <label>用户名</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="你的游戏名称" maxLength={16} required />
            </div>
          )}
          <div className={styles.formGroup}>
            <label>邮箱</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
          </div>
          <div className={styles.formGroup}>
            <label>密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required />
          </div>
          {error && <div className={styles.authError}>{error}</div>}
          <button type="submit" className={styles.authSubmit} disabled={loading}>
            {loading ? '处理中…' : mode === 'login' ? '登录' : '创建账号'}
          </button>
        </form>
        <div className={styles.authFooter}>
          {mode === 'login'
            ? <span>还没有账号？<button onClick={() => { setMode('register'); setError('') }}>立即注册</button></span>
            : <span>已有账号？<button  onClick={() => { setMode('login');    setError('') }}>返回登录</button></span>
          }
        </div>
      </div>
    </div>
  )
}

// ── 存档列表弹窗 ──────────────────────────────────────
function SaveSlotsModal({ user, onClose, onLoad }) {
  const [saves,   setSaves]   = useState([null, null, null])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSaves() {
      try {
        const res  = await fetch(`/api/saves?userId=${user.id}`)
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
                onClick={() => save && onLoad(save)}
              >
                <div className={styles.saveSlotNum}>存档 {idx + 1}</div>
                {save ? (
                  <>
                    <div className={styles.saveClubName}>{save.club_name}</div>
                    <div className={styles.saveMeta}>
                      <span><i className="ti ti-calendar" /> 第 {save.current_year} 年 第 {save.current_week} 周</span>
                      <span><i className="ti ti-currency-yen" /> ¥{Number(save.funds).toLocaleString()}</span>
                    </div>
                    <div className={styles.saveDate}>{new Date(save.updated_at).toLocaleDateString('zh-CN')} 存档</div>
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

// ── 游戏说明弹窗 ──────────────────────────────────────
function GuideModal({ onClose }) {
  const sections = [
    { icon: 'ti-users',         title: '球员管理',   desc: '招募和培养球员，安排训练课程提升属性，关注疲劳和健康状态。天赋越高的球员成长上限越高。' },
    { icon: 'ti-presentation',  title: '教练团队',   desc: '聘请不同级别的教练，高级教练可提供更多经验加成。注意教练合同到期时间，避免人才流失。' },
    { icon: 'ti-trophy',        title: '赛事参与',   desc: '报名 ITF 或职业赛事，赢得积分和奖金。球员积分排名影响能参加的赛事级别。' },
    { icon: 'ti-building',      title: '设施建设',   desc: '升级训练设施提升训练效果，建设服务设施增加收入来源。设施需要定期缴纳维护费。' },
    { icon: 'ti-currency-yen',  title: '财务管理',   desc: '平衡收入（赛事奖金、赞助商、广告）和支出（教练薪资、设施维护、训练费用）。' },
    { icon: 'ti-calendar-week', title: '周次推进',   desc: '每周进行一次结算，自动计算训练效果、资金变化和随机事件。合理规划每周行动。' },
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

// ── ✅ 难度选择弹窗（新增）────────────────────────────
function DifficultyModal({ onClose, onConfirm }) {
  const [selected, setSelected] = useState('normal')
  const cfg = DIFFICULTY_CONFIG[selected]

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.diffModal} onClick={e => e.stopPropagation()}>
        <div className={styles.savesHeader}>
          <span className={styles.savesTitle}>选择难度</span>
          <button className={styles.closeBtn} onClick={onClose}><i className="ti ti-x" /></button>
        </div>

        <div className={styles.diffBody}>
          {/* 三个难度按钮 */}
          <div className={styles.diffTabs}>
            {Object.entries(DIFFICULTY_CONFIG).map(([key, d]) => (
              <button
                key={key}
                className={`${styles.diffTab} ${selected === key ? styles.diffTabActive : ''}`}
                style={selected === key ? { borderColor: d.color, color: d.color } : {}}
                onClick={() => setSelected(key)}
              >
                <i className={`ti ${d.icon}`} style={{ color: selected === key ? d.color : undefined }} />
                {d.label}
              </button>
            ))}
          </div>

          {/* 难度说明 */}
          <div className={styles.diffDesc} style={{ borderLeftColor: cfg.color }}>
            {cfg.desc}
          </div>

          {/* 初始条件列表 */}
          <div className={styles.diffDetails}>
            <div className={styles.diffDetailsTitle}>初始条件</div>
            {cfg.details.map((d, i) => (
              <div key={i} className={styles.diffDetailRow}>
                <i className={`ti ${d.icon}`} style={{ color: cfg.color }} aria-hidden="true" />
                <span>{d.text}</span>
              </div>
            ))}
          </div>

          {/* 难度标签 */}
          <div
            className={styles.diffBadge}
            style={{ background: cfg.tagColor, color: cfg.color }}
          >
            <i className={`ti ${cfg.icon}`} />
            已选择：{cfg.label}难度
          </div>
        </div>

        <div className={styles.diffFooter}>
          <button className={styles.btnCancel} onClick={onClose}>取消</button>
          <button
            className={styles.btnStartGame}
            style={{ background: cfg.color }}
            onClick={() => onConfirm(selected)}
          >
            <i className="ti ti-arrow-right" /> 开始游戏
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 管理员面板弹窗 ────────────────────────────────────
function AdminModal({ onClose }) {
  const [users,       setUsers]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [resetTarget, setResetTarget] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [msg,         setMsg]         = useState('')

  useEffect(() => {
    fetch('/api/auth?action=list')
      .then(r => r.json())
      .then(d => { setUsers(d.users || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleReset(userId) {
    if (!newPassword.trim()) { setMsg('请输入新密码'); return }
    const res  = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resetPassword', userId, newPassword }) })
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
            <input type="password" placeholder="输入新密码（最少6位）" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={styles.resetInput} />
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

// ── 主界面 ────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()
  const [user,  setUser]  = useState(() => getLocal('tcm_user'))
  const [modal, setModal] = useState(null)

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

  // ✅ 开始游戏：先弹难度选择，再跳转
  function handleNewGame() {
    if (!user) { setModal('login'); return }
    setModal('difficulty')
  }

  // ✅ 难度选择确认后：把难度存入 state 初始化参数，跳转游戏
  function handleDifficultyConfirm(difficulty) {
    setLocal('tcm_new_game_difficulty', difficulty)
    setModal(null)
    navigate('/home')
  }

  return (
    <div className={styles.landing}>
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
              <button className={styles.adminBtn} onClick={() => setModal('admin')}>管理员</button>
            )}
            <button className={styles.logoutBtn} onClick={handleLogout}>退出</button>
          </div>
        ) : (
          <div className={styles.authBtns}>
            <button className={styles.loginBtn}    onClick={() => setModal('login')}>登录</button>
            <button className={styles.registerBtn} onClick={() => setModal('register')}>注册</button>
          </div>
        )}
      </div>

      {/* 中央标题 */}
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

      {/* ✅ 右下角菜单：删掉「游戏设置」，保留三个按钮 */}
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
      </div>

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
      {/* ✅ 新增难度选择弹窗 */}
      {modal === 'difficulty' && (
        <DifficultyModal onClose={() => setModal(null)} onConfirm={handleDifficultyConfirm} />
      )}
      {modal === 'admin' && user?.isAdmin && (
        <AdminModal onClose={() => setModal(null)} />
      )}
    </div>
  )
}
