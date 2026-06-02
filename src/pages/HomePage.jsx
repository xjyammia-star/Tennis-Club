import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  gameState,
  clubStats,
  recentNews,
  upcomingEvents,
  menuItems,
  formatCash,
} from '../data/mockData'
import styles from './HomePage.module.css'

// ── 新闻类型图标映射 ──────────────────────────────────
const newsIcons = {
  skill:   'ti-sparkles',
  finance: 'ti-coin-yuan',
  player:  'ti-user-exclamation',
  event:   'ti-trophy',
  default: 'ti-bell',
}

export default function HomePage() {
  const navigate = useNavigate()
  const [newsIndex, setNewsIndex] = useState(0)
  const news = recentNews[newsIndex] || recentNews[0]

  return (
    <div className={styles.page}>

      {/* ── Header ─────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.eyebrow}>Tennis Club Manager</div>
          <div className={styles.prestigePill}>{gameState.prestigeTitle}</div>
        </div>
        <h1 className={styles.clubName}>{gameState.clubName}</h1>
        <div className={styles.roundRow}>
          <span className={styles.roundText}>
            第 {gameState.year} 年 &middot; 第 {gameState.week} 周 &middot; {gameState.dayOfWeek}
          </span>
          <button
            className={styles.nextWeekBtn}
            onClick={() => alert('下一周功能开发中…')}
          >
            下一周 <i className="ti ti-arrow-right" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* ── KPI 横排 ────────────────────────────────── */}
      <div className={styles.kpiBand}>
        <div className={styles.kpiItem}>
          <span className={styles.kpiVal}>{formatCash(gameState.cash)}</span>
          <span className={styles.kpiLabel}>资金</span>
          <span className={styles.kpiSub}>
            {gameState.loanMonthly > 0 ? `贷款 ¥${gameState.loanMonthly}/月` : '无贷款'}
          </span>
        </div>
        <div className={styles.kpiDivider} />
        <div className={styles.kpiItem}>
          <span className={styles.kpiVal}>{gameState.prestige.toLocaleString()}</span>
          <span className={styles.kpiLabel}>声望</span>
          <span className={styles.kpiSub}>
            {gameState.prestigeChange >= 0
              ? `+${gameState.prestigeChange} 本周`
              : `${gameState.prestigeChange} 本周`}
          </span>
        </div>
        <div className={styles.kpiDivider} />
        <div className={styles.kpiItem}>
          <span className={styles.kpiVal}>{clubStats.playerCount}</span>
          <span className={styles.kpiLabel}>球员</span>
          <span className={styles.kpiSub}>{clubStats.playerCapacity - clubStats.playerCount} 个空位</span>
        </div>
        <div className={styles.kpiDivider} />
        <div className={styles.kpiItem}>
          <span className={styles.kpiVal}>{clubStats.courtCount} 片</span>
          <span className={styles.kpiLabel}>球场</span>
          <span className={styles.kpiSub}>{clubStats.courtTypes}</span>
        </div>
      </div>

      <div className={styles.body}>

        {/* ── 本周动态 ─────────────────────────────── */}
        <div className={styles.sectionLabel}>
          <span>本周动态</span>
          <div className={styles.sectionLine} />
        </div>

        <div className={styles.newsCard}>
          <div className={styles.newsIconWrap}>
            <i className={`ti ${newsIcons[news.type] || newsIcons.default}`} aria-hidden="true" />
          </div>
          <div className={styles.newsContent}>
            <div className={styles.newsTag}>最新消息</div>
            <p className={styles.newsText}>{news.text}</p>
          </div>
        </div>

        {/* 多条新闻切换点 */}
        {recentNews.length > 1 && (
          <div className={styles.newsDots}>
            {recentNews.map((_, i) => (
              <button
                key={i}
                className={`${styles.dot} ${i === newsIndex ? styles.dotActive : ''}`}
                onClick={() => setNewsIndex(i)}
                aria-label={`动态 ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* ── 近期赛事 ─────────────────────────────── */}
        <div className={styles.sectionLabel}>
          <span>近期赛事</span>
          <div className={styles.sectionLine} />
        </div>

        <div className={styles.eventsCard}>
          {upcomingEvents.slice(0, 4).map((ev, idx) => (
            <div
              key={ev.id}
              className={`${styles.eventRow} ${idx < upcomingEvents.slice(0,4).length - 1 ? styles.eventBorder : ''}`}
            >
              <span className={`badge ${ev.badgeClass}`}>{ev.level}</span>
              <span className={styles.eventName}>{ev.name}</span>
              <span className={styles.eventWeek}>第 {ev.week} 周</span>
            </div>
          ))}
        </div>

        {/* ── 功能菜单 ─────────────────────────────── */}
        <div className={styles.sectionLabel}>
          <span>功能菜单</span>
          <div className={styles.sectionLine} />
        </div>

        <div className={styles.menuGrid}>
          {menuItems.map(item => (
            <button
              key={item.id}
              className={styles.menuBtn}
              onClick={() => navigate(item.path)}
            >
              <div className={styles.menuIcon}>
                <i className={`ti ${item.icon}`} aria-hidden="true" />
              </div>
              <span className={styles.menuLabel}>{item.label}</span>
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
