import { useState, useMemo } from 'react'
import { coaches } from '../data/mockData'
import styles from './CoachesPage.module.css'

// ── 常量 ──────────────────────────────────────────────
const LEVEL_ORDER = { elite: 0, senior: 1, normal: 2, assistant: 3 }

const LEVEL_CLASS = {
  elite:     styles.levelElite,
  senior:    styles.levelSenior,
  normal:    styles.levelNormal,
  assistant: styles.levelAssistant,
}

const STYLE_CLASS = {
  strict:  styles.styleStrict,
  relaxed: styles.styleRelaxed,
  free:    styles.styleFree,
}

const CONTRACT_WARN = 16  // 剩余周数 ≤ 此值时显示警告

// ── 忠诚度颜色 ────────────────────────────────────────
function loyaltyBarColor(v) {
  if (v >= 80) return styles.loyalHigh
  if (v >= 50) return styles.loyalMid
  return styles.loyalLow
}

function loyaltyTextColor(v) {
  if (v >= 80) return styles.loyalHighText
  if (v >= 50) return styles.loyalMidText
  return styles.loyalLowText
}

// ── 合同状态标签 ──────────────────────────────────────
function ContractBadge({ weeks }) {
  if (weeks <= CONTRACT_WARN) {
    return (
      <span className={styles.contractWarn}>
        <i className="ti ti-alert-triangle" aria-hidden="true" />
        仅剩 {weeks} 周
      </span>
    )
  }
  return <span className={styles.contractOk}>{weeks} 周</span>
}

