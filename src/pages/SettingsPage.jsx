import { useState } from 'react'
import { gameState, clubStats } from '../data/mockData'
import styles from './SettingsPage.module.css'

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
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>
        <div className={styles.modalBody}>
          <input
            className={styles.nameInput}
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={20}
            placeholder="输入俱乐部名称（最多20字）"
            autoFocus
          />
          <span className={styles.nameCount}>{name.length} / 20</span>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btnCancel} onClick={onClose}>取消</button>
          <button
            className={styles.btnSave}
            disabled={!name.trim()}
            onClick={() => { onSave(name.trim()); onClose() }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 重置确认弹窗 ──────────────────────────────────────
function ConfirmModal({ title, desc, confirmLabel, danger, onClose, onConfirm }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>{title}</span>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.confirmDesc}>{desc}</p>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btnCancel} onClick={onClose}>取消</button>
          <button
            className={danger ? styles.btnDanger : styles.btnSave}
            onClick={() => { onConfirm(); onClose() }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────
export default function SettingsPage() {
  const [clubName, setClubName]         = useState(gameState.clubName)
  const [showRename, setShowRename]     = useState(false)
  const [showReset, setShowReset]       = useState(false)
  const [showNewGame, setShowNewGame]   = useState(false)

  // UI 偏好（纯前端状态，后续接 localStorage / Supabase）
  const [notifyFatigue, setNotifyFatigue]       = useState(true)
  const [notifyContract, setNotifyContract]     = useState(true)
  const [notifyEvent, setNotifyEvent]           = useState(true)
  const [notifyRandom, setNotifyRandom]         = useState(true)
  const [autoAdvance, setAutoAdvance]           = useState(false)
  const [showHiddenAttr, setShowHiddenAttr]     = useState(false)

  const DIFFICULTY_LABEL = { easy: '简单', normal: '正常', hard: '困难' }
  const SIZE_LABEL       = { small: '小型', medium: '中型', large: '大型' }

  // 游戏进度统计
  const totalWeeks = gameState.year * 52 + gameState.week - 1
  const saveTime   = new Date().toLocaleDateString('zh-CN')

  return (
    <div className={styles.page}>

      {/* 移动端 Header */}
      <header className={styles.mobileHeader}>
        <h1 className={styles.mobileTitle}>设置</h1>
      </header>

      <div className={styles.inner}>

        {/* ── 俱乐部信息 ── */}
        <Section title="俱乐部信息" icon="ti-building">
          <Row
            label="俱乐部名称"
            right={<span className={styles.valueText}>{clubName}</span>}
            onClick={() => setShowRename(true)}
          />
          <Row
            label="俱乐部规模"
            right={<span className={styles.valueText}>{SIZE_LABEL[gameState.clubSize]}</span>}
          />
          <Row
            label="难度模式"
            right={
              <span className={`${styles.diffBadge} ${styles[`diff_${gameState.difficulty}`]}`}>
                {DIFFICULTY_LABEL[gameState.difficulty]}
              </span>
            }
          />
          <Row label="声望等级" right={<span className={styles.valueText}>{gameState.prestigeTitle}</span>} />
          <Row
            label="当前进度"
            right={<span className={styles.valueText}>第 {gameState.year} 年第 {gameState.week} 周</span>}
          />
        </Section>

        {/* ── 存档 ── */}
        <Section title="存档管理" icon="ti-device-floppy">
          <Row
            label="手动存档"
            desc="将当前游戏状态保存到云端"
            right={<span className={styles.valueText}>{saveTime}</span>}
            onClick={() => alert('存档功能接入 Supabase 后开放')}
          />
          <Row
            label="游戏总时长"
            right={<span className={styles.valueText}>{totalWeeks} 周</span>}
          />
          <Row
            label="球员总数"
            right={<span className={styles.valueText}>{clubStats.playerCount} 人</span>}
          />
          <Row
            label="球场数量"
            right={<span className={styles.valueText}>{clubStats.courtCount} 片</span>}
          />
        </Section>

        {/* ── 通知提醒 ── */}
        <Section title="通知提醒" icon="ti-bell">
          <Row
            label="疲劳度预警"
            desc="球员疲劳 ≥ 70 时提示"
            right={<Toggle value={notifyFatigue} onChange={setNotifyFatigue} />}
          />
          <Row
            label="合同到期提醒"
            desc="教练合同剩余 ≤ 16 周时提示"
            right={<Toggle value={notifyContract} onChange={setNotifyContract} />}
          />
          <Row
            label="赛事开始提醒"
            desc="赛事开赛前 4 周提示"
            right={<Toggle value={notifyEvent} onChange={setNotifyEvent} />}
          />
          <Row
            label="随机事件通知"
            desc="有新随机事件时显示提示"
            right={<Toggle value={notifyRandom} onChange={setNotifyRandom} />}
          />
        </Section>

        {/* ── 游戏偏好 ── */}
        <Section title="游戏偏好" icon="ti-adjustments">
          <Row
            label="自动推进周次"
            desc="每次操作后自动进入下一周（慎用）"
            right={<Toggle value={autoAdvance} onChange={setAutoAdvance} />}
          />
          <Row
            label="显示隐藏属性"
            desc="在球员详情中展示天赋数值（破坏游戏体验）"
            right={<Toggle value={showHiddenAttr} onChange={setShowHiddenAttr} />}
          />
        </Section>

        {/* ── 数据与账号 ── */}
        <Section title="数据与账号" icon="ti-database">
          <Row
            label="导出游戏数据"
            desc="下载当前存档的 JSON 文件"
            onClick={() => alert('导出功能开发中')}
          />
          <Row
            label="绑定账号"
            desc="登录后数据可跨设备同步（接入 Supabase 后开放）"
            right={<span className={styles.tagComingSoon}>即将开放</span>}
          />
        </Section>

        {/* ── 危险操作 ── */}
        <Section title="危险操作" icon="ti-alert-triangle">
          <Row
            label="重置本局游戏"
            desc="保留难度设置，回到第1年第1周"
            onClick={() => setShowReset(true)}
            danger
          />
          <Row
            label="开始新游戏"
            desc="清除所有进度，重新选择难度开局"
            onClick={() => setShowNewGame(true)}
            danger
          />
        </Section>

        {/* ── 关于 ── */}
        <Section title="关于" icon="ti-info-circle">
          <Row label="版本" right={<span className={styles.valueText}>v0.1.0 Beta</span>} />
          <Row label="技术栈" right={<span className={styles.valueText}>React · Vite · Supabase</span>} />
          <Row label="AI 后端" right={<span className={styles.valueText}>Gemini 2.5 Flash</span>} />
          <Row
            label="项目文档"
            right={<span className={styles.valueText}>v1.0</span>}
          />
        </Section>

        <div className={styles.footer}>
          网球俱乐部经营模拟游戏 · Beta 版本<br />
          数据均为模拟数据，游戏逻辑持续完善中
        </div>

      </div>

      {/* 改名弹窗 */}
      {showRename && (
        <RenameModal
          current={clubName}
          onClose={() => setShowRename(false)}
          onSave={name => { setClubName(name); alert(`俱乐部已更名为「${name}」（刷新后恢复，接入 Supabase 后永久保存）`) }}
        />
      )}

      {/* 重置确认 */}
      {showReset && (
        <ConfirmModal
          title="重置本局游戏"
          desc="所有球员、教练、设施、财务数据将被清除，回到第1年第1周。此操作不可撤销。"
          confirmLabel="确认重置"
          danger
          onClose={() => setShowReset(false)}
          onConfirm={() => alert('重置功能接入 Supabase 后开放')}
        />
      )}

      {/* 新游戏确认 */}
      {showNewGame && (
        <ConfirmModal
          title="开始新游戏"
          desc="将清除当前所有进度并重新开局。此操作不可撤销，请确保已存档。"
          confirmLabel="确认开始新游戏"
          danger
          onClose={() => setShowNewGame(false)}
          onConfirm={() => alert('新游戏功能接入 Supabase 后开放')}
        />
      )}

    </div>
  )
}
