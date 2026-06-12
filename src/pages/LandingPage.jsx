import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildInitialState } from '../data/difficultyConfig'
import GameInitAnimation from '../components/GameInitAnimation'
import styles from './LandingPage.module.css'

function getLocal(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}
function setLocal(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

const ADMIN_EMAIL    = 'xjheinz@qq.com'

// ── 难度配置 ─────────────────────────────────────────
const DIFFICULTY_CONFIG = {
  hard: {
    label:    '困难',
    icon:     'ti-flame',
    color:    '#c0392b',
    tagColor: '#fdecea',
    desc:     '挑战模式：小型俱乐部起步，资金紧张，贷款压力大，需要精打细算才能生存',
    details: [
      { icon: 'ti-rectangle',    text: '4片糟糕级硬地球场' },
      { icon: 'ti-building',     text: '糟糕级更衣室 + 糟糕级健身房' },
      { icon: 'ti-users',        text: '6名随机青少年球员' },
      { icon: 'ti-user-star',    text: '1名助教 + 1名普通教练' },
      { icon: 'ti-currency-yen', text: '现金 ¥10万 · 银行贷款 ¥5000/月' },
      { icon: 'ti-star',         text: '俱乐部声望 0' },
    ],
  },
  normal: {
    label:    '普通',
    icon:     'ti-tennis',
    color:    '#c9a84c',
    tagColor: '#fef3d8',
    desc:     '标准模式：中型俱乐部，资金适中，需要合理规划经营策略逐步壮大',
    details: [
      { icon: 'ti-rectangle',    text: '6片普通级硬地球场' },
      { icon: 'ti-building',     text: '普通级更衣室 + 健身房 + 休息室' },
      { icon: 'ti-users',        text: '12名随机青少年球员' },
      { icon: 'ti-user-star',    text: '2名助教 + 2名普通教练' },
      { icon: 'ti-currency-yen', text: '现金 ¥20万 · 无贷款' },
      { icon: 'ti-star',         text: '俱乐部声望 1000' },
    ],
  },
  easy: {
    label:    '简单',
    icon:     'ti-leaf',
    color:    '#2a8a3a',
    tagColor: '#e8f5e2',
    desc:     '体验模式：中型俱乐部，资金充裕，设施完善，更容易发展壮大',
    details: [
      { icon: 'ti-rectangle',    text: '6片普通硬地 + 2片普通红土球场' },
      { icon: 'ti-building',     text: '普通级更衣室 + 健身房 + 休息室 + 宿舍' },
      { icon: 'ti-users',        text: '16名随机青少年球员' },
      { icon: 'ti-user-star',    text: '2名助教 + 3名普通教练 + 1名高级教练' },
      { icon: 'ti-currency-yen', text: '现金 ¥50万 · 无贷款' },
      { icon: 'ti-star',         text: '俱乐部声望 3000' },
    ],
  },
}

// ── 游戏年限配置 ──────────────────────────────────────
const DURATION_OPTIONS = [
  { value: 10, label: '10年', desc: '快速体验' },
  { value: 20, label: '20年', desc: '标准流程' },
  { value: 30, label: '30年', desc: '深度经营' },
]

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
  const [mode, setMode]         = useState(initialMode)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const res  = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login', email, password }) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '登录失败')
        // ✅ 如果是管理员邮箱，附加 isAdmin 标记
        const user = { ...data.user, isAdmin: data.user.email === ADMIN_EMAIL }
        setLocal('tcm_user', user)
        onSuccess(user)
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
            <button className={`${styles.authTab} ${mode==='login'    ? styles.authTabActive:''}`} onClick={() => { setMode('login');    setError('') }}>登录</button>
            <button className={`${styles.authTab} ${mode==='register' ? styles.authTabActive:''}`} onClick={() => { setMode('register'); setError('') }}>注册</button>
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
                onClick={() => save && onLoad(save.slot)}
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

// ── 难度选择弹窗（含游戏年限 + 俱乐部名称）────────────
function DifficultyModal({ onClose, onConfirm }) {
  const [step, setStep]         = useState(1)   // step1: 难度/年限  step2: 俱乐部名称
  const [selected, setSelected] = useState('normal')
  const [duration, setDuration] = useState(20)
  const [clubName, setClubName] = useState('')
  const cfg = DIFFICULTY_CONFIG[selected]

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.diffModal} onClick={e => e.stopPropagation()}>
        <div className={styles.savesHeader}>
          <span className={styles.savesTitle}>{step === 1 ? '新游戏设置' : '俱乐部名称'}</span>
          <button className={styles.closeBtn} onClick={onClose}><i className="ti ti-x" /></button>
        </div>

        {step === 1 ? (
          <div className={styles.diffBody}>
            {/* 难度选择 */}
            <div className={styles.diffSectionLabel}>选择难度</div>
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

            {/* 初始条件 */}
            <div className={styles.diffDetails}>
              <div className={styles.diffDetailsTitle}>初始条件</div>
              {cfg.details.map((d, i) => (
                <div key={i} className={styles.diffDetailRow}>
                  <i className={`ti ${d.icon}`} style={{ color: cfg.color }} aria-hidden="true" />
                  <span>{d.text}</span>
                </div>
              ))}
            </div>

            {/* 游戏年限选择 */}
            <div className={styles.diffSectionLabel} style={{ marginTop: 16 }}>游戏年限</div>
            <div className={styles.durationRow}>
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`${styles.durationBtn} ${duration === opt.value ? styles.durationBtnActive : ''}`}
                  onClick={() => setDuration(opt.value)}
                >
                  <span className={styles.durationLabel}>{opt.label}</span>
                  <span className={styles.durationDesc}>{opt.desc}</span>
                </button>
              ))}
            </div>
            <div className={styles.durationNote}>
              <i className="ti ti-info-circle" aria-hidden="true" />
              游戏将在第 {1 + duration} 年结束，届时根据俱乐部综合评分判定最终成绩
            </div>

            {/* 已选摘要 */}
            <div className={styles.diffBadge} style={{ background: cfg.tagColor, color: cfg.color }}>
              <i className={`ti ${cfg.icon}`} />
              {cfg.label}难度 · {duration}年
            </div>
          </div>
        ) : (
          // ✅ Step 2：输入俱乐部名称
          <div className={styles.diffBody}>
            <div className={styles.clubNameHint}>
              <i className="ti ti-building" style={{ fontSize: 32, color: 'var(--gold)', marginBottom: 8 }} />
              <p>为你的俱乐部起一个名字吧</p>
              <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>
                {cfg.label}难度 · {duration}年 · 可在设置中修改
              </p>
            </div>
            <input
              className={styles.clubNameInput}
              value={clubName}
              onChange={e => setClubName(e.target.value)}
              maxLength={20}
              placeholder="输入俱乐部名称（最多20字）"
              autoFocus
            />
            <div className={styles.clubNameCount}>{clubName.length} / 20</div>
          </div>
        )}

        <div className={styles.diffFooter}>
          {step === 1 ? (
            <>
              <button className={styles.btnCancel} onClick={onClose}>取消</button>
              <button
                className={styles.btnStartGame}
                style={{ background: cfg.color }}
                onClick={() => setStep(2)}
              >
                下一步 <i className="ti ti-arrow-right" />
              </button>
            </>
          ) : (
            <>
              <button className={styles.btnCancel} onClick={() => setStep(1)}>← 返回</button>
              <button
                className={styles.btnStartGame}
                style={{ background: cfg.color }}
                disabled={false}
                onClick={() => onConfirm(selected, duration, clubName.trim() || '长青网球俱乐部')}
              >
                <i className="ti ti-arrow-right" /> 开始游戏
              </button>
            </>
          )}
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

  // ✅ 新增：初始化动画状态
  const [initAnim, setInitAnim]             = useState(false)
  const [initPlayers, setInitPlayers]       = useState([])
  const [initCoaches, setInitCoaches]       = useState([])
  const [initDifficulty, setInitDifficulty] = useState('normal')
  const [initClubName, setInitClubName]     = useState('')
  const [pendingState, setPendingState]     = useState(null)

  function handleAuthSuccess(u) {
    setUser(u)
    setModal(null)
  }
  function handleLogout() {
    localStorage.removeItem('tcm_user')
    setUser(null)
  }

  async function handleClearCache() {
    // 保存登录状态
    const savedUser = localStorage.getItem('tcm_user')

    // 清除所有 tcm_* 开头的 localStorage
    Object.keys(localStorage)
      .filter(k => k.startsWith('tcm_'))
      .forEach(k => localStorage.removeItem(k))

    // 恢复登录状态
    if (savedUser) localStorage.setItem('tcm_user', savedUser)

    // 清除 Service Worker 缓存（PWA）
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
    }

    // 刷新页面
    window.location.reload()
  }
  async function handleLoadSave(slot) {
    try {
      // 用 slot 编号去 API 拉取含完整 state_json 的存档
      const res  = await fetch(`/api/saves?userId=${user.id}&slot=${slot}`)
      const data = await res.json()
      if (data.save?.state_json) {
        // 存入 tcm_pending_load，App.jsx 会读取并加载
        localStorage.setItem('tcm_pending_load', data.save.state_json)
        navigate('/home')
      } else {
        alert('读取存档失败，存档数据不完整')
      }
    } catch (err) {
      console.error('读档失败:', err)
      alert('读取存档失败，请重试')
    }
  }

  function handleNewGame() {
    if (!user) { setModal('login'); return }
    setModal('difficulty')
  }

  // ✅ 难度 + 年限 + 俱乐部名称确认后：先生成 state，显示初始化动画，动画结束后跳转
  function handleDifficultyConfirm(difficulty, duration, clubName = '长青网球俱乐部') {
    setModal(null)

    // 提前生成初始 state（这样动画里可以展示球员名字）
    const tempState = buildInitialState(difficulty, {
      gameState: { clubName, year: 1, week: 1, dayOfWeek: '周一',
                   cash: 0, prestige: 0, prestigeTitle: '', prestigeChange: 0,
                   difficulty, clubSize: 'medium', loanMonthly: 0 },
      clubStats: { playerCount: 0, playerCapacity: 0, coachCount: 0, courtCount: 0, courtTypes: '', facilityCount: 0 },
      players: [], coaches: [], facilities: [], schedule: {},
      allEvents: [], myEntries: [], eventHistory: [],
      finance: { cash: 0, weekIncome: 0, weekExpense: 0, weekNet: 0, yearIncome: 0, yearExpense: 0 },
      transactions: [], weeklyTrend: [], incomeBreakdown: [], expenseBreakdown: [],
      recentNews: [], upcomingEvents: [],
    }, duration)

    // 存入 localStorage，App.jsx 读取后初始化
    localStorage.setItem('tcm_new_game_difficulty', difficulty)
    localStorage.setItem('tcm_new_game_duration', String(duration))
    localStorage.setItem('tcm_new_game_clubname', clubName)

    // 启动动画，把球员/教练信息传进去展示
    setInitPlayers(tempState.players || [])
    setInitCoaches(tempState.coaches || [])
    setInitDifficulty(difficulty)
    setInitClubName(clubName)
    setPendingState(tempState)
    setInitAnim(true)
  }

  // ✅ 动画完成后跳转，同时初始化 game_rankings 排名表
  function handleInitComplete() {
    // 异步初始化排名表（从 world_players 拷贝快照），不阻断跳转
    const userStr = localStorage.getItem('tcm_user')
    const user    = userStr ? (() => { try { return JSON.parse(userStr) } catch { return null } })() : null
    const saveSlot = parseInt(localStorage.getItem('tcm_save_slot') || '1', 10)
    if (user?.id) {
      fetch('/api/game_rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'init', userId: user.id, saveSlot }),
      }).catch(e => console.warn('[TCM] game_rankings init failed:', e))
    }
    navigate('/home')
  }

  return (
    <div className={styles.landing}>
      <div className={styles.bg} />
      <CourtLines />
      <div className={styles.vignette} />

      {/* 右上角 */}
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

      {/* 菜单 */}
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
          className={`${styles.menuBtn} ${styles.menuBtnClear}`}
          onClick={handleClearCache}
        >
          <span>清除缓存</span>
          <i className="ti ti-refresh" />
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
      {modal === 'difficulty' && (
        <DifficultyModal onClose={() => setModal(null)} onConfirm={handleDifficultyConfirm} />
      )}
      {modal === 'admin' && user?.isAdmin && (
        <AdminModal onClose={() => setModal(null)} />
      )}

      {/* ✅ 初始化动画（最上层，盖住所有内容） */}
      <GameInitAnimation
        visible={initAnim}
        players={initPlayers}
        coaches={initCoaches}
        difficulty={initDifficulty}
        clubName={initClubName}
        onComplete={handleInitComplete}
      />
    </div>
  )
}
