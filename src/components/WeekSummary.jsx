// WeekSummary.jsx — 周结算弹窗
import { useState } from 'react'
import styles from './WeekSummary.module.css'

const TYPE_CONFIG = {
  deficit: { priority: 0, icon: 'ti-alert-triangle', color: '#e05a2b', label: '财务警告', bg: 'rgba(224,90,43,0.10)' },
  injury:  { priority: 1, icon: 'ti-first-aid-kit',  color: '#e05a2b', label: '伤病通知', bg: 'rgba(224,90,43,0.08)' },
  coach:   { priority: 2, icon: 'ti-user-star',      color: '#c9a84c', label: '教练动态', bg: 'rgba(201,168,76,0.08)' },
  skill:   { priority: 3, icon: 'ti-star',           color: '#c9a84c', label: '技能成就', bg: 'rgba(201,168,76,0.08)' },
  growth:  { priority: 4, icon: 'ti-trending-up',    color: '#2a7a3a', label: '属性成长', bg: 'rgba(42,122,58,0.07)'  },
  event:   { priority: 5, icon: 'ti-trophy',         color: '#2a7a3a', label: '赛事动态', bg: 'rgba(42,122,58,0.08)'  },
  sponsor: { priority: 6, icon: 'ti-rosette',        color: '#2a5fa8', label: '赞助消息', bg: 'rgba(42,95,168,0.08)'  },
  finance: { priority: 7, icon: 'ti-currency-yen',   color: '#2a7a3a', label: '财务动态', bg: 'rgba(42,122,58,0.08)'  },
  player:  { priority: 8, icon: 'ti-user',           color: '#4a5a48', label: '球员动态', bg: 'rgba(74,90,72,0.06)'   },
  staff:   { priority: 8, icon: 'ti-user-check',     color: '#4a5a48', label: '员工动态', bg: 'rgba(74,90,72,0.06)'   },
  facility:{ priority: 8, icon: 'ti-building',       color: '#4a5a48', label: '设施事件', bg: 'rgba(74,90,72,0.06)'   },
  default: { priority: 9, icon: 'ti-bell',           color: '#4a5a48', label: '动态',     bg: 'rgba(74,90,72,0.06)'   },
}

// 随机事件专属样式（更醒目）
const EVENT_TONE_CONFIG = {
  positive: { icon: 'ti-sparkles',       color: '#2a7a3a', bg: 'rgba(42,122,58,0.12)',  border: '#2a7a3a' },
  negative: { icon: 'ti-alert-circle',   color: '#e05a2b', bg: 'rgba(224,90,43,0.10)', border: '#e05a2b' },
  neutral:  { icon: 'ti-info-circle',    color: '#2a5fa8', bg: 'rgba(42,95,168,0.10)', border: '#2a5fa8' },
}

function getCfg(type) { return TYPE_CONFIG[type] || TYPE_CONFIG.default }

