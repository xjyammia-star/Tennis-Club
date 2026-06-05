// ══════════════════════════════════════════════════════
// WeekSummary.jsx — 周结算弹窗
// 过渡动画结束后弹出，展示本周重要消息
// ══════════════════════════════════════════════════════
import { useState } from 'react'
import styles from './WeekSummary.module.css'

// 消息优先级排序：紧急 > 重要 > 提醒 > 普通
const TYPE_CONFIG = {
  // 财务警告（赤字）
  deficit:  { priority: 0, icon: 'ti-alert-triangle', color: '#e05a2b', label: '财务警告', bg: 'rgba(224,90,43,0.10)' },
  // 伤病
  injury:   { priority: 1, icon: 'ti-first-aid-kit',  color: '#e05a2b', label: '伤病通知', bg: 'rgba(224,90,43,0.08)' },
  // 教练合同
  coach:    { priority: 2, icon: 'ti-user-star',      color: '#c9a84c', label: '教练动态', bg: 'rgba(201,168,76,0.08)' },
  // 技能领悟
  skill:    { priority: 3, icon: 'ti-star',           color: '#c9a84c', label: '技能成就', bg: 'rgba(201,168,76,0.08)' },
  // 赛事
  event:    { priority: 4, icon: 'ti-trophy',         color: '#2a7a3a', label: '赛事动态', bg: 'rgba(42,122,58,0.08)'  },
  // 赞助
  sponsor:  { priority: 5, icon: 'ti-rosette',        color: '#2a5fa8', label: '赞助消息', bg: 'rgba(42,95,168,0.08)'  },
  // 财务正面
  finance:  { priority: 6, icon: 'ti-currency-yen',   color: '#2a7a3a', label: '财务动态', bg: 'rgba(42,122,58,0.08)'  },
  // 球员动态
  player:   { priority: 7, icon: 'ti-user',           color: '#4a5a48', label: '球员动态', bg: 'rgba(74,90,72,0.06)'   },
  // 默认
  default:  { priority: 8, icon: 'ti-bell',           color: '#4a5a48', label: '动态',     bg: 'rgba(74,90,72,0.06)'   },
}

function getConfig(type) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.default
}

// ── 财务小结卡（周净收支）──────────────────────────
function FinanceCard({ finance, prevCash }) {
  const net = finance.weekNet ?? (finance.weekIncome - finance.weekExpense)
  const isDeficit = net < 0
  return (
    <div className={`${styles.financeCard} ${isDeficit ? styles.financeDeficit : styles.financeSurplus}`}>
      <div className={styles.financeRow}>
        <span className={styles.financeLabel}>
          <i className="ti ti-trending-up" aria-hidden="true" /> 本周收入
        </span>
        <span className={styles.financeIncome}>+¥{(finance.weekIncome || 0).toLocaleString()}</span>
      </div>
      <div className={styles.financeRow}>
        <span className={styles.financeLabel}>
          <i className="ti ti-trending-down" aria-hidden="true" /> 本周支出
        </span>
        <span className={styles.financeExpense}>-¥{(finance.weekExpense || 0).toLocaleString()}</span>
      </div>
      <div className={styles.financeDivider} />
      <div className={styles.financeRow}>
        <span className={styles.financeLabel}>
          <i className={`ti ${isDeficit ? 'ti-alert-circle' : 'ti-circle-check'}`} aria-hidden="true" />
          周净{isDeficit ? '亏损' : '盈余'}
        </span>
        <span className={`${styles.financeNet} ${isDeficit ? styles.financeNetNeg : styles.financeNetPos}`}>
          {isDeficit ? '' : '+'}{net.toLocaleString()}
        </span>
      </div>
    </div>
  )
}

// ── 下周预告卡 ──────────────────────────────────────
function UpcomingCard({ events, currentWeek }) {
  const nextWeekEvents = events.filter(ev => ev.week === currentWeek + 1)
  if (!nextWeekEvents.length) return null
  return (
    <div className={styles.upcomingCard}>
      <div className={styles.upcomingTitle}>
        <i className="ti ti-calendar-event" aria-hidden="true" /> 下周赛事提醒
      </div>
      {nextWeekEvents.map(ev => (
        <div key={ev.id} className={styles.upcomingRow}>
          <span className={styles.upcomingDot} />
          <span className={styles.upcomingName}>{ev.name}</span>
          <span className={styles.upcomingLevel}>{ev.levelLabel}</span>
        </div>
      ))}
    </div>
  )
}