// ── 教练详情抽屉 ──────────────────────────────────────
function CoachDetail({ coach, onClose }) {
  const loyaltyStatus =
    coach.loyalty >= 80 ? { label: '高忠诚', cls: styles.loyalHighText } :
    coach.loyalty >= 50 ? { label: '正常',   cls: styles.loyalMidText  } :
                          { label: '低忠诚', cls: styles.loyalLowText  }

  const efficiencyNote =
    coach.loyalty >= 80 ? '训练效率 +10%' :
    coach.loyalty >= 50 ? '训练效率正常' :
    coach.loyalty >= 30 ? '训练效率 -10%，可能要求加薪' :
                          '训练效率 -20%，极可能要求加薪'

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>

        {/* 头部 */}
        <div className={styles.panelHeader}>
          <div className={`${styles.avatar} ${LEVEL_CLASS[coach.level]}`}>
            {coach.name.charAt(0)}
          </div>
          <div className={styles.headerInfo}>
            <div className={styles.panelName}>{coach.name}</div>
            <div className={styles.panelMeta}>
              {coach.gender === 'male' ? '男' : '女'} · {coach.age} 岁
            </div>
            <div className={styles.panelTags}>
              <span className={`${styles.levelTag} ${LEVEL_CLASS[coach.level]}`}>
                {coach.levelLabel}
              </span>
              <span className={`${styles.styleTag} ${STYLE_CLASS[coach.style]}`}>
                {coach.styleLabel}
              </span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <div className={styles.panelBody}>

          {/* 履历 */}
          <div className={styles.highlight}>
            <i className="ti ti-award" aria-hidden="true" />
            <span>{coach.careerHighlight}</span>
          </div>

          {/* 关键数据行 */}
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <span className={styles.statVal}>¥{coach.weeklySalary.toLocaleString()}</span>
              <span className={styles.statLbl}>周工资</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statVal}>{coach.expBonus}</span>
              <span className={styles.statLbl}>训练经验加成</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statVal}>{coach.studentCount}</span>
              <span className={styles.statLbl}>当前私教学员</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statVal}>{coach.totalStudents}</span>
              <span className={styles.statLbl}>历史执教人数</span>
            </div>
          </div>

          {/* 忠诚度 */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <i className="ti ti-heart" aria-hidden="true" /> 忠诚度
            </div>
            <div className={styles.loyaltyRow}>
              <div className={styles.loyaltyBarWrap}>
                <div
                  className={`${styles.loyaltyBarFill} ${loyaltyBarColor(coach.loyalty)}`}
                  style={{ width: `${coach.loyalty}%` }}
                />
              </div>
              <span className={`${styles.loyaltyVal} ${loyaltyTextColor(coach.loyalty)}`}>
                {coach.loyalty}
              </span>
              <span className={`${styles.loyaltyLabel} ${loyaltyStatus.cls}`}>
                {loyaltyStatus.label}
              </span>
            </div>
            <p className={styles.effNote}>{efficiencyNote}</p>
          </div>

          {/* 合同 */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <i className="ti ti-file-text" aria-hidden="true" /> 合同状态
            </div>
            <div className={styles.contractRow}>
              <span className={styles.contractLabel}>剩余合同周期</span>
              <ContractBadge weeks={coach.contractWeeksLeft} />
            </div>
            <p className={styles.contractNote}>
              违约金约 ¥{(coach.contractWeeksLeft * coach.weeklySalary * 2 / 10000).toFixed(1)} 万
              （剩余{coach.contractWeeksLeft}周 × 周薪 × 2）
            </p>
          </div>

          {/* 技术特长 */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <i className="ti ti-bolt" aria-hidden="true" /> 技术特长
            </div>
            {coach.specialSkills.length > 0 ? (
              <div className={styles.skillList}>
                {coach.specialSkills.map(s => (
                  <span key={s} className={styles.skillBadge}>{s}</span>
                ))}
              </div>
            ) : (
              <p className={styles.emptyNote}>暂无技术特长（助教级别）</p>
            )}
          </div>

          {/* 简介 */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <i className="ti ti-info-circle" aria-hidden="true" /> 教练简介
            </div>
            <p className={styles.bio}>{coach.bio}</p>
          </div>

          {/* 操作按钮 */}
          <div className={styles.actionRow}>
            <button
              className={styles.btnSecondary}
              onClick={() => alert('加薪功能开发中…')}
            >
              <i className="ti ti-trending-up" aria-hidden="true" /> 加薪 10%
            </button>
            <button
              className={styles.btnDanger}
              onClick={() => alert('解雇功能开发中…')}
            >
              <i className="ti ti-user-minus" aria-hidden="true" /> 解雇
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── 教练卡片 ──────────────────────────────────────────
function CoachCard({ coach, onClick }) {
  const isContractWarn = coach.contractWeeksLeft <= CONTRACT_WARN

  return (
    <div
      className={`${styles.card} ${isContractWarn ? styles.cardWarn : ''}`}
      onClick={onClick}
    >
      <div className={styles.cardTop}>
        <div className={`${styles.avatar} ${LEVEL_CLASS[coach.level]}`}>
          {coach.name.charAt(0)}
        </div>

        <div className={styles.cardInfo}>
          <div className={styles.cardNameRow}>
            <span className={styles.cardName}>{coach.name}</span>
            <span className={`${styles.levelTag} ${LEVEL_CLASS[coach.level]}`}>
              {coach.levelLabel}
            </span>
          </div>
          <div className={styles.cardMeta}>
            {coach.gender === 'male' ? '男' : '女'} · {coach.age} 岁 · ¥{coach.weeklySalary.toLocaleString()}/周
          </div>
          <div className={styles.cardTagRow}>
            <span className={`${styles.styleTag} ${STYLE_CLASS[coach.style]}`}>
              {coach.styleLabel}
            </span>
            <span className={styles.bonusTag}>{coach.expBonus}</span>
            {isContractWarn && (
              <span className={styles.contractWarn}>
                <i className="ti ti-alert-triangle" aria-hidden="true" /> 合同快到期
              </span>
            )}
          </div>
        </div>

        <i className={`ti ti-chevron-right ${styles.chevron}`} aria-hidden="true" />
      </div>

      {/* 忠诚度 + 特长 */}
      <div className={styles.cardBottom}>
        <div className={styles.loyaltyMiniRow}>
          <span className={styles.miniLabel}>忠诚</span>
          <div className={styles.loyaltyBarWrap}>
            <div
              className={`${styles.loyaltyBarFill} ${loyaltyBarColor(coach.loyalty)}`}
              style={{ width: `${coach.loyalty}%` }}
            />
          </div>
          <span className={`${styles.miniVal} ${loyaltyTextColor(coach.loyalty)}`}>
            {coach.loyalty}
          </span>
        </div>

        {coach.specialSkills.length > 0 && (
          <div className={styles.miniSkills}>
            {coach.specialSkills.slice(0, 3).map(s => (
              <span key={s} className={styles.miniSkillBadge}>{s}</span>
            ))}
            {coach.specialSkills.length > 3 && (
              <span className={styles.miniSkillMore}>+{coach.specialSkills.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────
export default function CoachesPage() {
  const [filterLevel, setFilterLevel] = useState('all')
  const [selectedCoach, setSelectedCoach] = useState(null)

  const sorted = useMemo(() => {
    return [...coaches]
      .filter(c => filterLevel === 'all' || c.level === filterLevel)
      .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level])
  }, [filterLevel])

  const totalWeeklyCost = coaches.reduce((sum, c) => sum + c.weeklySalary, 0)
  const warnCount = coaches.filter(c => c.contractWeeksLeft <= CONTRACT_WARN).length

  return (
    <div className={styles.page}>

      {/* 移动端 Header */}
      <header className={styles.mobileHeader}>
        <h1 className={styles.mobileTitle}>教练团队</h1>
        <span className={styles.mobileCount}>{coaches.length} 人</span>
      </header>

      <div className={styles.inner}>

        {/* 概览栏 */}
        <div className={styles.summaryRow}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryVal}>{coaches.length}</span>
            <span className={styles.summaryLabel}>在队教练</span>
          </div>
          <div className={styles.summaryDivider} />
          <div className={styles.summaryItem}>
            <span className={styles.summaryVal}>
              ¥{(totalWeeklyCost / 10000).toFixed(1)}万
            </span>
            <span className={styles.summaryLabel}>周工资总计</span>
          </div>
          <div className={styles.summaryDivider} />
          <div className={styles.summaryItem}>
            <span className={`${styles.summaryVal} ${warnCount > 0 ? styles.summaryDanger : ''}`}>
              {warnCount}
            </span>
            <span className={styles.summaryLabel}>合同快到期</span>
          </div>
          <div className={styles.summaryDivider} />
          <div className={styles.summaryItem}>
            <span className={styles.summaryVal}>
              {coaches.reduce((s, c) => s + c.studentCount, 0)}
            </span>
            <span className={styles.summaryLabel}>私教学员</span>
          </div>
        </div>

        {/* 筛选 */}
        <div className={styles.filterRow}>
          {[
            { v: 'all',       l: '全部' },
            { v: 'elite',     l: '顶级' },
            { v: 'senior',    l: '高级' },
            { v: 'normal',    l: '普通' },
            { v: 'assistant', l: '助教' },
          ].map(({ v, l }) => (
            <button
              key={v}
              className={`${styles.filterBtn} ${filterLevel === v ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterLevel(v)}
            >{l}</button>
          ))}
        </div>

        {/* 结果计数 */}
        <div className={styles.resultCount}>
          显示 {sorted.length} / {coaches.length} 名教练
        </div>

        {/* 教练列表 */}
        {sorted.length > 0 ? (
          <div className={styles.list}>
            {sorted.map(c => (
              <CoachCard
                key={c.id}
                coach={c}
                onClick={() => setSelectedCoach(c)}
              />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <i className="ti ti-user-search" aria-hidden="true" />
            <p>没有符合条件的教练</p>
          </div>
        )}

      </div>

      {/* 详情抽屉 */}
      {selectedCoach && (
        <CoachDetail
          coach={selectedCoach}
          onClose={() => setSelectedCoach(null)}
        />
      )}

    </div>
  )
}
