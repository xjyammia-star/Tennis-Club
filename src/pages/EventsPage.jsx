import { useState, useMemo } from 'react'
import {
  allEvents, myEntries, eventHistory,
  hostEventConfig, players,
} from '../data/mockData'
import styles from './EventsPage.module.css'

// ── 常量 ──────────────────────────────────────────────
const LEVEL_META = {
  slam: { cls: styles.badgeSlam, color: '#9a6e0a' },
  '1000': { cls: styles.badge1000, color: '#1a4090' },
  '500':  { cls: styles.badge500,  color: '#1a6010' },
  '250':  { cls: styles.badge250,  color: '#2a6858' },
  itf:    { cls: styles.badgeItf,  color: '#5a2a8a' },
}

const SURFACE_ICON = { 硬地: 'ti-rectangle', 红土: 'ti-circle', 草地: 'ti-leaf' }
const SURFACE_COLOR = { 硬地: '#2a5fa8', 红土: '#b8562a', 草地: '#2a7a3a' }

const CURRENT_WEEK = 1

function weeksUntil(week) {
  return week - CURRENT_WEEK
}

function getStatus(event) {
  const diff = weeksUntil(event.week)
  if (diff < 0) return 'past'
  if (diff === 0 || diff === 1) return 'ongoing'
  if (diff <= 4) return 'soon'
  return 'upcoming'
}

function getEligiblePlayers(event) {
  return players.filter(p => {
    if (event.level === 'itf') return p.age >= 14 && p.age < 18
    if (event.level === 'slam') return p.ranking && p.ranking <= 150
    if (event.level === '1000') return p.ranking && p.ranking <= 300
    if (event.level === '500')  return p.ranking && p.ranking <= 500
    if (event.level === '250')  return p.age >= 18
    return false
  })
}

// ── 赛事级别徽章 ──────────────────────────────────────
function LevelBadge({ level, label }) {
  const meta = LEVEL_META[level] || LEVEL_META['250']
  return <span className={`${styles.badge} ${meta.cls}`}>{label}</span>
}

