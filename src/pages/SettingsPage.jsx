import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameCtx } from '../App'
import { manualSave } from '../App'
import styles from './SettingsPage.module.css'

// ── 工具 ──────────────────────────────────────────────
function getLocal(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v) } catch { return fallback }
}
function setLocal(key, val) { localStorage.setItem(key, JSON.stringify(val)) }

// ── 通用组件 ──────────────────────────────────────────
function Section({ title, icon, children }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <i className={`ti ${icon}`} aria-hidden="true" />
        <span>{title}</span>
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  )
}

function Row({ label, desc, right, onClick, danger }) {
  return (
    <div
      className={`${styles.row} ${onClick ? styles.rowClickable : ''} ${danger ? styles.rowDanger : ''}`}
      onClick={onClick}
    >
      <div className={styles.rowLeft}>
        <span className={`${styles.rowLabel} ${danger ? styles.rowLabelDanger : ''}`}>{label}</span>
        {desc && <span className={styles.rowDesc}>{desc}</span>}
      </div>
      <div className={styles.rowRight}>
        {right}
        {onClick && <i className="ti ti-chevron-right" aria-hidden="true" />}
      </div>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      className={`${styles.toggle} ${value ? styles.toggleOn : ''}`}
      onClick={() => onChange(!value)}
      aria-checked={value}
      role="switch"
    >
      <span className={styles.toggleThumb} />
    </button>
  )
}

// ── 俱乐部改名弹窗 ────────────────────────────────────
function RenameModal({ current, onClose, onSave }) {
  const [name, setName] = useState(current)
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>修改俱乐部名称</span>
          <button className={styles.closeBtn} onClick={onClose}><i className="ti ti-x" aria-hidden="true" /></button>
        </div>
        <div className={styles.modalBody}>
          <input
            className={styles.nameInput} value={name}
            onChange={e => setName(e.target.value)}
            maxLength={20} placeholder="输入俱乐部名称（最多20字）" autoFocus
          />
          <span className={styles.nameCount}>{name.length} / 20</span>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btnCancel} onClick={onClose}>取消</button>
          <button className={styles.btnSave} disabled={!name.trim()} onClick={() => { onSave(name.trim()); onClose() }}>保存</button>
        </div>
      </div>
    </div>
  )
}

