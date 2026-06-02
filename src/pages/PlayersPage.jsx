import { useState, useMemo } from 'react'
import { players } from '../data/mockData'
import styles from './PlayersPage.module.css'

// ── 常量 ─────────────────────────────────────────────
const HEALTH_LABEL = { healthy: '健康', minor: '轻伤', major: '重伤' }
const HEALTH_CLASS = { healthy: styles.tagHealthy, minor: styles.tagMinor, major: styles.tagMajor }
const GENDER_LABEL = { male: '男', female: '女' }

const TALENT_CLASS = {
  '万里挑一': styles.talentS,
  '天赋异禀': styles.talentA,
  '资质优良': styles.talentB,
  '平平无奇': styles.talentC,
  '天生愚钝': styles.talentD,
}

const AGE_GROUP = (age) => {
  if (age < 14) return 'youth'      // 青少年 <14
  if (age < 18) return 'junior'     // 青少年 14-18
  return 'pro'                      // 职业 18+
}

const AGE_GROUP_LABEL = { youth: '少年（<14）', junior: '青少年（14-18）', pro: '职业（18+）' }

// ── 属性进度条 ───────────────────────────────────────
function StatBar({ value, max = 100, color = 'forest' }) {
  return (
    <div className={styles.statBarWrap}>
      <div
        className={`${styles.statBar} ${styles[`statBar_${color}`]}`}
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
  )
}

// ── 属性行 ──────────────────────────────────────────
function StatRow({ label, value }) {
  const color = value >= 80 ? 'gold' : value >= 60 ? 'forest' : 'muted'
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <StatBar value={value} color={color} />
      <span className={styles.statValue}>{value}</span>
    </div>
  )
}