// ── 消息列表项 ──────────────────────────────────────
function NewsItem({ news, index }) {
  const cfg = getConfig(news.type)
  return (
    <div
      className={styles.newsItem}
      style={{
        background: cfg.bg,
        animationDelay: `${index * 80}ms`,
      }}
    >
      <div className={styles.newsIconWrap} style={{ color: cfg.color }}>
        <i className={`ti ${cfg.icon}`} aria-hidden="true" />
      </div>
      <div className={styles.newsContent}>
        <span className={styles.newsLabel} style={{ color: cfg.color }}>{cfg.label}</span>
        <p className={styles.newsText}>{news.text}</p>
      </div>
    </div>
  )
}

// ── 主弹窗 ──────────────────────────────────────────
export default function WeekSummary({ visible, onClose, newState, prevFinance }) {
  const [tab, setTab] = useState('news')  // 'news' | 'finance'

  if (!visible || !newState) return null

  const { gameState, finance, recentNews, allEvents } = newState
  const currentWeek = gameState.week

  // 取本周新产生的消息（week === currentWeek）
  const thisWeekNews = (recentNews || []).filter(n => n.week === currentWeek)

  // 检测赤字警告（如果本周净收入为负，插入一条紧急消息）
  const net = finance.weekNet ?? (finance.weekIncome - finance.weekExpense)
  const deficitMsg = net < -5000 ? [{
    id: 'deficit_warn',
    type: 'deficit',
    text: `⚠️ 本周支出超收入 ¥${Math.abs(net).toLocaleString()}，账户余额需关注！`,
    week: currentWeek,
  }] : []

  const allMessages = [...deficitMsg, ...thisWeekNews]
    .sort((a, b) => (getConfig(a.type).priority - getConfig(b.type).priority))
    .slice(0, 8)  // 最多显示8条

  // 下周即将开赛的赛事
  const nextWeekEvents = (allEvents || []).filter(ev => ev.week === currentWeek + 1)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>

        {/* 头部 */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerEyebrow}>周结算完成</div>
            <div className={styles.headerTitle}>
              第 {gameState.year} 年 · 第 {currentWeek} 周
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        {/* 标签页切换 */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'news' ? styles.tabActive : ''}`}
            onClick={() => setTab('news')}
          >
            <i className="ti ti-bell" aria-hidden="true" />
            本周动态
            {allMessages.length > 0 && (
              <span className={styles.tabBadge}>{allMessages.length}</span>
            )}
          </button>
          <button
            className={`${styles.tab} ${tab === 'finance' ? styles.tabActive : ''}`}
            onClick={() => setTab('finance')}
          >
            <i className="ti ti-chart-bar" aria-hidden="true" />
            收支概览
          </button>
        </div>

        {/* 内容区 */}
        <div className={styles.body}>

          {tab === 'news' && (
            <div className={styles.newsList}>
              {allMessages.length > 0
                ? allMessages.map((news, i) => (
                    <NewsItem key={news.id ?? i} news={news} index={i} />
                  ))
                : (
                  <div className={styles.emptyState}>
                    <i className="ti ti-check" aria-hidden="true" />
                    <span>本周一切正常，没有特别消息。</span>
                  </div>
                )
              }

              {/* 下周赛事提醒 */}
              {nextWeekEvents.length > 0 && (
                <UpcomingCard events={allEvents} currentWeek={currentWeek} />
              )}
            </div>
          )}

          {tab === 'finance' && (
            <div className={styles.financeTab}>
              <FinanceCard finance={finance} prevCash={prevFinance?.cash} />

              {/* 账户余额 */}
              <div className={styles.cashRow}>
                <span className={styles.cashLabel}>当前账户余额</span>
                <span className={`${styles.cashVal} ${finance.cash < 20000 ? styles.cashLow : ''}`}>
                  ¥{(finance.cash || 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}

        </div>

        {/* 底部按钮 */}
        <div className={styles.footer}>
          <button className={styles.continueBtn} onClick={onClose}>
            继续游戏 <i className="ti ti-arrow-right" aria-hidden="true" />
          </button>
        </div>

      </div>
    </div>
  )
}