// ── 通用确认弹窗 ──────────────────────────────────────
function ConfirmModal({ title, desc, confirmLabel, danger, onClose, onConfirm }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>{title}</span>
          <button className={styles.closeBtn} onClick={onClose}><i className="ti ti-x" aria-hidden="true" /></button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.confirmDesc}>{desc}</p>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btnCancel} onClick={onClose}>取消</button>
          <button className={danger ? styles.btnDanger : styles.btnSave} onClick={() => { onConfirm(); onClose() }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ✅ 退出确认弹窗（新增）────────────────────────────
function ExitModal({ onClose, onSaveAndExit, onExitWithoutSave }) {
  const [saving, setSaving] = useState(false)

  async function handleSaveAndExit() {
    setSaving(true)
    await onSaveAndExit()
    setSaving(false)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>退出游戏</span>
          <button className={styles.closeBtn} onClick={onClose}><i className="ti ti-x" aria-hidden="true" /></button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.exitIcon}>
            <i className="ti ti-door-exit" aria-hidden="true" />
          </div>
          <p className={styles.confirmDesc}>
            是否在退出前保存当前游戏进度？
          </p>
          <p className={styles.exitNote}>
            上次自动存档时间：{new Date().toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className={styles.exitFooter}>
          <button className={styles.btnCancel} onClick={onClose}>继续游戏</button>
          <button className={styles.btnExitOnly} onClick={onExitWithoutSave}>
            不保存退出
          </button>
          <button className={styles.btnSaveExit} onClick={handleSaveAndExit} disabled={saving}>
            {saving ? <><i className="ti ti-loader-2" /> 保存中…</> : <><i className="ti ti-device-floppy" /> 保存并退出</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────
export default function SettingsPage() {
  const navigate        = useNavigate()
  const { state, dispatch } = useGameCtx()
  const { gameState, clubStats } = state

  const [showRename,   setShowRename]   = useState(false)
  const [showExit,     setShowExit]     = useState(false)  // ✅ 退出确认
  const [saveMsg,      setSaveMsg]      = useState('')
  const [autoSave,      setAutoSave]      = useState(() => getLocal('tcm_auto_save', true))

  // ✅ 通知/偏好设置：读写 localStorage，即时生效
  const [notifyFatigue,  setNotifyFatigue]  = useState(() => getLocal('tcm_notify_fatigue',  true))
  const [notifyContract, setNotifyContract] = useState(() => getLocal('tcm_notify_contract', true))
  const [notifyEvent,    setNotifyEvent]    = useState(() => getLocal('tcm_notify_event',    true))
  const [notifyRandom,   setNotifyRandom]   = useState(() => getLocal('tcm_notify_random',   true))

  // Toggle 变更时立即写 localStorage
  function handleToggle(key, setter, val) {
    setter(val)
    setLocal(key, val)
  }

  const DIFFICULTY_LABEL = { easy: '简单', normal: '普通', hard: '困难' }
  const SIZE_LABEL       = { small: '小型', medium: '中型', large: '大型' }
  const totalWeeks       = (gameState.year - 1) * 52 + gameState.week
  const saveTime         = new Date().toLocaleDateString('zh-CN')

  // ✅ 手动存档
  async function handleManualSave() {
    setSaveMsg('保存中…')
    const slotStr = localStorage.getItem('tcm_current_slot')
    const slot    = slotStr ? parseInt(slotStr, 10) : 1
    const result  = await manualSave(state, slot)
    setSaveMsg(result.success ? '✓ 存档成功' : '存档失败，请重试')
    setTimeout(() => setSaveMsg(''), 3000)
  }

  // ✅ 退出游戏
  async function handleSaveAndExit() {
    const slotStr = localStorage.getItem('tcm_current_slot')
    const slot    = slotStr ? parseInt(slotStr, 10) : 1
    await manualSave(state, slot)
    navigate('/landing')
  }

  function handleExitWithoutSave() {
    navigate('/landing')
  }

  return (
    <div className={styles.page}>
      <header className={styles.mobileHeader}>
        <h1 className={styles.mobileTitle}>设置</h1>
      </header>

      <div className={styles.inner}>

        {/* ── ✅ 退出游戏按钮（顶部醒目位置）── */}
        <button className={styles.exitBtn} onClick={() => setShowExit(true)}>
          <i className="ti ti-door-exit" aria-hidden="true" />
          退出到主菜单
        </button>

        {/* ── 俱乐部信息 ── */}
        <Section title="俱乐部信息" icon="ti-building">
          <Row
            label="俱乐部名称"
            right={<span className={styles.valueText}>{gameState.clubName}</span>}
            onClick={() => setShowRename(true)}
          />
          <Row label="俱乐部规模"  right={<span className={styles.valueText}>{SIZE_LABEL[gameState.clubSize] ?? '中型'}</span>} />
          <Row
            label="难度模式"
            right={
              <span className={`${styles.diffBadge} ${styles[`diff_${gameState.difficulty}`]}`}>
                {DIFFICULTY_LABEL[gameState.difficulty] ?? '普通'}
              </span>
            }
          />
          <Row label="声望等级"  right={<span className={styles.valueText}>{gameState.prestigeTitle}</span>} />
          <Row label="当前进度"  right={<span className={styles.valueText}>第 {gameState.year} 年第 {gameState.week} 周</span>} />
        </Section>

        {/* ── 存档管理 ── */}
        <Section title="存档管理" icon="ti-device-floppy">
          <Row
            label="手动存档"
            desc={saveMsg || '将当前游戏状态保存到云端'}
            right={<span className={styles.valueText}>{saveTime}</span>}
            onClick={handleManualSave}
          />
          <Row
            label="自动存档"
            desc="每次进入下一周后自动保存进度"
            right={<Toggle value={autoSave} onChange={v => handleToggle('tcm_auto_save', setAutoSave, v)} />}
          />
          <Row label="游戏总时长" right={<span className={styles.valueText}>{totalWeeks} 周</span>} />
          <Row label="球员总数"   right={<span className={styles.valueText}>{clubStats.playerCount} 人</span>} />
          <Row label="球场数量"   right={<span className={styles.valueText}>{clubStats.courtCount} 片</span>} />
        </Section>

        {/* ── ✅ 通知提醒（即时写 localStorage）── */}
        <Section title="通知提醒" icon="ti-bell">
          <Row label="疲劳度预警"    desc="球员疲劳 ≥ 70 时提示"           right={<Toggle value={notifyFatigue}  onChange={v => handleToggle('tcm_notify_fatigue',  setNotifyFatigue,  v)} />} />
          <Row label="合同到期提醒"  desc="教练合同剩余 ≤ 16 周时提示"     right={<Toggle value={notifyContract} onChange={v => handleToggle('tcm_notify_contract', setNotifyContract, v)} />} />
          <Row label="赛事开始提醒"  desc="赛事开赛前 4 周提示"            right={<Toggle value={notifyEvent}    onChange={v => handleToggle('tcm_notify_event',    setNotifyEvent,    v)} />} />
          <Row label="随机事件通知"  desc="有新随机事件时显示提示"          right={<Toggle value={notifyRandom}   onChange={v => handleToggle('tcm_notify_random',   setNotifyRandom,   v)} />} />
        </Section>





        {/* ── 关于 ── */}
        <Section title="关于" icon="ti-info-circle">
          <Row label="版本"    right={<span className={styles.valueText}>v0.1.0 Beta</span>} />
          <Row label="技术栈"  right={<span className={styles.valueText}>React · Vite · Neon</span>} />
          <Row label="AI 后端" right={<span className={styles.valueText}>Gemini 2.5 Flash</span>} />
        </Section>

        <div className={styles.footer}>
          网球俱乐部经营模拟游戏 · Beta 版本<br />
          数据均为模拟数据，游戏逻辑持续完善中
        </div>
      </div>

      {/* 弹窗 */}
      {showRename && (
        <RenameModal
          current={gameState.clubName}
          onClose={() => setShowRename(false)}
          onSave={name => dispatch({ type: 'UPDATE_GAME_STATE', data: { clubName: name } })}
        />
      )}

      {/* ✅ 退出弹窗 */}
      {showExit && (
        <ExitModal
          onClose={() => setShowExit(false)}
          onSaveAndExit={handleSaveAndExit}
          onExitWithoutSave={handleExitWithoutSave}
        />
      )}
    </div>
  )
}