// ── 球员详情抽屉 ─────────────────────────────────────
function PlayerDetail({ player, onClose }) {
  const ageGroup = player.age < 18 ? 'ITF青少年' : 'ATP/WTA'

  return (
    <div className={styles.detailOverlay} onClick={onClose}>
      <div className={styles.detailPanel} onClick={e => e.stopPropagation()}>

        {/* 头部 */}
        <div className={styles.detailHeader}>
          <div className={styles.detailAvatar}>
            {player.name.charAt(0)}
          </div>
          <div className={styles.detailHeaderInfo}>
            <div className={styles.detailName}>{player.name}</div>
            <div className={styles.detailMeta}>
              {GENDER_LABEL[player.gender]} · {player.age} 岁 · {player.height} cm · {player.weight} kg · {player.familyBg}家庭
            </div>
            <div className={styles.detailTags}>
              <span className={`${styles.talentTag} ${TALENT_CLASS[player.talentLabel]}`}>
                {player.talentLabel}
              </span>
              <span className={`${styles.healthTag} ${HEALTH_CLASS[player.health]}`}>
                {HEALTH_LABEL[player.health]}
              </span>
              {player.isSponsored && (
                <span className={styles.sponsorTag}>
                  <i className="ti ti-star" aria-hidden="true" /> 赞助球员
                </span>
              )}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <div className={styles.detailBody}>

          {/* 状态栏 */}
          <div className={styles.detailStatusRow}>
            <div className={styles.detailStatusItem}>
              <span className={styles.detailStatusLabel}>疲劳度</span>
              <div className={styles.fatigueMeter}>
                <div
                  className={`${styles.fatigueFill} ${
                    player.fatigue >= 70 ? styles.fatigueDanger :
                    player.fatigue >= 50 ? styles.fatigueWarn : styles.fatigueSafe
                  }`}
                  style={{ width: `${player.fatigue}%` }}
                />
              </div>
              <span className={styles.detailStatusVal}>{player.fatigue}</span>
            </div>
            <div className={styles.detailStatusItem}>
              <span className={styles.detailStatusLabel}>忠诚度</span>
              <div className={styles.fatigueMeter}>
                <div
                  className={styles.loyaltyFill}
                  style={{ width: `${player.loyalty}%` }}
                />
              </div>
              <span className={styles.detailStatusVal}>{player.loyalty}</span>
            </div>
          </div>

          {/* 积分排名 */}
          <div className={styles.rankRow}>
            <div className={styles.rankItem}>
              <span className={styles.rankVal}>
                {player.ranking ? `#${player.ranking}` : '—'}
              </span>
              <span className={styles.rankLabel}>{ageGroup} 排名</span>
            </div>
            <div className={styles.rankItem}>
              <span className={styles.rankVal}>{player.points || '—'}</span>
              <span className={styles.rankLabel}>积分</span>
            </div>
            <div className={styles.rankItem}>
              <span className={styles.rankVal}>{player.talent}</span>
              <span className={styles.rankLabel}>天赋值</span>
            </div>
          </div>

          {/* 技术属性 */}
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>
              <i className="ti ti-award" aria-hidden="true" /> 技术属性
            </div>
            <StatRow label="发球" value={player.serve} />
            <StatRow label="正手" value={player.forehand} />
            <StatRow label="反手" value={player.backhand} />
            <StatRow label="接发球" value={player.returnServe} />
            <StatRow label="截击" value={player.volley} />
            <StatRow label="脚步" value={player.footwork} />
          </div>

          {/* 身体属性 */}
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>
              <i className="ti ti-run" aria-hidden="true" /> 身体属性
            </div>
            <StatRow label="力量" value={player.strength} />
            <StatRow label="体力" value={player.stamina} />
            <StatRow label="灵活性" value={player.agility} />
          </div>

          {/* 精神属性 */}
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>
              <i className="ti ti-brain" aria-hidden="true" /> 精神属性
            </div>
            <StatRow label="抗压" value={player.pressure} />
            <StatRow label="意志力" value={player.willpower} />
            <StatRow label="专注力" value={player.focus} />
          </div>

          {/* 特殊技能 */}
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>
              <i className="ti ti-bolt" aria-hidden="true" /> 特殊技能
            </div>
            {player.skills.length > 0 ? (
              <div className={styles.skillList}>
                {player.skills.map(s => (
                  <span key={s} className={styles.skillBadge}>{s}</span>
                ))}
              </div>
            ) : (
              <p className={styles.emptyNote}>暂无特殊技能</p>
            )}
          </div>

          {/* 偏好 */}
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>
              <i className="ti ti-heart" aria-hidden="true" /> 球员偏好
            </div>
            {player.preferences.length > 0 ? (
              <div className={styles.skillList}>
                {player.preferences.map(p => (
                  <span key={p} className={styles.prefBadge}>{p}</span>
                ))}
              </div>
            ) : (
              <p className={styles.emptyNote}>无特殊偏好</p>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

// ── 球员卡片 ─────────────────────────────────────────
function PlayerCard({ player, onClick }) {
  // 技术均值（用于卡片简要显示）
  const techAvg = Math.round(
    (player.serve + player.forehand + player.backhand +
     player.returnServe + player.volley + player.footwork) / 6
  )
  const physAvg = Math.round(
    (player.strength + player.stamina + player.agility) / 3
  )

  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.cardTop}>
        <div className={styles.avatar}>
          {player.name.charAt(0)}
        </div>
        <div className={styles.cardInfo}>
          <div className={styles.cardNameRow}>
            <span className={styles.cardName}>{player.name}</span>
            <span className={`${styles.talentTag} ${TALENT_CLASS[player.talentLabel]}`}>
              {player.talentLabel}
            </span>
          </div>
          <div className={styles.cardMeta}>
            {GENDER_LABEL[player.gender]} · {player.age} 岁 · {player.height} cm
            {player.ranking && <span className={styles.ranking}> · #{player.ranking}</span>}
          </div>
          <div className={styles.cardTags}>
            <span className={`${styles.healthTag} ${HEALTH_CLASS[player.health]}`}>
              {HEALTH_LABEL[player.health]}
            </span>
            {player.isSponsored && (
              <span className={styles.sponsorTag}>
                <i className="ti ti-star" aria-hidden="true" /> 赞助
              </span>
            )}
            {player.fatigue >= 70 && (
              <span className={styles.fatigueTag}>疲劳</span>
            )}
          </div>
        </div>
        <i className={`ti ti-chevron-right ${styles.cardChevron}`} aria-hidden="true" />
      </div>

      {/* 属性条 */}
      <div className={styles.cardStats}>
        <div className={styles.cardStatItem}>
          <span className={styles.cardStatLabel}>技术</span>
          <StatBar value={techAvg} />
          <span className={styles.cardStatVal}>{techAvg}</span>
        </div>
        <div className={styles.cardStatItem}>
          <span className={styles.cardStatLabel}>身体</span>
          <StatBar value={physAvg} color={physAvg >= 70 ? 'gold' : 'forest'} />
          <span className={styles.cardStatVal}>{physAvg}</span>
        </div>
        <div className={styles.cardStatItem}>
          <span className={styles.cardStatLabel}>疲劳</span>
          <StatBar
            value={player.fatigue}
            color={player.fatigue >= 70 ? 'danger' : player.fatigue >= 50 ? 'warn' : 'forest'}
          />
          <span className={styles.cardStatVal}>{player.fatigue}</span>
        </div>
      </div>
    </div>
  )
}

// ── 主页面 ───────────────────────────────────────────
export default function PlayersPage() {
  const [search, setSearch]         = useState('')
  const [filterGender, setFilterGender]   = useState('all')
  const [filterAgeGroup, setFilterAgeGroup] = useState('all')
  const [filterHealth, setFilterHealth]   = useState('all')
  const [selectedPlayer, setSelectedPlayer] = useState(null)

  const filtered = useMemo(() => {
    return players.filter(p => {
      if (search && !p.name.includes(search)) return false
      if (filterGender !== 'all' && p.gender !== filterGender) return false
      if (filterHealth !== 'all' && p.health !== filterHealth) return false
      if (filterAgeGroup !== 'all' && AGE_GROUP(p.age) !== filterAgeGroup) return false
      return true
    })
  }, [search, filterGender, filterAgeGroup, filterHealth])

  const stats = useMemo(() => ({
    total: players.length,
    healthy: players.filter(p => p.health === 'healthy').length,
    injured: players.filter(p => p.health !== 'healthy').length,
    sponsored: players.filter(p => p.isSponsored).length,
  }), [])

  return (
    <div className={styles.page}>

      {/* ── 移动端 Header ── */}
      <header className={styles.mobileHeader}>
        <h1 className={styles.mobileTitle}>球员管理</h1>
        <span className={styles.mobileCount}>{players.length} 人</span>
      </header>

      <div className={styles.inner}>

        {/* ── 统计概览 ── */}
        <div className={styles.summaryRow}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryVal}>{stats.total}</span>
            <span className={styles.summaryLabel}>在队球员</span>
          </div>
          <div className={styles.summaryDivider} />
          <div className={styles.summaryItem}>
            <span className={styles.summaryVal}>{stats.healthy}</span>
            <span className={styles.summaryLabel}>健康</span>
          </div>
          <div className={styles.summaryDivider} />
          <div className={styles.summaryItem}>
            <span className={`${styles.summaryVal} ${stats.injured > 0 ? styles.summaryDanger : ''}`}>
              {stats.injured}
            </span>
            <span className={styles.summaryLabel}>伤病</span>
          </div>
          <div className={styles.summaryDivider} />
          <div className={styles.summaryItem}>
            <span className={styles.summaryVal}>{stats.sponsored}</span>
            <span className={styles.summaryLabel}>赞助球员</span>
          </div>
        </div>

        {/* ── 搜索框 ── */}
        <div className={styles.searchWrap}>
          <i className={`ti ti-search ${styles.searchIcon}`} aria-hidden="true" />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="搜索球员姓名…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.searchClear} onClick={() => setSearch('')} aria-label="清除">
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* ── 筛选条 ── */}
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            {[
              { v: 'all', l: '全部' },
              { v: 'male', l: '男' },
              { v: 'female', l: '女' },
            ].map(({ v, l }) => (
              <button
                key={v}
                className={`${styles.filterBtn} ${filterGender === v ? styles.filterBtnActive : ''}`}
                onClick={() => setFilterGender(v)}
              >{l}</button>
            ))}
          </div>
          <div className={styles.filterGroup}>
            {[
              { v: 'all',    l: '全年龄' },
              { v: 'youth',  l: '少年' },
              { v: 'junior', l: '青少年' },
              { v: 'pro',    l: '职业' },
            ].map(({ v, l }) => (
              <button
                key={v}
                className={`${styles.filterBtn} ${filterAgeGroup === v ? styles.filterBtnActive : ''}`}
                onClick={() => setFilterAgeGroup(v)}
              >{l}</button>
            ))}
          </div>
          <div className={styles.filterGroup}>
            {[
              { v: 'all',     l: '全状态' },
              { v: 'healthy', l: '健康' },
              { v: 'minor',   l: '轻伤' },
              { v: 'major',   l: '重伤' },
            ].map(({ v, l }) => (
              <button
                key={v}
                className={`${styles.filterBtn} ${filterHealth === v ? styles.filterBtnActive : ''}`}
                onClick={() => setFilterHealth(v)}
              >{l}</button>
            ))}
          </div>
        </div>

        {/* ── 结果计数 ── */}
        <div className={styles.resultCount}>
          显示 {filtered.length} / {players.length} 名球员
        </div>

        {/* ── 球员列表 ── */}
        {filtered.length > 0 ? (
          <div className={styles.list}>
            {filtered.map(p => (
              <PlayerCard
                key={p.id}
                player={p}
                onClick={() => setSelectedPlayer(p)}
              />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <i className="ti ti-user-search" aria-hidden="true" />
            <p>没有符合条件的球员</p>
          </div>
        )}

      </div>

      {/* ── 详情抽屉 ── */}
      {selectedPlayer && (
        <PlayerDetail
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

    </div>
  )
}