// ── 赛事详情弹窗 ──────────────────────────────────────
function EventDetail({ event, entry, onClose, onEnter, onWithdraw }) {
  const eligible = getEligiblePlayers(event)
  const isEntered = !!entry
  const weeksAway = weeksUntil(event.week)
  const status = getStatus(event)
  const [selectedPlayers, setSelectedPlayers] = useState(entry?.playerIds || [])

  function togglePlayer(id) {
    setSelectedPlayers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.detailPanel} onClick={e => e.stopPropagation()}>

        <div className={styles.detailHeader}>
          <div>
            <div className={styles.detailTagRow}>
              <LevelBadge level={event.level} label={event.levelLabel} />
              <span className={styles.surfaceTag} style={{ color: SURFACE_COLOR[event.surface] }}>
                <i className={`ti ${SURFACE_ICON[event.surface]}`} aria-hidden="true" />
                {event.surface}
              </span>
            </div>
            <div className={styles.detailName}>{event.name}</div>
            <div className={styles.detailMeta}>
              第 {event.week} 周 · 持续 {event.duration} 周 · {event.qualify}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <div className={styles.detailBody}>

          {/* 状态卡 */}
          <div className={`${styles.statusCard} ${
            status === 'soon' ? styles.statusSoon :
            status === 'ongoing' ? styles.statusOngoing : styles.statusNormal
          }`}>
            <i className={`ti ${
              status === 'past' ? 'ti-check' :
              status === 'ongoing' ? 'ti-activity' :
              status === 'soon' ? 'ti-alarm' : 'ti-calendar'
            }`} aria-hidden="true" />
            <span>
              {status === 'past' ? '赛事已结束' :
               status === 'ongoing' ? '赛事进行中' :
               status === 'soon' ? `距开赛仅剩 ${weeksAway} 周` :
               `距开赛还有 ${weeksAway} 周`}
            </span>
            {isEntered && <span className={styles.enteredPill}>已报名</span>}
          </div>

          {/* 可参赛球员 */}
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>
              <i className="ti ti-users" aria-hidden="true" />
              可参赛球员（{eligible.length} 人符合资格）
            </div>
            {eligible.length > 0 ? (
              <div className={styles.playerGrid}>
                {eligible.map(p => {
                  const sel = selectedPlayers.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      className={`${styles.playerBtn} ${sel ? styles.playerBtnSel : ''}`}
                      onClick={() => togglePlayer(p.id)}
                      disabled={status === 'past'}
                    >
                      <div className={styles.playerBtnAvatar}>{p.name.charAt(0)}</div>
                      <div className={styles.playerBtnInfo}>
                        <span className={styles.playerBtnName}>{p.name}</span>
                        <span className={styles.playerBtnMeta}>
                          {p.age}岁
                          {p.ranking ? ` · #${p.ranking}` : ''}
                        </span>
                      </div>
                      {sel && <i className="ti ti-check" style={{ color: 'var(--gold)', fontSize: 14 }} aria-hidden="true" />}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className={styles.noEligible}>
                <i className="ti ti-lock" aria-hidden="true" /> 暂无球员符合参赛资格
              </p>
            )}
          </div>

          {/* 操作 */}
          {status !== 'past' && (
            <div className={styles.actionRow}>
              {isEntered ? (
                <button className={styles.btnWithdraw} onClick={() => { onWithdraw(event.id); onClose() }}>
                  <i className="ti ti-x" aria-hidden="true" /> 取消报名
                </button>
              ) : (
                <button
                  className={styles.btnEnter}
                  disabled={selectedPlayers.length === 0 || eligible.length === 0}
                  onClick={() => { onEnter(event.id, selectedPlayers); onClose() }}
                >
                  <i className="ti ti-send" aria-hidden="true" />
                  {selectedPlayers.length > 0
                    ? `报名参赛（${selectedPlayers.length} 人）`
                    : '请先选择球员'}
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ── 承办赛事弹窗 ──────────────────────────────────────
function HostModal({ onClose }) {
  const [size, setSize] = useState('small')
  const cfg = hostEventConfig[size]
  const estIncome = cfg.regFee * cfg.regMax * 0.7 + cfg.ticketFee * cfg.ticketMax * 0.6
  const estProfit = estIncome - cfg.cost

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.hostPanel} onClick={e => e.stopPropagation()}>

        <div className={styles.hostHeader}>
          <span className={styles.hostTitle}>承办比赛</span>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <div className={styles.hostBody}>

          <div className={styles.sizeRow}>
            {[
              { k: 'small',  l: '小型赛事' },
              { k: 'medium', l: '中型赛事' },
              { k: 'large',  l: '大型赛事' },
            ].map(({ k, l }) => (
              <button
                key={k}
                className={`${styles.sizeBtn} ${size === k ? styles.sizeBtnActive : ''}`}
                onClick={() => setSize(k)}
              >{l}</button>
            ))}
          </div>

          <div className={styles.hostGrid}>
            <div className={styles.hostBox}>
              <span className={styles.hostBoxVal}>¥{(cfg.cost/10000).toFixed(0)}万</span>
              <span className={styles.hostBoxLbl}>承办成本</span>
            </div>
            <div className={styles.hostBox}>
              <span className={styles.hostBoxVal}>¥{cfg.regFee}</span>
              <span className={styles.hostBoxLbl}>报名费/人</span>
            </div>
            <div className={styles.hostBox}>
              <span className={styles.hostBoxVal}>{cfg.regMax}人</span>
              <span className={styles.hostBoxLbl}>报名上限</span>
            </div>
            <div className={styles.hostBox}>
              <span className={styles.hostBoxVal}>+{cfg.prestige}</span>
              <span className={styles.hostBoxLbl}>声望加成</span>
            </div>
          </div>

          <div className={styles.hostEstimate}>
            <div className={styles.hostEstRow}>
              <span>预估收入</span>
              <strong className={styles.estIncome}>+¥{(estIncome/10000).toFixed(1)}万</strong>
            </div>
            <div className={styles.hostEstRow}>
              <span>承办成本</span>
              <strong className={styles.estExpense}>-¥{(cfg.cost/10000).toFixed(0)}万</strong>
            </div>
            <div className={`${styles.hostEstRow} ${styles.hostEstTotal}`}>
              <span>预估净利润</span>
              <strong className={estProfit >= 0 ? styles.estIncome : styles.estExpense}>
                {estProfit >= 0 ? '+' : ''}¥{(estProfit/10000).toFixed(1)}万
              </strong>
            </div>
          </div>

          <p className={styles.hostNote}>
            * 需提前 2 周申请，实际收入受参与人数影响。承办大型赛事需声望 ≥ 3000。
          </p>
        </div>

        <div className={styles.hostFooter}>
          <button className={styles.btnCancel} onClick={onClose}>取消</button>
          <button className={styles.btnHost} onClick={() => { alert('承办功能开发中…'); onClose() }}>
            <i className="ti ti-flag" aria-hidden="true" /> 申请承办
          </button>
        </div>

      </div>
    </div>
  )
}

// ── 赛事行 ────────────────────────────────────────────
function EventRow({ event, entry, onClick }) {
  const status = getStatus(event)
  const weeksAway = weeksUntil(event.week)
  const eligible = getEligiblePlayers(event)

  return (
    <div
      className={`${styles.eventRow} ${
        status === 'soon' ? styles.eventSoon :
        status === 'ongoing' ? styles.eventOngoing :
        status === 'past' ? styles.eventPast : ''
      }`}
      onClick={() => onClick(event)}
    >
      <div className={styles.eventLeft}>
        <LevelBadge level={event.level} label={event.levelLabel} />
        <div className={styles.eventInfo}>
          <span className={styles.eventName}>{event.name}</span>
          <span className={styles.eventSub}>
            第 {event.week} 周 &nbsp;·&nbsp;
            <span style={{ color: SURFACE_COLOR[event.surface] }}>
              <i className={`ti ${SURFACE_ICON[event.surface]}`} aria-hidden="true" /> {event.surface}
            </span>
            &nbsp;·&nbsp; {event.qualify}
          </span>
        </div>
      </div>
      <div className={styles.eventRight}>
        {entry && (
          <span className={styles.enteredTag}>
            <i className="ti ti-check" aria-hidden="true" /> {entry.playerIds.length}人
          </span>
        )}
        {status === 'past' ? (
          <span className={styles.weekTag} style={{ color: 'var(--ink-faint)' }}>已结束</span>
        ) : status === 'ongoing' ? (
          <span className={styles.weekTagOngoing}>进行中</span>
        ) : (
          <span className={`${styles.weekTag} ${status === 'soon' ? styles.weekTagSoon : ''}`}>
            {weeksAway === 0 ? '本周' : `${weeksAway}周后`}
          </span>
        )}
        <i className="ti ti-chevron-right" style={{ color: 'var(--ink-faint)', fontSize: 15 }} aria-hidden="true" />
      </div>
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────
export default function EventsPage() {
  const [entries, setEntries]         = useState(myEntries)
  const [selected, setSelected]       = useState(null)
  const [showHost, setShowHost]       = useState(false)
  const [filter, setFilter]           = useState('all') // all | entered | upcoming | itf | pro
  const [showHistory, setShowHistory] = useState(false)

  const filtered = useMemo(() => {
    return allEvents.filter(ev => {
      if (filter === 'entered') return entries.some(e => e.eventId === ev.id)
      if (filter === 'itf')     return ev.level === 'itf'
      if (filter === 'pro')     return ev.level !== 'itf'
      if (filter === 'upcoming') return getStatus(ev) !== 'past'
      return true
    })
  }, [filter, entries])

  const enteredCount = entries.length
  const soonCount = allEvents.filter(ev => {
    const diff = weeksUntil(ev.week)
    return diff >= 0 && diff <= 4
  }).length

  function handleEnter(eventId, playerIds) {
    setEntries(prev => {
      const exists = prev.find(e => e.eventId === eventId)
      if (exists) return prev.map(e => e.eventId === eventId ? { ...e, playerIds } : e)
      return [...prev, { eventId, playerIds, status: 'upcoming' }]
    })
  }

  function handleWithdraw(eventId) {
    setEntries(prev => prev.filter(e => e.eventId !== eventId))
  }

  return (
    <div className={styles.page}>

      <header className={styles.mobileHeader}>
        <h1 className={styles.mobileTitle}>赛事管理</h1>
      </header>

      <div className={styles.inner}>

        {/* 概览 */}
        <div className={styles.summaryRow}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryVal}>{allEvents.length}</span>
            <span className={styles.summaryLabel}>年度赛事</span>
          </div>
          <div className={styles.summaryDiv} />
          <div className={styles.summaryItem}>
            <span className={`${styles.summaryVal} ${enteredCount > 0 ? styles.summaryGreen : ''}`}>
              {enteredCount}
            </span>
            <span className={styles.summaryLabel}>已报名</span>
          </div>
          <div className={styles.summaryDiv} />
          <div className={styles.summaryItem}>
            <span className={`${styles.summaryVal} ${soonCount > 0 ? styles.summaryWarn : ''}`}>
              {soonCount}
            </span>
            <span className={styles.summaryLabel}>近4周赛事</span>
          </div>
          <div className={styles.summaryDiv} />
          <div className={styles.summaryItem}>
            <span className={styles.summaryVal}>{eventHistory.length}</span>
            <span className={styles.summaryLabel}>历史战绩</span>
          </div>
        </div>

        {/* 操作按钮行 */}
        <div className={styles.actionBar}>
          <button className={styles.hostBtn} onClick={() => setShowHost(true)}>
            <i className="ti ti-flag" aria-hidden="true" /> 承办比赛
          </button>
          <button
            className={`${styles.historyBtn} ${showHistory ? styles.historyBtnActive : ''}`}
            onClick={() => setShowHistory(v => !v)}
          >
            <i className="ti ti-history" aria-hidden="true" /> 历史战绩
          </button>
        </div>

        {/* 历史战绩 */}
        {showHistory && (
          <div className={styles.historyCard}>
            <div className={styles.historyTitle}>历史战绩</div>
            {eventHistory.length > 0 ? eventHistory.map(h => (
              <div key={h.id} className={styles.historyRow}>
                <div className={styles.historyLeft}>
                  <LevelBadge level={h.level} label={h.levelLabel} />
                  <span className={styles.historyName}>{h.eventName}</span>
                </div>
                <div className={styles.historyRight}>
                  {h.results.map((r, i) => (
                    <span key={i} className={styles.historyResult}>
                      {r.playerName} {r.round}
                    </span>
                  ))}
                  <span className={styles.historyPrize}>+¥{h.totalPrize.toLocaleString()}</span>
                </div>
              </div>
            )) : (
              <p className={styles.noHistory}>暂无历史记录</p>
            )}
          </div>
        )}

        {/* 筛选 */}
        <div className={styles.filterRow}>
          {[
            { v: 'all',      l: '全部' },
            { v: 'upcoming', l: '即将开始' },
            { v: 'entered',  l: '已报名' },
            { v: 'itf',      l: 'ITF青少年' },
            { v: 'pro',      l: '职业赛' },
          ].map(({ v, l }) => (
            <button
              key={v}
              className={`${styles.filterBtn} ${filter === v ? styles.filterBtnActive : ''}`}
              onClick={() => setFilter(v)}
            >{l}</button>
          ))}
        </div>

        {/* 赛事列表 */}
        <div className={styles.eventList}>
          {filtered.map(ev => (
            <EventRow
              key={ev.id}
              event={ev}
              entry={entries.find(e => e.eventId === ev.id)}
              onClick={setSelected}
            />
          ))}
        </div>

      </div>

      {/* 详情弹窗 */}
      {selected && (
        <EventDetail
          event={selected}
          entry={entries.find(e => e.eventId === selected.id)}
          onClose={() => setSelected(null)}
          onEnter={handleEnter}
          onWithdraw={handleWithdraw}
        />
      )}

      {/* 承办弹窗 */}
      {showHost && <HostModal onClose={() => setShowHost(false)} />}

    </div>
  )
}
