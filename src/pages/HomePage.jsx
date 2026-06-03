import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGame, useGameState, useClubStats } from '../context/GameContext'
import { menuItems, formatCash } from '../data/mockData'
import styles from './HomePage.module.css'

const newsIcons = {
  skill:   'ti-star',
  finance: 'ti-currency-yen',
  player:  'ti-user',
  event:   'ti-trophy',
  default: 'ti-bell',
}

export default function HomePage() {
  const { state, advanceWeek } = useGame()
  const gameState    = useGameState()
  const clubStats    = useClubStats()
  const recentNews   = state.recentNews
  const upcomingEvts = state.upcomingEvents

  const [newsIndex, setNewsIndex] = useState(0)
  const news = recentNews[newsIndex] || recentNews[0]

  return (
    <div className={styles.page}>

      {/* ── 移动端 Header ── */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.eyebrow}>Tennis Club Manager</div>
          <div className={styles.prestigePill}>{gameState.prestigeTitle}</div>
        </div>
        <h1 className={styles.clubName}>{gameState.clubName}</h1>
        <div className={styles.roundRow}>
          <span className={styles.roundText}>
            第 {gameState.year} 年 · 第 {gameState.week} 周 · {gameState.dayOfWeek}
          </span>
          <button className={styles.nextWeekBtn} onClick={advanceWeek}>
            下一周 <i className="ti ti-arrow-right" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* ── 移动端 KPI ── */}
      <div className={styles.kpiBand}>
        <div className={styles.kpiItem}>
          <span className={styles.kpiVal}>{formatCash(gameState.cash)}</span>
          <span className={styles.kpiLabel}>资金</span>
          <span className={styles.kpiSub}>{gameState.loanMonthly > 0 ? `贷款¥${gameState.loanMonthly}/月` : '无贷款'}</span>
        </div>
        <div className={styles.kpiDivider} />
        <div className={styles.kpiItem}>
          <span className={styles.kpiVal}>{gameState.prestige.toLocaleString()}</span>
          <span className={styles.kpiLabel}>声望</span>
          <span className={styles.kpiSub}>{gameState.prestigeChange >= 0 ? `+${gameState.prestigeChange} 本周` : `${gameState.prestigeChange} 本周`}</span>
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

        {/* ── 桌面端声望 ── */}
        <div className={styles.desktopPrestigeBadge}>
          <i className="ti ti-star" aria-hidden="true" />
          声望 {gameState.prestige.toLocaleString()} · {gameState.prestigeTitle}
        </div>

        {/* ── 桌面端 KPI 卡片 ── */}
        <div className={styles.desktopKpiGrid}>
          <div className={styles.desktopKpiCard}>
            <div className={styles.dkLabel}><i className="ti ti-currency-yen" />资金</div>
            <div className={styles.dkVal}>{formatCash(gameState.cash)}</div>
            <div className={styles.dkSub}>{gameState.loanMonthly > 0 ? `贷款 ¥${gameState.loanMonthly}/月` : '无贷款'}</div>
          </div>
          <div className={styles.desktopKpiCard}>
            <div className={styles.dkLabel}><i className="ti ti-users" />球员</div>
            <div className={styles.dkVal}>{clubStats.playerCount}</div>
            <div className={styles.dkSub}>{clubStats.playerCapacity - clubStats.playerCount} 个空位</div>
          </div>
          <div className={styles.desktopKpiCard}>
            <div className={styles.dkLabel}><i className="ti ti-user" />教练</div>
            <div className={styles.dkVal}>{clubStats.coachCount}</div>
            <div className={styles.dkSub}>管理 {clubStats.coachCount} 名</div>
          </div>
          <div className={styles.desktopKpiCard}>
            <div className={styles.dkLabel}><i className="ti ti-building" />球场</div>
            <div className={styles.dkVal}>{clubStats.courtCount} 片</div>
            <div className={styles.dkSub}>{clubStats.courtTypes}</div>
          </div>
        </div>

        <div className={styles.desktopGrid}>

          {/* 左列 */}
          <div>
            <div className={styles.sectionLabel}>
              <span>本周动态</span>
              <div className={styles.sectionLine} />
            </div>
            <div className={styles.newsCard}>
              <div className={styles.newsIconWrap}>
                <i className={`ti ${newsIcons[news?.type] || newsIcons.default}`} />
              </div>
              <div className={styles.newsContent}>
                <div className={styles.newsTag}>最新消息</div>
                <p className={styles.newsText}>{news?.text}</p>
              </div>
            </div>
            {recentNews.length > 1 && (
              <div className={styles.newsDots}>
                {recentNews.map((_, i) => (
                  <button
                    key={i}
                    className={`${styles.dot} ${i === newsIndex ? styles.dotActive : ''}`}
                    onClick={() => setNewsIndex(i)}
                  />
                ))}
              </div>
            )}

            <div className={styles.sectionLabel}>
              <span>功能菜单</span>
              <div className={styles.sectionLine} />
            </div>
            <div className={styles.menuGrid}>
              {menuItems.map(item => (
                <Link key={item.id} to={item.path} className={styles.menuBtn}>
                  <div className={styles.menuIcon}>
                    <i className={`ti ${item.icon}`} />
                  </div>
                  <span className={styles.menuLabel}>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* 右列 */}
          <div>
            <div className={styles.sectionLabel}>
              <span>近期赛事</span>
              <div className={styles.sectionLine} />
            </div>
            <div className={styles.eventsCard}>
              {upcomingEvts.map((ev, idx) => (
                <div
                  key={ev.id}
                  className={`${styles.eventRow} ${idx < upcomingEvts.length - 1 ? styles.eventBorder : ''}`}
                >
                  <span className={`badge ${ev.badgeClass}`}>{ev.level}</span>
                  <span className={styles.eventName}>{ev.name}</span>
                  <span className={styles.eventWeek}>第 {ev.week} 周</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