export default function WeekSummary({ visible, onClose, newState, prevFinance }) {
  const [tab, setTab] = useState('news')

  if (!visible || !newState) return null

  const { gameState, finance, recentNews, allEvents, lastEvent } = newState
  const currentWeek = gameState.week

  // 本周新消息（排除随机事件，因为随机事件单独展示）
  const thisWeekNews = (recentNews || []).filter(n => n.week === currentWeek)

  // 赤字警告
  const net = (finance.weekIncome || 0) - (finance.weekExpense || 0)
  const deficitMsgs = net < -5000 ? [{
    id: 'deficit_warn',
    type: 'deficit',
    text: `⚠️ 本周净亏损 ¥${Math.abs(net).toLocaleString()}，请注意账户余额！`,
    week: currentWeek,
  }] : []

  const allMsgs = [...deficitMsgs, ...thisWeekNews]
    .sort((a, b) => getCfg(a.type).priority - getCfg(b.type).priority)
    .slice(0, 10)

  // 下周赛事提醒
  const nextEvents = (allEvents || []).filter(ev => ev.week === currentWeek + 1)

  // 随机事件角标（有事件时在标签上加红点）
  const hasEvent = !!lastEvent

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>

        {/* 头部 */}
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>周结算完成</div>
            <div className={styles.title}>第 {gameState.year} 年 · 第 {currentWeek} 周</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* 标签 */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'news' ? styles.active : ''}`} onClick={() => setTab('news')}>
            <i className="ti ti-bell" />
            本周动态
            {(allMsgs.length > 0 || hasEvent) && (
              <span className={styles.badge}>{allMsgs.length + (hasEvent ? 1 : 0)}</span>
            )}
          </button>
          <button className={`${styles.tab} ${tab === 'finance' ? styles.active : ''}`} onClick={() => setTab('finance')}>
            <i className="ti ti-chart-bar" />
            收支概览
          </button>
        </div>

        {/* 内容 */}
        <div className={styles.body}>

          {tab === 'news' && (
            <div className={styles.list}>

              {/* ✅ 随机事件：固定在最顶部，独立展示，不受条数限制 */}
              {lastEvent && (() => {
                const tone = EVENT_TONE_CONFIG[lastEvent.tone] || EVENT_TONE_CONFIG.neutral
                const cfg = getCfg(lastEvent.type)
                return (
                  <div
                    className={styles.eventBanner}
                    style={{ background: tone.bg, borderLeft: `3px solid ${tone.border}` }}
                  >
                    <div className={styles.eventBannerHeader}>
                      <i className={`ti ${tone.icon}`} style={{ color: tone.color }} />
                      <span className={styles.eventBannerLabel} style={{ color: tone.color }}>
                        随机事件 · {cfg.label}
                      </span>
                    </div>
                    <p className={styles.eventBannerText}>{lastEvent.text}</p>
                  </div>
                )
              })()}

              {allMsgs.length === 0 && !lastEvent ? (
                <div className={styles.empty}>
                  <i className="ti ti-check" />
                  <span>本周一切正常，无特别消息</span>
                </div>
              ) : allMsgs.map((n, i) => {
                const cfg = getCfg(n.type)
                return (
                  <div key={n.id ?? i} className={styles.newsItem} style={{ background: cfg.bg, animationDelay: `${i * 60}ms` }}>
                    <div className={styles.newsIcon} style={{ color: cfg.color }}>
                      <i className={`ti ${cfg.icon}`} />
                    </div>
                    <div className={styles.newsBody}>
                      <span className={styles.newsLabel} style={{ color: cfg.color }}>{cfg.label}</span>
                      <p className={styles.newsText}>{n.text}</p>
                    </div>
                  </div>
                )
              })}

              {nextEvents.length > 0 && (
                <div className={styles.upcoming}>
                  <div className={styles.upcomingTitle}>
                    <i className="ti ti-calendar-event" /> 下周赛事提醒
                  </div>
                  {nextEvents.map(ev => (
                    <div key={ev.id} className={styles.upcomingRow}>
                      <span className={styles.dot} />
                      <span className={styles.upcomingName}>{ev.name}</span>
                      <span className={styles.upcomingTag}>{ev.levelLabel}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'finance' && (
            <div className={styles.financeWrap}>
              <div className={`${styles.finCard} ${net < 0 ? styles.finCardRed : styles.finCardGreen}`}>
                <div className={styles.finRow}>
                  <span className={styles.finLabel}><i className="ti ti-trending-up" /> 本周收入</span>
                  <span className={styles.finIncome}>+¥{(finance.weekIncome || 0).toLocaleString()}</span>
                </div>
                <div className={styles.finRow}>
                  <span className={styles.finLabel}><i className="ti ti-trending-down" /> 本周支出</span>
                  <span className={styles.finExpense}>-¥{(finance.weekExpense || 0).toLocaleString()}</span>
                </div>
                <div className={styles.finLine} />
                <div className={styles.finRow}>
                  <span className={styles.finLabel}><i className={`ti ${net < 0 ? 'ti-alert-circle' : 'ti-circle-check'}`} /> 周净{net < 0 ? '亏损' : '盈余'}</span>
                  <span className={net < 0 ? styles.finNetRed : styles.finNetGreen}>
                    {net >= 0 ? '+' : ''}¥{net.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className={styles.cashRow}>
                <span className={styles.cashLabel}>当前账户余额</span>
                <span className={`${styles.cashVal} ${finance.cash < 20000 ? styles.cashLow : ''}`}>
                  ¥{(finance.cash || 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className={styles.footer}>
          <button className={styles.continueBtn} onClick={onClose}>
            继续游戏 <i className="ti ti-arrow-right" />
          </button>
        </div>

      </div>
    </div>
  )
}
